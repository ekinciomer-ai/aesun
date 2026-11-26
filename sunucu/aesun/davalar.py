"""Davalar: UYAP dava evrakları (yalnız yönetici). Portal → Özel Alan → Davalar sayfası buradan okur.
Evraklar sunucuda şifreli durur (/davalar: dizin.sifreli + e/<id>.sifreli, AES-256-GCM).
Anahtar ayrı dosyada (/davalar_anahtar, yalnız bu kapsayıcının kullanıcısı okur); hiçbir yanıtta ya da günlükte yer almaz.
Biçim: 12 bayt nonce + şifreli metin (etiket dahil)."""
import json, os, re
from pathlib import Path
from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import JSONResponse, Response
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

KOK = Path(os.environ.get("AESUN_DAVALAR", "/davalar"))
ANAHTAR = Path(os.environ.get("AESUN_DAVALAR_ANAHTAR", "/davalar_anahtar"))
ID = re.compile(r"^[a-f0-9]{8,40}$")
TURLER = {"pdf": "application/pdf", "png": "image/png", "jpg": "image/jpeg", "txt": "text/plain; charset=utf-8",
          "html": "text/html; charset=utf-8", "udf": "application/octet-stream", "zip": "application/zip", "tif": "image/tiff"}
BAS = {"Cache-Control": "private, no-store", "X-Robots-Tag": "noindex, nofollow", "X-Content-Type-Options": "nosniff"}
router = APIRouter()
_roller = None
_dizin = {"mtime": None, "veri": None}


def bagla(roller_fn):
    global _roller
    _roller = roller_fn


def _yonetici(req: Request):
    if _roller is None or not _roller(req) & {"yonetici", "oz_davalar", "oz_davalar_y"}:   # oz_*: portal Özel Alan yetkisi
        raise HTTPException(401, "yetkili girişi gerekli")


# Grup bazlı dosya yetkisi: tam yetkili (yonetici / oz_davalar / oz_davalar_y) tüm grupları görür;
# grup yetkilisi yalnız oz_davalar_<gkod> rolünü taşıdığı grupları görür. Grup kodları dizindeki 'gkod' alanıyla eşleşir.
def _izinli_gruplar(req: Request):
    """None → tüm gruplar (tam yetkili); set → yalnız bu grup kodları; boş set + tam değil → yetkisiz."""
    if _roller is None:
        raise HTTPException(401, "yetkili girişi gerekli")
    r = _roller(req)
    if r & {"yonetici", "oz_davalar", "oz_davalar_y"}:
        return None
    g = {x[len("oz_davalar_"):] for x in r if x.startswith("oz_davalar_")}
    if not g:
        raise HTTPException(401, "yetkili girişi gerekli")
    return g


def _dava_gkod(d: dict) -> str:
    return str(d.get("gkod") or "")


def _ev_gkod_haritasi(veri: dict) -> dict:
    """eid → ait olduğu davanın gkod'u (yetki denetimi için). Dizin önbelleğiyle bir kez hesaplanır."""
    h = veri.get("_ev_gkod")
    if h is not None:
        return h
    h = {}
    for d in veri.get("davalar", []):
        gk = _dava_gkod(d)
        for k in d.get("klasorler", []):
            for e in k.get("evraklar", []):
                if e.get("id"):
                    h[e["id"]] = gk
    veri["_ev_gkod"] = h
    return h


def _coz(p: Path) -> bytes:
    b = p.read_bytes()
    return AESGCM(ANAHTAR.read_bytes()[:32]).decrypt(b[:12], b[12:], None)


def _dizin_oku():
    p = KOK / "dizin.sifreli"
    if not p.is_file():
        return {"davalar": [], "evrak": {}}
    m = p.stat().st_mtime
    if _dizin["mtime"] != m:
        _dizin["veri"] = json.loads(_coz(p))
        _dizin["mtime"] = m
    return _dizin["veri"]


@router.get("/v1/davalar/dizin")
def dizin(request: Request):
    izin = _izinli_gruplar(request)   # None = tümü; set = yalnız bu gruplar; aksi halde 401 fırlatır
    d = _dizin_oku()
    davalar = d.get("davalar", [])
    if izin is not None:
        davalar = [x for x in davalar if _dava_gkod(x) in izin]
    return JSONResponse({"guncel": d.get("guncel"), "davalar": davalar}, headers=BAS)


@router.get("/v1/davalar/evrak/{eid}")
def evrak(eid: str, request: Request):
    izin = _izinli_gruplar(request)
    if not ID.match(eid):
        raise HTTPException(400, "geçersiz")
    veri = _dizin_oku()
    if izin is not None and _ev_gkod_haritasi(veri).get(eid) not in izin:
        raise HTTPException(404, "yok")   # yetkisiz grubun evrakı: varlığını sızdırmamak için 404
    bilgi = veri.get("evrak", {}).get(eid)
    p = KOK / "e" / f"{eid}.sifreli"
    if not bilgi or not p.is_file():
        raise HTTPException(404, "yok")
    tur = bilgi.get("tur", "pdf")
    return Response(_coz(p), media_type=TURLER.get(tur, "application/octet-stream"),
                    headers={**BAS, "Content-Disposition": f'inline; filename="evrak_{eid}.{tur}"'})


