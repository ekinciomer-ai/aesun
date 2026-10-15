"""aesun-isler: epias-ptf'teki periyodik işleri (eskiden GitHub Actions) ns1'de çalıştırır.

Sırlar /opt/aesun/isler.env'den ortam değişkeni olarak gelir (root-only dosya, kapsayıcıya env_file ile).
Depoya yazma: salt bu sunucuya ait dağıtım anahtarı (~/.ssh). Her işin çıktısı is_calistir.sh ile n8n/is_hatalari.json'a düşer.
ETKIN=0 iken hiçbir iş çalışmaz (geçiş sırasında Actions ile çift çalışmayı önler).
"""
import json, os, subprocess, time, datetime
REPO = os.environ.get("AESUN_ISLER_REPO", "git@github.com:ekinciomer-ai/epias-ptf.git")
D = "/veri/epias-ptf"
DURUM = "/veri/durum.json"
SIFRELI = "n8n/ns1_isler.sifreli.json"   # epias-ptf iş akışı sırları ns1 açık anahtarıyla şifreleyip buraya yazar

def sirlar():
    """Şifreli sır paketini ns1 özel anahtarıyla çözer; değerler yalnız bellekte tutulur."""
    import base64
    from cryptography.hazmat.primitives import hashes, serialization
    from cryptography.hazmat.primitives.asymmetric import padding
    from cryptography.hazmat.primitives.ciphers.aead import AESGCM
    p = os.path.join(D, SIFRELI)
    if not os.path.exists(p) or not os.path.exists("/sir/ozel.pem"):
        return {}
    j = json.load(open(p)); b = base64.b64decode
    oz = serialization.load_pem_private_key(open("/sir/ozel.pem", "rb").read(), None)
    k = oz.decrypt(b(j["ak"]), padding.OAEP(mgf=padding.MGF1(hashes.SHA256()), algorithm=hashes.SHA256(), label=None))
    return json.loads(AESGCM(k).decrypt(b(j["iv"]), b(j["ct"]), None))

ISLER = [  # ad, dakikalar, komut, ek olarak yazılacak yollar
    ("Bildirimler", {7, 22, 37, 52}, ["python", "bildirim_isler.py"], ["n8n/bildirim_*.json", "n8n/maden_maliyet.json"], "Bildirim durumu"),
    ("Veri arşivi", {5}, ["python", "arsiv_kaydet.py"], [], None),
    ("Durum analizi", {41}, ["python", "durum_analizi.py"], ["n8n/analiz/"], "Durum analizi"),
]

def sh(*a, **k):
    return subprocess.run(list(a), cwd=k.get("cwd", D), capture_output=True, text=True, timeout=k.get("t", 600))

def hazirla():
    if not os.path.isdir(D + "/.git"):
        r = sh("git", "clone", "--depth", "50", REPO, D, cwd="/veri")
        if r.returncode: raise RuntimeError(r.stderr[-300:])
    sh("git", "config", "user.name", "aesun-bot"); sh("git", "config", "user.email", "aesun-bot@users.noreply.github.com")

def calistir(ad, komut, yollar, mesaj):
    r = sh("git", "pull", "--rebase", "--autostash", "-q")
    t0 = time.time()
    r = subprocess.run(["bash", "is_calistir.sh", ad, *komut], cwd=D, capture_output=True, text=True, timeout=900, env={**os.environ, **SIR})
    if yollar:
        sh("bash", "-c", "git add " + " ".join(yollar) + " 2>/dev/null; true")
        if sh("git", "diff", "--cached", "--quiet").returncode:
            sh("git", "commit", "-qm", mesaj)
            for _ in range(4):
                if not sh("git", "pull", "--rebase", "--autostash", "-q").returncode and not sh("git", "push", "-q").returncode: break
                time.sleep(5)
    return {"son": datetime.datetime.now().isoformat(timespec="seconds"), "sn": round(time.time() - t0), "cikti": (r.stdout or "")[-300:]}

SIR = {}

def main():
    durum = {"basla": datetime.datetime.now().isoformat(timespec="seconds"), "isler": {}, "hata": None}
    son_dk = None
    while True:
        simdi = datetime.datetime.now()
        dk = (simdi.hour, simdi.minute)
        if dk != son_dk:
            son_dk = dk
            global SIR
            try:
                hazirla(); sh("git", "pull", "--rebase", "--autostash", "-q"); SIR = sirlar()
            except Exception as e:
                SIR = {}; durum["hata"] = "sır: " + str(e)[:200]
            else:
                durum["hata"] = None
            etkin = SIR.get("ETKIN", "0") == "1"
            durum["sir_sayisi"] = len(SIR)
            durum["etkin"] = etkin; durum["nabiz"] = simdi.isoformat(timespec="seconds")
            try:
                if etkin:
                    for ad, dakikalar, komut, yollar, mesaj in ISLER:
                        if simdi.minute in dakikalar:
                            durum["isler"][ad] = calistir(ad, komut, yollar, mesaj)
            except Exception as e:
                durum["hata"] = str(e)[:300]
            with open(DURUM + ".tmp", "w") as f: json.dump(durum, f, ensure_ascii=False)
            os.replace(DURUM + ".tmp", DURUM)
        time.sleep(5)

if __name__ == "__main__":
    main()
