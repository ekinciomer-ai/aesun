"""aesun-isler: epias-ptf'teki periyodik işleri (eskiden GitHub Actions) ns1'de çalıştırır.

Sırlar /opt/aesun/isler.env'den ortam değişkeni olarak gelir (root-only dosya, kapsayıcıya env_file ile).
Depoya yazma: salt bu sunucuya ait dağıtım anahtarı (~/.ssh). Her işin çıktısı is_calistir.sh ile n8n/is_hatalari.json'a düşer.
ETKIN=0 iken hiçbir iş çalışmaz (geçiş sırasında Actions ile çift çalışmayı önler).
"""
import json, os, subprocess, time, datetime
REPO = os.environ.get("AESUN_ISLER_REPO", "git@github.com:ekinciomer-ai/epias-ptf.git")
D = "/veri/epias-ptf"
DURUM = "/veri/durum.json"
TETIK = "/veri/tetik"   # şef (ns1 sef.py) gecikmiş işi buraya dosya bırakarak tetikler
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
    ("Veri arşivi", {5}, ["python", "arsiv_kaydet.py"], ["-A"], "Veri arşivi"),
    ("Durum analizi", {41}, ["python", "durum_analizi.py"], ["n8n/analiz/"], "Durum analizi"),
    # 19 Eki: n8n "Ana döngü" + alt akışlar + Uyarı motoru yerine (n8n kotası) — panel özeti n8n/aesun_son.json
    ("İzleme özeti", {2, 32}, ["python", "izleme_ozet.py"], ["n8n/aesun_son.json", "n8n/izleme_durum.json"], "İzleme özeti"),
]

def sh(*a, **k):
    return subprocess.run(list(a), cwd=k.get("cwd", D), capture_output=True, text=True, timeout=k.get("t", 600))

def hazirla():
    os.environ.setdefault("GIT_SSH_COMMAND", "ssh -o UserKnownHostsFile=/dev/null -o StrictHostKeyChecking=no")
    if not os.path.isdir(D + "/.git"):
        r = sh("git", "clone", "--depth", "50", REPO, D, cwd="/veri")
        if r.returncode: raise RuntimeError(r.stderr[-300:])
    sh("git", "config", "user.name", "aesun-bot"); sh("git", "config", "user.email", "aesun-bot@users.noreply.github.com")

def git_esitle():
    """Sığ klonda (depth=50) graft kopmasını ve yarım rebase'i temizleyip main dalını origin/main'e oturtur."""
    sh("rm", "-rf", D + "/.git/rebase-merge", D + "/.git/rebase-apply", D + "/.git/MERGE_HEAD", D + "/.git/index.lock", t=15)
    sh("git", "fetch", "--depth", "50", "origin", "main", t=90)
    r = sh("git", "checkout", "-B", "main", "origin/main", t=30)
    sh("git", "reset", "--hard", "origin/main", t=30)
    sh("git", "clean", "-fd", t=15)
    sh("git", "stash", "clear", t=15)
    return r

def calistir(ad, komut, yollar, mesaj):
    git_esitle()
    t0 = time.time()
    r = subprocess.run(["bash", "is_calistir.sh", ad, *komut], cwd=D, capture_output=True, text=True, timeout=900, env={**os.environ, **SIR, "YEREL_GIT": "1"})
    kod = "0"
    try: kod = open("/tmp/is_kod.txt").read().strip() or "0"
    except Exception: pass
    if yollar:
        sh("bash", "-c", "git add " + " ".join(yollar) + " 2>/dev/null; true")
    sh("bash", "-c", "rm -f /tmp/is_degisen.tar && git diff --cached --name-only -z | grep -zv '^n8n/is_hatalari.json$' | xargs -0 -r tar -cf /tmp/is_degisen.tar 2>/dev/null; true")
    sh("git", "add", "n8n/is_hatalari.json")
    for i in range(4):
        if i > 0:
            git_esitle()
            sh("bash", "-c", "tar -xf /tmp/is_degisen.tar 2>/dev/null; true")
            sh("python3", "is_hata_kaydet.py", ad, kod, "/tmp/is_cikti.txt", t=30)
            if yollar:
                sh("bash", "-c", "git add " + " ".join(yollar) + " 2>/dev/null; true")
            sh("git", "add", "n8n/is_hatalari.json")
        if not sh("git", "diff", "--cached", "--quiet").returncode:
            break
        sh("git", "commit", "-qm", mesaj)
        if not sh("git", "push", "-q", "origin", "HEAD:main", t=90).returncode:
            break
        time.sleep(3)
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
                hazirla(); git_esitle(); SIR = sirlar()
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
                        tetik = os.path.join(TETIK, ad.replace(" ", "_"))      # şef: gecikmiş işi hemen çalıştır
                        elle = os.path.exists(tetik)
                        if elle:
                            os.remove(tetik)
                        if simdi.minute in dakikalar or elle:
                            durum["isler"][ad] = calistir(ad, komut, yollar, mesaj)
                            if elle: durum["isler"][ad]["sef"] = True
            except Exception as e:
                durum["hata"] = str(e)[:300]
            with open(DURUM + ".tmp", "w") as f: json.dump(durum, f, ensure_ascii=False)
            os.replace(DURUM + ".tmp", DURUM)
        time.sleep(5)

if __name__ == "__main__":
    main()