@router.get("/v1/davalar/brifing")
def brifing(request: Request):
    """Dava brifingi (markdown). Sunucuda şifreli durur: /davalar/brifing.sifreli."""
    _yonetici(request)
    p = KOK / "brifing.sifreli"
    if not p.is_file():
        raise HTTPException(404, "brifing yok")
    return Response(_coz(p), media_type="text/markdown; charset=utf-8", headers=BAS)


NOTLAR = {"brifing", "yorumlar"}
GRUP_NOTLARI = {"brifing", "yorumlar", "bekleyen"}
GKOD_RE = re.compile(r"^[a-z0-9_]{1,30}$")


@router.get("/v1/davalar/not/{ad}")
def not_oku(ad: str, request: Request):
    """Davalar notları (markdown, şifreli): brifing, yorumlar. (Eski genel uç — tam yetki.)"""
    _yonetici(request)
    if ad not in NOTLAR:
        raise HTTPException(404, "yok")
    p = KOK / f"{ad}.sifreli"
    if not p.is_file():
        raise HTTPException(404, "not yok")
    return Response(_coz(p), media_type="text/markdown; charset=utf-8", headers=BAS)


@router.get("/v1/davalar/grup/{gkod}/not/{ad}")
def grup_not(gkod: str, ad: str, request: Request):
    """Grup bazlı not (brifing / yorumlar / bekleyen), markdown şifreli: /davalar/<gkod>_<ad>.sifreli.
    Yetki: tam yetkili her grubu; grup yetkilisi yalnız kendi grubunu okur.
    Samet brifing/yorumlar için eski genel dosyalara (brifing.sifreli / yorumlar.sifreli) geri dönülür."""
    izin = _izinli_gruplar(request)   # None = tümü; set = yalnız bu gruplar; aksi 401
    if ad not in GRUP_NOTLARI or not GKOD_RE.match(gkod):
        raise HTTPException(404, "yok")
    if izin is not None and gkod not in izin:
        raise HTTPException(404, "yok")   # yetkisiz grup: varlığını sızdırmamak için 404
    p = KOK / f"{gkod}_{ad}.sifreli"
    if not p.is_file() and gkod == "samet" and ad in ("brifing", "yorumlar"):
        p = KOK / f"{ad}.sifreli"   # eski genel dosyalar = Samet içeriği
    if not p.is_file():
        raise HTTPException(404, "not yok")
    return Response(_coz(p), media_type="text/markdown; charset=utf-8", headers=BAS)


# ---- UYAP doğrudan yükleme (26.11.2026) ----
# Tarayıcıda açık UYAP Kurum oturumundan indirilen evrak paketleri parça parça buraya gelir; kullanıcının bilgisayarına inmez.
# Geçici yükleme anahtarının yalnız SHA-256 özeti burada durur (anahtarın kendisi depoda yok); süre dolunca kapı kapanır.
# Parçalar alındığı anda dava anahtarıyla şifrelenir (/davalar_gelen/<ad>/<parça>.sifreli). İşleme: islem_davalar_uyap_isle.sh
import hashlib, hmac, time as _time
GELEN = Path(os.environ.get("AESUN_DAVALAR_GELEN", "/davalar_gelen"))
YUKLE_OZET = "060b3cfb1f547559c32ee91b56df3cb91001dd807d35f8fa30170880cac5582d"
YUKLE_SON = 1795813200          # 28.11.2026 00:00 (TSİ) sonrasında kapı kapalı
UYAP_KOKEN = "https://kurum.uyap.gov.tr"
AD_RE = re.compile(r"^[a-z0-9_]{3,60}$")


@router.post("/v1/davalar/uyap_yukle")
async def uyap_yukle(request: Request, t: str = "", ad: str = "", p: int = -1, son: int = 0):
    bas = {"Access-Control-Allow-Origin": UYAP_KOKEN, "Cache-Control": "no-store"}
    if _time.time() > YUKLE_SON or not hmac.compare_digest(hashlib.sha256(t.encode()).hexdigest(), YUKLE_OZET):
        return JSONResponse({"hata": "yetkisiz"}, status_code=401, headers=bas)
    if not AD_RE.match(ad) or not (0 <= p <= 99999):
        return JSONResponse({"hata": "geçersiz"}, status_code=400, headers=bas)
    govde = await request.body()
    if len(govde) > 12 * 1024 * 1024:
        return JSONResponse({"hata": "parça büyük"}, status_code=413, headers=bas)
    k = GELEN / ad
    k.mkdir(parents=True, exist_ok=True)
    n = os.urandom(12)
    (k / f"{p:05d}.sifreli").write_bytes(n + AESGCM(ANAHTAR.read_bytes()[:32]).encrypt(n, govde, None))
    if son:
        (k / "TAMAM").write_text(str(p + 1))
    return JSONResponse({"ok": True, "p": p, "boy": len(govde)}, headers=bas)
