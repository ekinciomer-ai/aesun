#!/usr/bin/env python3
"""AEMonitoring · Çevrimdışı bekçi (Pi, cron ile dakikada bir; toplayıcının venv'i ile çalışır).

Neden: Saha interneti kesilince Pi'nin olağan döngüsü (cihaz_yonetimi.py) GitHub/ns1'e ulaşamaz; komutları
GitHub kuyruğuna yazdığı için cihazlara da ulaşamaz. Cihazlar, veri kaydediciler ve Pi aynı yerel ağdadır:
bu bekçi internet yokken yönetimi devralır ve internet gelene kadar yerel ağdan çalışır.

Çevrimiçi iken: yalnız bağlantıyı yoklar (GitHub, ns1, havuz), hiçbir şeye dokunmaz.
Çevrimdışı (GitHub ve ns1 art arda 3 dk erişilemez):
  1) ~/.aesun/cevrimdisi işaretini koyar → cihaz_yonetimi.py GitHub kuyruğuna komut yazmaz (geç kalmış komut
     internet gelince bir anda uygulanmasın).
  2) Her 5 dk saatin kararını YEREL bilgiden çıkarır (öncelik sırası):
       a) son plan (cihaz_yonetimi_durum.json → plan: bugün + yarın, saatlik çalış/uyut ve beklenen güneş)
       b) önbellekteki PTF (aylik_ptf.json) ile son eşik: PTF ≤ eşik → çalış
       c) hiçbiri yoksa: güneş saatlerinde beklenen üretim kadar cihaz, gece uyut (şebekeden bilinmeyen fiyata çekme)
     "uyut" saatinde güneş bekleniyorsa üretimin %70'i kadar cihaz çalışır (en yüksek hash'liler).
  3) Kararı cihazlara doğrudan yerel ağdan uygular (toplayıcının mod_yaz'ı; S19 desteği dahil), 10 sn arayla.
  4) Havuz (F2Pool) erişilebilir mi diye bakar. İnternet/havuz geri gelince "çalış" olması gereken ve hash'i
     olmayan cihazları hemen uyandırır; 10 dk sonra hâlâ hash vermeyeni yeniden başlatır (2 saatte bir).
  5) Su/kart sıcaklığı 90 °C'yi geçen cihazı uyutur (internet olsun olmasın).
  6) Her olayı ~/.aesun/cevrimdisi_kayit.json'a yazar.
İnternet dönünce (3 dk kesintisiz erişim): işareti kaldırır, kesinti özetini n8n/kesinti.json'a yazar
(başlangıç, bitiş, süre, uygulanan eylemler) ve yönetimi cihaz_yonetimi.py'ye geri bırakır.
Kapatmak için: ~/.aesun/cevrimdisi_kapali dosyası (bekçi yalnız yoklar, eylem yapmaz).
"""
import json, math, socket, sys, time
from datetime import datetime, timedelta
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from ortak import AESUN, ONBELLEK, TR, log  # noqa: E402

DURUM = AESUN / "cevrimdisi_durum.json"
KAYIT = AESUN / "cevrimdisi_kayit.json"
ISARET = AESUN / "cevrimdisi"
KAPALI = AESUN / "cevrimdisi_kapali"
HEDEFLER = [("api.github.com", 443), ("api.aksarayenerji.net", 443)]
HAVUZ_VARSAYILAN = [("btc.f2pool.com", 1314), ("btc.f2pool.com", 3333)]
ESIK_DK = 3                 # bu kadar dakika art arda erişilemezse çevrimdışı say
DONUS_DK = 3                # bu kadar dakika art arda erişilirse çevrimiçi say
KW_CIHAZ = 5.8
GUNES_PAY = 0.7             # internetsiz üretim bilinmez: beklenen üretimin %70'i kadar cihaz
SICAK = 90                  # °C kart sıcaklığı sınırı
ENLEM, BOYLAM = 38.37, 34.03


def simdi():
    return datetime.now(TR)


def oku(f, v=None):
    try:
        return json.loads(Path(f).read_text())
    except Exception:
        return v


def yaz(f, d):
    Path(f).parent.mkdir(parents=True, exist_ok=True)
    gec = Path(str(f) + ".tmp")
    gec.write_text(json.dumps(d, ensure_ascii=False, default=str))
    gec.replace(f)


def ulasir(h, p, sure=4):
    try:
        with socket.create_connection((h, p), timeout=sure):
            return True
    except Exception:
        return False


