"""Pi betiklerinin ortak yardımcıları (yalnız standart kütüphane).
Token: ~/.aesun/osos.env içindeki GITHUB_TOKEN (koda yazılmaz)."""
import base64, hashlib, json, os, urllib.error, urllib.request
from datetime import datetime, timedelta, timezone
from pathlib import Path

import sunucu  # Aksaray Enerji sunucusu (portal.aksarayenerji.net) — ayrıntı: sunucu.py

REPO = "https://api.github.com/repos/ekinciomer-ai/epias-ptf/contents/"
TR = timezone(timedelta(hours=3))
AESUN = Path.home() / ".aesun"
ONBELLEK = AESUN / "onbellek"
BEKLEYEN = ONBELLEK / "_bekleyen.json"
ETAG = ONBELLEK / "_etag"           # GitHub ETag'leri: değişmeyen dosya yeniden indirilmez (304, ~1 KB)
YEREL_PANEL = "http://127.0.0.1:5000/api/status"   # Pi'deki toplayıcı (altminer) — antminer_panel.json'un kaynağı
TRAFIK = AESUN / "gh_trafik.log"    # internet trafiği ölçümü: "zaman tür bayt yol" (nabız 24 sa özetler, eskiyi siler)


def trafik(tur, bayt, yol):
    """İnternetten geçen GitHub trafiğini satır satır kaydeder (wlan0 sayacı yerel cihaz trafiğini de içerdiği için)."""
    try:
        with open(TRAFIK, "a") as f:
            f.write(f"{int(datetime.now().timestamp())} {tur} {int(bayt)} {yol}\n")
    except Exception:
        pass


def log(*a):
    print(datetime.now(TR).strftime("%Y-%m-%d %H:%M:%S"), *a, flush=True)


def token():
    for f in (AESUN / "osos.env", Path.home() / "aesun/env.txt"):
        if f.exists():
            for s in f.read_text().splitlines():
                if s.startswith("GITHUB_TOKEN="):
                    return s.split("=", 1)[1].strip()
    return os.environ.get("GITHUB_TOKEN", "")


TOK = token()


def _onbellek_dosya(yol):
    return ONBELLEK / str(yol).lstrip("/")


def _ozet(metin):
    return hashlib.sha256(metin.encode()).hexdigest()


def _onbellek_yaz(yol, veri):
    """Yerel kopyayı yazar; içeriğin SHA-256 özetini döner (ETag eşleştirmesi için)."""
    if veri is None:
        return None
    try:
        f = _onbellek_dosya(yol)
        f.parent.mkdir(parents=True, exist_ok=True)
        metin = json.dumps(veri, ensure_ascii=False)
        gec = f.with_suffix(f.suffix + f".{os.getpid()}.tmp")
        gec.write_text(metin)
        gec.replace(f)
        return _ozet(metin)
    except Exception:
        return None


def _etag_dosya(yol):
    return ETAG / (str(yol).lstrip("/") + ".json")


def _etag_oku(yol):
    try:
        return json.loads(_etag_dosya(yol).read_text())
    except Exception:
        return None


def _etag_yaz(yol, etag, sha, ozet):
    if not (etag and sha and ozet):
        return
    try:
        f = _etag_dosya(yol)
        f.parent.mkdir(parents=True, exist_ok=True)
        gec = f.with_suffix(f".{os.getpid()}.tmp")
        gec.write_text(json.dumps({"etag": etag, "sha": sha, "ozet": ozet}))
        gec.replace(f)
    except Exception:
        pass


def _etag_onbellek(yol, kayit):
    """304 geldiğinde: yerel kopya ETag'in ait olduğu sürümle aynıysa onu döner (aksi halde None → tam indirme)."""
    try:
        metin = _onbellek_dosya(yol).read_text()
        if kayit and _ozet(metin) == kayit.get("ozet"):
            return json.loads(metin)
    except Exception:
        pass
    return None


def _onbellek_oku(yol):
    try:
        f = _onbellek_dosya(yol)
        if f.exists():
            return json.loads(f.read_text())
    except Exception:
        pass
    return None


def _bekleyen_ekle(yol):
    if yol == "antminer_commands.json":
        return
    try:
        ONBELLEK.mkdir(parents=True, exist_ok=True)
        b = json.loads(BEKLEYEN.read_text()) if BEKLEYEN.exists() else []
        if yol not in b:
            b.append(yol)
            BEKLEYEN.write_text(json.dumps(b, ensure_ascii=False))
    except Exception:
        pass


