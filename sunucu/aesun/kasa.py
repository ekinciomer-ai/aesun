"""Şifreli kasa. Değerler sunucunun açık anahtarıyla şifrelenip yazılır; bu kapsayıcı yazabilir ama ÇÖZEMEZ.
Çözme yalnız sunucuda root'a özel anahtarla yapılır (/opt/aesun/kasa_coz.sh). Değer hiçbir yanıtta, günlükte ya da hatada geri dönmez.
Biçim (sunucu/islem_sir_* ile aynı): {"ak": RSA-OAEP-SHA256(aes anahtarı), "ct": AES-256-CBC(PKCS7), "iv": hex}"""
import base64, json, os, re, time
from pathlib import Path
from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import JSONResponse
from cryptography.hazmat.primitives import hashes, padding, serialization
from cryptography.hazmat.primitives.asymmetric import padding as apad
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes

KASA = Path(os.environ.get("AESUN_KASA", "/veri/kasa"))
ACIK = Path(os.environ.get("AESUN_KASA_ACIK", "/kasa_acik.pem"))
AD = re.compile(r"^[a-z0-9_]{2,40}$")
router = APIRouter()
_roller = None   # app.py bağlar: roller(request) -> set


def bagla(roller_fn):
    global _roller
    _roller = roller_fn


def _yonetici(req: Request):
    if _roller is None or "yonetici" not in _roller(req):
        raise HTTPException(401, "yönetici girişi gerekli")


def _sifrele(deger: bytes) -> dict:
    acik = serialization.load_pem_public_key(ACIK.read_bytes())
    k, iv = os.urandom(32), os.urandom(16)
    p = padding.PKCS7(128).padder(); veri = p.update(deger) + p.finalize()
    e = Cipher(algorithms.AES(k), modes.CBC(iv)).encryptor(); ct = e.update(veri) + e.finalize()
    ak = acik.encrypt(k, apad.OAEP(mgf=apad.MGF1(hashes.SHA256()), algorithm=hashes.SHA256(), label=None))
    return {"ak": base64.b64encode(ak).decode(), "ct": base64.b64encode(ct).decode(), "iv": iv.hex()}


def _istenen():
    try:
        return json.loads((KASA / "istenen.json").read_text(encoding="utf-8"))
    except Exception:
        return {}


@router.get("/v1/kasa/liste")
def liste(request: Request):
    _yonetici(request)
    KASA.mkdir(parents=True, exist_ok=True)
    var = {}
    for f in KASA.glob("*.sifreli"):
        try:
            var[f.stem] = json.loads(f.read_text()).get("zaman", "")
        except Exception:
            pass
    ist = _istenen()
    adlar = sorted(set(var) | set(ist))
    return JSONResponse({"kayitlar": [{"ad": a, "aciklama": ist.get(a, ""), "girildi": a in var, "zaman": var.get(a, "")} for a in adlar]},
                        headers={"Cache-Control": "no-store"})


@router.post("/v1/kasa/yaz")
async def yaz(request: Request):
    _yonetici(request)
    try:
        g = json.loads(await request.body())
        ad, deger = str(g.get("ad", "")).strip().lower(), str(g.get("deger", ""))
    except Exception:
        raise HTTPException(400, "geçersiz istek")
    if not AD.match(ad):
        raise HTTPException(400, "ad yalnız küçük harf, rakam ve _ olabilir (2-40)")
    if not deger or len(deger) > 8192:
        raise HTTPException(400, "değer boş ya da çok uzun")
    KASA.mkdir(parents=True, exist_ok=True)
    kayit = _sifrele(deger.strip().encode("utf-8")); kayit["zaman"] = time.strftime("%Y-%m-%dT%H:%M:%S%z")
    hedef = KASA / f"{ad}.sifreli"
    if hedef.exists():   # eski değer silinmez, arşive alınır
        (KASA / "arsiv").mkdir(exist_ok=True)
        hedef.rename(KASA / "arsiv" / f"{ad}.{int(time.time())}.sifreli")
    gecici = hedef.with_suffix(".tmp"); gecici.write_text(json.dumps(kayit)); os.chmod(gecici, 0o600); gecici.rename(hedef)
    return {"tamam": True, "ad": ad, "zaman": kayit["zaman"]}