def onb(yol):
    return oku(ONBELLEK / yol)


def olay(d, metin):
    d.setdefault("olaylar", []).append({"t": simdi().isoformat(timespec="seconds"), "olay": metin})
    d["olaylar"] = d["olaylar"][-200:]
    log("ÇEVRİMDIŞI", metin)


# ---------------------------------------------------------------- yerel karar
def gunes_saatleri(gun):
    n = gun.timetuple().tm_yday
    g = 2 * math.pi / 365 * (n - 1)
    dek = 0.006918 - 0.399912 * math.cos(g) + 0.070257 * math.sin(g) - 0.006758 * math.cos(2 * g) + 0.000907 * math.sin(2 * g)
    eq = 229.18 * (0.000075 + 0.001868 * math.cos(g) - 0.032077 * math.sin(g) - 0.014615 * math.cos(2 * g) - 0.040849 * math.sin(2 * g))
    la = math.radians(ENLEM)
    ha = math.degrees(math.acos(math.cos(math.radians(90.833)) / (math.cos(la) * math.cos(dek)) - math.tan(la) * math.tan(dek)))
    oglen = (720 - 4 * BOYLAM - eq) / 60 + 3
    return oglen - ha / 15, oglen + ha / 15


def karar_ver(t, filo):
    """(karar 'calis'|'uyut', çalışacak cihaz sayısı, kaynak açıklaması)."""
    y = onb("n8n/cihaz_yonetimi_durum.json") or {}
    kw = ((y.get("ayarlar") or {}).get("cihaz_guc_kw") or KW_CIHAZ)
    anahtar = t.strftime("%Y-%m-%d %H:00")
    satir = next((p for p in y.get("plan") or [] if p.get("t") == anahtar), None)
    if satir:
        if satir.get("karar") == "calis":
            return "calis", filo, f"plan {anahtar[11:16]}: çalış (PTF {satir.get('ptf')})"
        g = satir.get("gunes_beklenen_kw") or 0
        n = min(filo, int(g * GUNES_PAY // kw))
        return "uyut", n, f"plan {anahtar[11:16]}: uyut (PTF {satir.get('ptf')}), güneşle {n} cihaz"
    ap = onb("aylik_ptf.json") or {}
    deger = ((ap.get(t.strftime("%Y-%m")) or {}).get(t.strftime("%d")) or [None] * 24)[t.hour]
    esik = y.get("esik_ptf")
    if deger is not None and esik:
        if deger <= esik:
            return "calis", filo, f"PTF {deger:.0f} ≤ eşik {esik:.0f} (önbellek)"
        return "uyut", 0, f"PTF {deger:.0f} > eşik {esik:.0f} (önbellek)"
    dog, bat = gunes_saatleri(t)
    s = t.hour + t.minute / 60
    if dog + 1 <= s <= bat - 1:
        tepe = max([p.get("gunes_beklenen_kw") or 0 for p in y.get("plan") or []] + [0])
        n = min(filo, int(tepe * 0.5 // kw)) if tepe else filo // 2
        return "uyut", n, f"fiyat bilinmiyor: güneş saatinde {n} cihaz"
    return "uyut", 0, "fiyat bilinmiyor, gece: uyut"


# ---------------------------------------------------------------- cihazlar (yerel ağ)
def cihazlar():
    d = (onb("n8n/cihaz_detay.json") or {}).get("cihaz") or {}
    return [{"no": no, "ip": v.get("ip"), "hash": v.get("hash_th") or 0} for no, v in sorted(d.items()) if v.get("ip")]


def durum_oku(M, ip):
    """(mod '0'|'1'|None, anlık hız GH/s|None, en yüksek kart sıcaklığı|None)."""
    k, c = M.cgi(ip, "get_miner_conf.cgi", timeout=8)
    mod = str(c.get("bitmain-work-mode")) if k == 200 and isinstance(c, dict) and c.get("bitmain-work-mode") is not None else None
    k2, s = M.cgi(ip, "stats.cgi", timeout=8)
    hiz = sic = None
    if k2 == 200 and isinstance(s, dict):
        st = ((s.get("STATS") or [{}])[0]) or {}
        hiz = st.get("rate_5s")
        tl = [t for ch in st.get("chain") or [] for t in (ch.get("temp_chip") or []) + (ch.get("temp_pcb") or []) if isinstance(t, (int, float))]
        sic = max(tl) if tl else None
    return mod, hiz, sic


def mod_yaz(ip, mod):
    try:
        import antminer_panel as A
        if hasattr(A, "mod_yaz"):
            return bool(A.mod_yaz(ip, mod))
    except Exception:
        pass
    import madenci as M
    k, _ = M.cgi(ip, "set_miner_conf.cgi", govde={"bitmain-work-mode": str(mod)}, timeout=30)
    return k == 200


def uygula(d, karar, n, neden):
    import madenci as M
    filo = cihazlar()
    if not filo:
        olay(d, "cihaz listesi önbellekte yok; eylem yapılamadı")
        return
    sira = sorted(filo, key=lambda c: -c["hash"])            # en yüksek hash'li olanlar çalışır
    calisacak = {c["no"] for c in sira[:n]} if karar == "uyut" else {c["no"] for c in filo}
    degisen = []
    for c in filo:
        mod, hiz, sic = durum_oku(M, c["ip"])
        if sic is not None and sic >= SICAK:
            if mod != "1" and mod_yaz(c["ip"], "1"):
                degisen.append(f"#{c['no']} uyut (sıcaklık {sic:.0f} °C)")
            continue
        ist = "0" if c["no"] in calisacak else "1"
        if mod is None or mod == ist:
            continue
        if mod_yaz(c["ip"], ist):
            degisen.append(f"#{c['no']} {'çalıştır' if ist == '0' else 'uyut'}")
            time.sleep(10)                                     # güç rampası: cihazlar birden yüklenmesin
    d["son_karar"] = {"t": simdi().isoformat(timespec="seconds"), "karar": karar, "calisacak": len(calisacak), "neden": neden}
    if degisen:
        olay(d, f"{neden} → " + ", ".join(degisen))


def havuz_noktalari():
    nok = []
    for c in cihazlar()[:3]:
        try:
            import madenci as M
            k, conf = M.cgi(c["ip"], "get_miner_conf.cgi", timeout=8)
            for p in (conf or {}).get("pools") or []:
                u = str(p.get("url") or "").replace("stratum+tcp://", "")
                if ":" in u:
                    h, pt = u.rsplit(":", 1)
                    nok.append((h, int(pt)))
            if nok:
                break
        except Exception:
            continue
    return nok or HAVUZ_VARSAYILAN


def kurtar(d):
    """Havuz geri gelince: çalışması gereken ama hash vermeyen cihazları uyandır; 10 dk sonra hâlâ yoksa yeniden başlat."""
    import madenci as M
    karar, n, neden = karar_ver(simdi(), len(cihazlar()))
    filo = sorted(cihazlar(), key=lambda c: -c["hash"])
    calisacak = {c["no"] for c in (filo[:n] if karar == "uyut" else filo)}
    sonuc = []
    yb = d.setdefault("yeniden_baslatma", {})
    for c in filo:
        if c["no"] not in calisacak:
            continue
        mod, hiz, _ = durum_oku(M, c["ip"])
        if hiz:
            continue
        if mod == "1":
            if mod_yaz(c["ip"], "0"):
                sonuc.append(f"#{c['no']} uyandırıldı")
                time.sleep(10)
        elif d.get("havuz_dondu") and simdi() - datetime.fromisoformat(d["havuz_dondu"]) > timedelta(minutes=10):
            son = yb.get(c["no"])
            if not son or simdi() - datetime.fromisoformat(son) > timedelta(hours=2):
                k, _ = M.cgi(c["ip"], "reboot.cgi", timeout=15)
                yb[c["no"]] = simdi().isoformat(timespec="seconds")
                sonuc.append(f"#{c['no']} yeniden başlatıldı (havuz geldi, hash yok)")
    if sonuc:
        olay(d, "havuz geri geldi: " + ", ".join(sonuc))


def kesinti_yaz(d):
    """İnternet dönünce kesinti özetini depoya yazar (ortak.gh: GitHub + ns1)."""
    try:
        from ortak import gh
        eski, sha = gh("n8n/kesinti.json")
        L = (eski or {}).get("kesintiler") or []
        k = {"bas": d.get("kesinti_bas"), "bit": simdi().isoformat(timespec="seconds"),
             "sure_dk": round((simdi() - datetime.fromisoformat(d["kesinti_bas"])).total_seconds() / 60) if d.get("kesinti_bas") else None,
             "olaylar": [o for o in d.get("olaylar", []) if d.get("kesinti_bas") and o["t"] >= d["kesinti_bas"]][-40:]}
        L = (L + [k])[-100:]
        gh("n8n/kesinti.json", {"guncellendi": k["bit"], "aciklama": "Saha interneti kesintileri ve çevrimdışı bekçinin eylemleri (Pi)",
                                "kesintiler": L}, sha, f"Kesinti {k['sure_dk']} dk")
    except Exception as e:
        log("kesinti yazılamadı:", e)


def main():
    d = oku(DURUM, {}) or {}
    t = simdi()
    net = any(ulasir(h, p) for h, p in HEDEFLER)
    if not d.get("havuz") or t.minute % 30 == 0:
        try:
            d["havuz"] = havuz_noktalari()
        except Exception:
            d["havuz"] = HAVUZ_VARSAYILAN
    havuz = any(ulasir(h, int(p)) for h, p in d.get("havuz") or HAVUZ_VARSAYILAN)
    d["yok_dk"] = 0 if net else d.get("yok_dk", 0) + 1
    d["var_dk"] = d.get("var_dk", 0) + 1 if net else 0
    onceki_havuz = d.get("havuz_var", True)
    d["havuz_var"] = havuz
    d["t"] = t.isoformat(timespec="seconds")
    if havuz and not onceki_havuz:
        d["havuz_dondu"] = t.isoformat(timespec="seconds")
        olay(d, "havuz erişilebilir oldu")
    if not havuz and onceki_havuz:
        olay(d, "havuza erişilemiyor")
    cevrimdisi = d.get("cevrimdisi", False)
    if not cevrimdisi and d["yok_dk"] >= ESIK_DK:
        d["cevrimdisi"], d["kesinti_bas"] = True, (t - timedelta(minutes=ESIK_DK)).isoformat(timespec="seconds")
        ISARET.write_text(d["kesinti_bas"])
        olay(d, f"internet yok ({ESIK_DK} dk) — çevrimdışı yönetim devrede")
        d["son_uygula"] = None
    elif cevrimdisi and d["var_dk"] >= DONUS_DK:
        olay(d, f"internet geri geldi — yönetim cihaz yönetimine bırakıldı")
        d["cevrimdisi"] = False
        ISARET.unlink(missing_ok=True)
        yaz(DURUM, d)
        kesinti_yaz(d)
    if d.get("cevrimdisi") and not KAPALI.exists():
        if not d.get("son_uygula") or t - datetime.fromisoformat(d["son_uygula"]) >= timedelta(minutes=5):
            karar, n, neden = karar_ver(t, len(cihazlar()))
            uygula(d, karar, n, neden)
            d["son_uygula"] = t.isoformat(timespec="seconds")
    if havuz and d.get("havuz_dondu") and t - datetime.fromisoformat(d["havuz_dondu"]) <= timedelta(minutes=25) and not KAPALI.exists():
        kurtar(d)                                             # havuz döndükten sonraki 25 dk: hızlı toparlanma
    yaz(DURUM, d)
    yaz(KAYIT, {"guncellendi": d["t"], "cevrimdisi": d.get("cevrimdisi"), "olaylar": d.get("olaylar", [])[-60:]})


def kur(log=print):
    """Dakikalık cron satırını bir kez ekler (cihaz_yonetimi.py her turda çağırır)."""
    import subprocess
    vpy = Path.home() / "SAHA/antminer/venv/bin/python"
    kok = Path(__file__).resolve().parent.parent
    satir = f"* * * * * flock -n /tmp/aesun_cevrimdisi.lock {vpy if vpy.exists() else 'python3'} {kok}/pi/cevrimdisi_bekci.py >> {kok}/cevrimdisi.log 2>&1"
    mevcut = subprocess.run(["crontab", "-l"], capture_output=True, text=True).stdout
    if satir in mevcut:
        return
    yeni = [x for x in mevcut.splitlines() if "pi/cevrimdisi_bekci.py" not in x] + [satir]
    subprocess.run(["crontab", "-"], input="\n".join(yeni) + "\n", text=True, check=True)
    log("çevrimdışı bekçi cron eklendi")


if __name__ == "__main__":
    socket.setdefaulttimeout(15)
    try:
        import signal
        signal.alarm(55)                                       # sonraki dakikanın çalışmasını engellemesin
    except Exception:
        pass
    main()