def _bekleyen_esitle():
    if not BEKLEYEN.exists():
        return
    try:
        b = json.loads(BEKLEYEN.read_text())
    except Exception:
        return
    if not b:
        return
    kalan = []
    for yol in b:
        v = _onbellek_oku(yol)
        if v is None:
            continue
        try:
            if sunucu.yalniz_sunucu():
                sunucu.yaz(yol, v, zorunlu=True)
            else:
                sunucu.yaz(yol, v)
            log("çevrimdışı bekleyen yazım eşitlendi:", yol)
        except Exception:
            kalan.append(yol)
    try:
        if kalan:
            BEKLEYEN.write_text(json.dumps(kalan, ensure_ascii=False))
        else:
            BEKLEYEN.unlink(missing_ok=True)
    except Exception:
        pass


def gh(yol, veri=None, sha=None, mesaj=None, _etagsiz=False):
    """epias-ptf dosyası oku (veri=None) ya da yaz. Okuma (json, sha) döner; yoksa (None, None).
    AE_KAYNAK=sunucu ise yalnız sunucu; değilse GitHub + sunucuya kopya.
    İnternet kesintisinde yerel önbellekten (~/.aesun/onbellek) okur/yazar; bağlantı gelince eşitler."""
    if veri is not None:
        _onbellek_yaz(yol, veri)
    if sunucu.yalniz_sunucu():
        if veri is None:
            try:
                v = sunucu.oku(yol)
                if v is not None:
                    _onbellek_yaz(yol, v)
                    _bekleyen_esitle()
                    return v, "sunucu"
                return None, None
            except Exception as e:
                yerel = _onbellek_oku(yol)
                log(f"çevrimdışı önbellek okuma ({yol}):", str(e)[:80])
                return (yerel, "onbellek") if yerel is not None else (None, None)
        try:
            sunucu.yaz(yol, veri, zorunlu=True)
            _bekleyen_esitle()
            return {"content": {"sha": "sunucu"}}
        except Exception as e:
            _bekleyen_ekle(yol)
            log(f"çevrimdışı önbellek yazma ({yol}):", str(e)[:80])
            return {"content": {"sha": "onbellek"}}
    h = {"Authorization": "Bearer " + TOK, "Accept": "application/vnd.github+json", "User-Agent": "aesun-pi"}
    if veri is None:
        kayit = None if _etagsiz else _etag_oku(yol)
        try:
            hk = {**h, "If-None-Match": kayit["etag"]} if kayit and kayit.get("etag") else h
            with urllib.request.urlopen(urllib.request.Request(REPO + yol, headers=hk), timeout=30) as r:
                etag = r.headers.get("ETag")
                ham = r.read()
                m = json.loads(ham)
            trafik("oku", len(ham), yol)
            if m.get("content"):
                out = json.loads(base64.b64decode(m["content"]).decode())
            else:   # 1 MB üstü: içerik ayrıca ham indirilir
                with urllib.request.urlopen(urllib.request.Request(REPO + yol, headers={**h, "Accept": "application/vnd.github.raw+json"}), timeout=60) as r:
                    ham = r.read()
                    out = json.loads(ham)
                trafik("oku", len(ham), yol)
            _etag_yaz(yol, etag, m.get("sha"), _onbellek_yaz(yol, out))
            _bekleyen_esitle()
            return out, m["sha"]
        except urllib.error.HTTPError as e:
            if e.code == 304:                            # değişmemiş: yerel kopya (indirme yok)
                trafik("304", 0, yol)
                yerel = _etag_onbellek(yol, kayit)
                if yerel is not None:
                    _bekleyen_esitle()
                    return yerel, kayit["sha"]
                try:
                    _etag_dosya(yol).unlink()
                except Exception:
                    pass
                return gh(yol, _etagsiz=True)
            if e.code == 404:
                return None, None
            yerel = _onbellek_oku(yol)
            if yerel is not None:
                log(f"HTTP {e.code} önbellek okuma ({yol})")
                return yerel, "onbellek"
            raise
        except Exception as e:
            yerel = _onbellek_oku(yol)
            log(f"çevrimdışı önbellek okuma ({yol}):", str(e)[:80])
            return (yerel, "onbellek") if yerel is not None else (None, None)
    govde = {"message": mesaj or ("aesun " + datetime.now(TR).strftime("%Y-%m-%d %H:%M")),
             # sıkı JSON (girintisiz): aynı veri %15–57 daha küçük → GitHub'a yükleme ve sonraki indirmeler azalır
             "content": base64.b64encode(json.dumps(veri, ensure_ascii=False, separators=(",", ":")).encode()).decode()}
    if sha and sha not in ("sunucu", "onbellek"):
        govde["sha"] = sha
    yeni = False
    for deneme in range(3):
        try:
            if not govde.get("sha") and not yeni:
                kayit = _etag_oku(yol)
                try:   # yalnız sha gerekiyor: ETag eşleşirse 304 ile (dosya indirilmeden) kayıtlı sha
                    hk = {**h, "If-None-Match": kayit["etag"]} if not deneme and kayit and kayit.get("etag") else h
                    with urllib.request.urlopen(urllib.request.Request(REPO + yol, headers=hk), timeout=20) as r0:
                        govde["sha"] = json.loads(r0.read()).get("sha")
                except urllib.error.HTTPError as e0:
                    if e0.code != 304:
                        raise
                    govde["sha"] = kayit["sha"]
            g = json.dumps(govde).encode()
            r = urllib.request.Request(REPO + yol, data=g, headers={**h, "Content-Type": "application/json"}, method="PUT")
            with urllib.request.urlopen(r, timeout=30) as y:
                sonuc = json.loads(y.read())
            trafik("yaz", len(g), yol)
            sunucu.yaz(yol, veri)
            _bekleyen_esitle()
            return sonuc
        except urllib.error.HTTPError as e:
            if e.code == 404 and not govde.get("sha") and not yeni:
                yeni = True                                # dosya yok: sha'sız oluştur (eskiden bu durumda hiç yazılmıyordu)
                continue
            elif e.code in (409, 422) and deneme < 2:   # sha eskimiş: tazele ve bir kez daha dene
                govde.pop("sha", None)
                yeni = False
                continue
            else:
                _bekleyen_ekle(yol)
                log(f"HTTP {e.code} önbellek yazma ({yol})")
                return {"content": {"sha": "onbellek"}}
        except Exception as e:
            _bekleyen_ekle(yol)
            log(f"çevrimdışı önbellek yazma ({yol}):", str(e)[:80])
            return {"content": {"sha": "onbellek"}}


