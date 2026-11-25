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
    _yonetici(request)
    d = _dizin_oku()
    return JSONResponse({"guncel": d.get("guncel"), "davalar": d.get("davalar", [])}, headers=BAS)


@router.get("/v1/davalar/evrak/{eid}")
def evrak(eid: str, request: Request):
    _yonetici(request)
    if not ID.match(eid):
        raise HTTPException(400, "geçersiz")
    bilgi = _dizin_oku().get("evrak", {}).get(eid)
    p = KOK / "e" / f"{eid}.sifreli"
    if not bilgi or not p.is_file():
        raise HTTPException(404, "yok")
    tur = bilgi.get("tur", "pdf")
    return Response(_coz(p), media_type=TURLER.get(tur, "application/octet-stream"),
                    headers={**BAS, "Content-Disposition": f'inline; filename="evrak_{eid}.{tur}"'})
