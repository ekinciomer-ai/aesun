"""aesun-api: AEMonitoring merkez veri servisi (ns1).

v1: epias-ptf deposunun sığ kopyasını 30 sn'de bir eşitler ve dosyaları YALNIZ portal yetkisi olanlara sunar.
Yetki: tarayıcı, portal oturumundaki anahtardan türettiği belirteci X-AE-Anahtar başlığıyla gönderir; sunucu
belirtecin SHA-256 özetini portal/veri.json → api_ozet içindeki rollerle karşılaştırır (belirtecin kendisi hiçbir yerde saklanmaz).
Roller: yonetici (her şey), parasal (parasal dosyalar dahil), monitoring (parasal hariç).
"""
import hashlib, hmac, json, os, re, subprocess, threading, time
from pathlib import Path
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, Response

VERI = Path(os.environ.get("AESUN_VERI", "/veri/epias-ptf"))
REPO = os.environ.get("AESUN_REPO", "https://github.com/ekinciomer-ai/epias-ptf.git")
TOKEN = os.environ.get("AESUN_GH_OKU", "")          # depo gizli olunca: yalnız okuma yetkili belirteç (root-only .env)
ARALIK = int(os.environ.get("AESUN_ESITLE_SN", "30"))
PARA = re.compile(r"(^|/)(fatura/|maden_maliyet|arsiv_f2pool_gelir|arsiv_btc_fiyat|pay_|gelir)")
IZINLI = re.compile(r"^[A-Za-z0-9_\-./]+\.(json|csv)$")
DURUM = {"sha": None, "son": 0.0, "hata": None, "ozet": {}, "basla": time.time(), "istek": 0, "red": 0}

def _git(*a, cwd=None):
    url = REPO if not TOKEN else REPO.replace("https://", f"https://x-access-token:{TOKEN}@")
    a = [x.replace("{URL}", url) for x in a]
    r = subprocess.run(["git", *a], cwd=cwd, capture_output=True, text=True, timeout=120)
    if r.returncode:
        raise RuntimeError((r.stderr or r.stdout).replace(TOKEN, "***")[-300:] if TOKEN else (r.stderr or r.stdout)[-300:])
    return r.stdout.strip()

def esitle():
    if not (VERI / ".git").exists():
        VERI.parent.mkdir(parents=True, exist_ok=True)
        _git("clone", "--depth", "1", "--single-branch", "--branch", "main", "{URL}", str(VERI))
    else:
        _git("fetch", "--depth", "1", "{URL}", "main", cwd=VERI)
        _git("reset", "--hard", "FETCH_HEAD", cwd=VERI)
    _git("reflog", "expire", "--expire=now", "--all", cwd=VERI)
    DURUM["sha"] = _git("rev-parse", "--short", "HEAD", cwd=VERI)
    try:
        DURUM["ozet"] = {k: str(v).lower() for k, v in (json.loads((VERI / "portal/veri.json").read_text()).get("api_ozet") or {}).items() if isinstance(v, str) and len(v) == 64}
    except Exception as e:
        DURUM["hata"] = "veri.json: " + str(e)[:100]
    DURUM["son"] = time.time()

def dongu():
    sayac = 0
    while True:
        try:
            esitle(); DURUM["hata"] = None
            sayac += 1
            if sayac % 120 == 0:
                subprocess.run(["git", "gc", "--prune=now", "-q"], cwd=VERI, timeout=300)
        except Exception as e:
            DURUM["hata"] = str(e)[:300]
        time.sleep(ARALIK)

app = FastAPI(title="aesun-api", docs_url=None, redoc_url=None, openapi_url=None)
app.add_middleware(CORSMiddleware, allow_origins=["https://portal.aksarayenerji.net", "https://aksarayenerji.net"],
                   allow_methods=["GET"], allow_headers=["X-AE-Anahtar"], max_age=3600)

@app.on_event("startup")
def basla():
    threading.Thread(target=dongu, daemon=True).start()

def roller(req: Request):
    t = req.headers.get("x-ae-anahtar", "")
    if len(t) < 32:
        return set()
    h = hashlib.sha256(t.encode()).hexdigest()
    return {r for r, v in DURUM["ozet"].items() if hmac.compare_digest(v, h)}

@app.get("/v1/saglik")
def saglik():
    return {"durum": "ok" if not DURUM["hata"] and time.time() - DURUM["son"] < 5 * ARALIK else "sorun",
            "veri_sha": DURUM["sha"], "esitleme_sn_once": round(time.time() - DURUM["son"]) if DURUM["son"] else None,
            "hata": DURUM["hata"], "rol_sayisi": len(DURUM["ozet"]), "istek": DURUM["istek"], "red": DURUM["red"],
            "calisma_sn": round(time.time() - DURUM["basla"])}

@app.get("/v1/dosya/{yol:path}")
def dosya(yol: str, request: Request):
    DURUM["istek"] += 1
    if ".." in yol or not IZINLI.match(yol):
        raise HTTPException(400, "geçersiz yol")
    r = roller(request)
    gerek = {"yonetici", "parasal"} if PARA.search(yol) else {"yonetici", "parasal", "monitoring"}
    if not r & gerek:
        DURUM["red"] += 1
        raise HTTPException(401 if not r else 403, "yetki yok")
    p = (VERI / yol).resolve()
    if not str(p).startswith(str(VERI.resolve()) + "/") or not p.is_file():
        raise HTTPException(404, "yok")
    st = p.stat(); etag = '"%x-%x"' % (int(st.st_mtime), st.st_size)
    if request.headers.get("if-none-match") == etag:
        return Response(status_code=304, headers={"ETag": etag})
    return Response(p.read_bytes(), media_type="application/json" if yol.endswith(".json") else "text/csv",
                    headers={"ETag": etag, "Cache-Control": "private, no-cache", "X-Veri-Sha": DURUM["sha"] or ""})