def _panel_anahtarlar(cihazlar):
    """Cihaz kayıtlarının çoğunda (%80) bulunan alan adları."""
    sayac = {}
    for d in cihazlar or []:
        for a in (d or {}):
            sayac[a] = sayac.get(a, 0) + 1
    n = len(cihazlar or [])
    return {a for a, c in sayac.items() if n and c >= 0.8 * n}


def panel_oku(azami_yas_dk=10, gerekli=("ip", "online", "sleeping", "hashrate_TH")):
    """antminer_panel.json — önce Pi'deki toplayıcıdan (127.0.0.1:5000, internet harcamaz), olmazsa GitHub'dan.

    Toplayıcı bu dosyanın kaynağı; dakikada bir çalışan betiklerin (canlı, öğrenme, detay, ağ taraması) aynı veriyi
    her seferinde GitHub'dan ~300 KB indirmesi saha internet kotasının en büyük kalemlerinden biriydi.
    Yerel /api/status yalnız canlı alanları taşır (GitHub kopyası F2Pool kazanç/worker eşleşmesiyle zenginleştirilmiş):
    her cihaz IP'ye göre son GitHub kopyasındaki kaydıyla birleştirilir, canlı alanlar yerelden gelir.
    Yerel veri yalnız (1) çağıranın `gerekli` alanları cihazların çoğunda varsa, (2) zaman damgası okunabiliyorsa ve
    (3) azami_yas_dk'dan taze ise kullanılır; aksi halde eski yol (GitHub, ETag'li) sürer. Dönüş: (veri, kaynak)."""
    uzak = _onbellek_oku("antminer_panel.json")
    neden = ""
    try:
        with urllib.request.urlopen(YEREL_PANEL, timeout=4) as r:
            d = json.loads(r.read().decode())
        cihaz = d.get("devices") if isinstance(d, dict) else None
        yerel_a = _panel_anahtarlar(cihaz)
        ham = (d.get("timestamp") or d.get("last_scan")) if isinstance(d, dict) else None
        if not cihaz:
            neden = "yerel cihaz listesi yok; anahtarlar: " + ",".join(sorted(d)[:20] if isinstance(d, dict) else [])
        elif not uzak or not (uzak.get("devices")):
            neden = "GitHub kopyası yok (önbellek boş)"
        elif not set(gerekli) <= yerel_a:
            neden = "eksik alan: " + ",".join(sorted(set(gerekli) - yerel_a)) + " | yerel: " + ",".join(sorted(yerel_a))[:400]
        else:
            t = datetime.fromtimestamp(float(ham), TR) if isinstance(ham, (int, float)) else zaman(ham)
            fark = (datetime.now(TR) - t).total_seconds()
            if abs(fark) > azami_yas_dk * 60:
                neden = f"zaman {ham!r} ({round(fark / 60)} dk fark)"
            else:
                eski = {x.get("ip"): x for x in uzak.get("devices") or [] if isinstance(x, dict)}
                birlesik = [{**eski.get(x.get("ip"), {}), **x} for x in cihaz if isinstance(x, dict)]
                out = {**uzak, **{k: v for k, v in d.items() if k not in ("timestamp", "last_scan", "devices", "summary")},
                       "devices": birlesik, "summary": {**(uzak.get("summary") or {}), **(d.get("summary") or {})}}
                out["timestamp"] = t.replace(tzinfo=None).isoformat()      # GitHub kopyasıyla aynı biçim (TR, dilimsiz)
                trafik("panel_yerel", 0, "antminer_panel.json")
                try:
                    (AESUN / "panel_yerel.json").write_text(json.dumps({"t": datetime.now(TR).isoformat(timespec="seconds"), "neden": "ok"}))
                except Exception:
                    pass
                return out, "yerel"
    except Exception as e:
        neden = "hata: " + str(e)[:120]
    try:   # neden yerel kullanılamadı — nabız pi_nabiz'e taşır (teşhis)
        (AESUN / "panel_yerel.json").write_text(json.dumps({"t": datetime.now(TR).isoformat(timespec="seconds"), "neden": neden},
                                                           ensure_ascii=False))
    except Exception:
        pass
    v, _ = gh("antminer_panel.json")
    return v, "github"


