"""Pi betiklerinin ortak yardımcıları (yalnız standart kütüphane).
Token: ~/.aesun/osos.env içindeki GITHUB_TOKEN (koda yazılmaz)."""
import base64, json, os, urllib.error, urllib.request
from datetime import datetime, timedelta, timezone
from pathlib import Path

import sunucu  # Aksaray Enerji sunucusu (portal.aksarayenerji.net) — ayrıntı: sunucu.py

REPO = "https://api.github.com/repos/ekinciomer-ai/epias-ptf/contents/"
TR = timezone(timedelta(hours=3))
AESUN = Path.home() / ".aesun"
ONBELLEK = AESUN / "onbellek"
BEKLEYEN = ONBELLEK / "_bekleyen.json"


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


def _onbellek_yaz(yol, veri):
    if veri is None:
        return
    try:
        f = _onbellek_dosya(yol)
        f.parent.mkdir(parents=True, exist_ok=True)
        gec = f.with_suffix(f.suffix + ".tmp")
        gec.write_text(json.dumps(veri, ensure_ascii=False))
        gec.replace(f)
    except Exception:
        pass


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


def gh(yol, veri=None, sha=None, mesaj=None):
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
        try:
            with urllib.request.urlopen(urllib.request.Request(REPO + yol, headers=h), timeout=30) as r:
                m = json.loads(r.read())
            if m.get("content"):
                out = json.loads(base64.b64decode(m["content"]).decode())
                _onbellek_yaz(yol, out)
                _bekleyen_esitle()
                return out, m["sha"]
            with urllib.request.urlopen(urllib.request.Request(REPO + yol, headers={**h, "Accept": "application/vnd.github.raw+json"}), timeout=60) as r:
                out = json.loads(r.read())
                _onbellek_yaz(yol, out)
                _bekleyen_esitle()
                return out, m["sha"]
        except urllib.error.HTTPError as e:
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
             "content": base64.b64encode(json.dumps(veri, ensure_ascii=False, indent=1).encode()).decode()}
    if sha and sha not in ("sunucu", "onbellek"):
        govde["sha"] = sha
    for deneme in range(2):
        try:
            if not govde.get("sha"):
                with urllib.request.urlopen(urllib.request.Request(REPO + yol, headers=h), timeout=20) as r0:
                    govde["sha"] = json.loads(r0.read()).get("sha")
            r = urllib.request.Request(REPO + yol, data=json.dumps(govde).encode(), headers={**h, "Content-Type": "application/json"}, method="PUT")
            with urllib.request.urlopen(r, timeout=30) as y:
                sonuc = json.loads(y.read())
            sunucu.yaz(yol, veri)
            _bekleyen_esitle()
            return sonuc
        except urllib.error.HTTPError as e:
            if e.code == 404 and not govde.get("sha"):
                pass
            elif e.code in (409, 422) and not deneme:   # sha eskimiş: tazele ve bir kez daha dene
                govde.pop("sha", None)
                continue
            else:
                _bekleyen_ekle(yol)
                log(f"HTTP {e.code} önbellek yazma ({yol})")
                return {"content": {"sha": "onbellek"}}
        except Exception as e:
            _bekleyen_ekle(yol)
            log(f"çevrimdışı önbellek yazma ({yol}):", str(e)[:80])
            return {"content": {"sha": "onbellek"}}


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