def zaman(s):
    """ISO metni -> TR saat dilimli datetime (dilimsiz metin yerel/TR kabul edilir)."""
    t = datetime.fromisoformat(str(s).replace("Z", "+00:00"))
    return t.replace(tzinfo=TR) if t.tzinfo is None else t.astimezone(TR)


def bildirim_tetikle(aralik_dk=15):
    """GitHub'ın zamanlanmış iş akışları saatlerce gecikebiliyor (8 Eki: 15 dk yerine ~6 saatte bir).
    Bildirimler iş akışını Pi düzenli tetikler: repository_dispatch (event_type "bildirim"), en çok aralik_dk'da bir."""
    return False   # 15.10.2026: Bildirimler artık ns1'de (aesun-isler) 15 dk'da bir çalışıyor; tetik gereksiz
    durum = AESUN / "bildirim_tetik.json"
    try:
        son = json.loads(durum.read_text()).get("t", 0) if durum.exists() else 0
    except Exception:
        son = 0
    simdi = datetime.now(timezone.utc).timestamp()
    if simdi - son < aralik_dk * 60 - 30:
        return False
    r = urllib.request.Request(REPO.replace("/contents/", "/dispatches"), data=json.dumps({"event_type": "bildirim"}).encode(),
                               headers={"Authorization": "Bearer " + TOK, "Accept": "application/vnd.github+json",
                                        "User-Agent": "aesun-pi", "Content-Type": "application/json"}, method="POST")
    with urllib.request.urlopen(r, timeout=30):
        pass
    AESUN.mkdir(parents=True, exist_ok=True)
    durum.write_text(json.dumps({"t": simdi}))
    return True


# 19 Eki: toplayıcının hashrate_TH'si açılıştan beri ORTALAMADIR; kartlar durunca saatlerce >0 kalır
# (18 Eki 02:17 güç kaynağı hatası: 28 cihaz 6 saat hash 0 iken panel "çalışıyor" gösterdi).
# cihaz_detay her 5 dk anlık hızı (rate_5s/kart) buraya yazar; hash kayıtları bununla düzeltilir.
ANLIK = AESUN / "cihaz_anlik.json"


def anlik_yaz(hizlar, simdi):
    try:
        ANLIK.write_text(json.dumps({"t": simdi.isoformat(timespec="seconds"), "c": hizlar}))
    except Exception:
        pass


def hash_duzelt(worker, th, simdi=None):
    """Anlık hız 15 dk içinde ölçülmüş ve 0 ise (kartlar durmuş) 0 döner; aksi halde toplayıcının değeri."""
    if not worker or not th:
        return th
    try:
        a = json.loads(ANLIK.read_text())
        if abs(((simdi or datetime.now(TR)) - datetime.fromisoformat(a["t"])).total_seconds()) > 900:
            return th
        v = a["c"].get(str(worker))
        return 0.0 if v is not None and v <= 0 else th
    except Exception:
        return th
