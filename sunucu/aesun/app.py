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
import secrets as _secrets

VERI = Path(os.environ.get("AESUN_VERI", "/veri/epias-ptf"))
REPO = os.environ.get("AESUN_REPO", "https://github.com/ekinciomer-ai/epias-ptf.git")
TOKEN = os.environ.get("AESUN_GH_OKU", "")          # depo gizli olunca: yalnız okuma yetkili belirteç (root-only .env)
ARALIK = int(os.environ.get("AESUN_ESITLE_SN", "30"))
PARA = re.compile(r"(^|/)(fatura/|maden_maliyet|arsiv_f2pool_gelir|arsiv_btc_fiyat|pay_|gelir)")
ACIK = {"portal/veri.json", "n8n/canli_anahtar.json", "n8n/demo_durum.json"}   # zaten şifreli/özet ya da herkese açık içerik
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

@app.get("/v1/acik/{yol:path}")
def acik(yol: str, request: Request):
    if yol not in ACIK:
        raise HTTPException(404, "yok")
    p = VERI / yol
    if not p.is_file():
        raise HTTPException(404, "yok")
    return Response(p.read_bytes(), media_type="application/json", headers={"Cache-Control": "no-cache", "Access-Control-Allow-Origin": "*", "X-Veri-Sha": DURUM["sha"] or ""})

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


# ---------------- Veri deposu (eski cPanel veri.php ile uyumlu) ----------------
# Toplayıcılar (Pi, n8n, ns1 işleri) X-AE-Anahtar ile yazar/okur; özetler /veri/anahtarlar.json'da (yalnız SHA-256).
# Okuma ayrıca portal rol belirteciyle de yapılabilir (parasal dosyalar yalnız parasal/yönetici).
DEPO = Path(os.environ.get("AESUN_DEPO", "/veri/depo"))
ANAHTARLAR = Path(os.environ.get("AESUN_ANAHTARLAR", "/veri/anahtarlar.json"))
DEPO_YOL = re.compile(r"^[A-Za-z0-9_][A-Za-z0-9_./-]*\.json$")

def toplayici(req: Request):
    an = req.headers.get("x-ae-anahtar", "")
    if len(an) < 32:
        return None
    h = hashlib.sha256(an.encode()).hexdigest()
    try:
        for ad, oz in json.loads(ANAHTARLAR.read_text()).items():
            if hmac.compare_digest(str(oz).lower(), h):
                return ad
    except Exception:
        pass
    return None

def depo_yol(yol: str):
    if not yol or len(yol) > 200 or not DEPO_YOL.match(yol) or ".." in yol or "//" in yol or yol.startswith("portal/"):
        raise HTTPException(400, "Geçersiz yol")
    return yol

@app.api_route("/v1/veri", methods=["GET", "POST"])
@app.api_route("/api/veri.php", methods=["GET", "POST"])
async def veri(request: Request, a: str = "oku", yol: str = ""):
    DURUM["istek"] += 1
    yol = depo_yol(yol)
    kim = toplayici(request)
    if a == "oku":
        if not kim:
            r = roller(request)
            gerek = {"yonetici", "parasal"} if PARA.search(yol) else {"yonetici", "parasal", "monitoring"}
            if not r & gerek:
                DURUM["red"] += 1
                raise HTTPException(401, "Anahtar gerekli")
        for kok in (DEPO, VERI):
            p = kok / yol
            if p.is_file():
                return Response(p.read_bytes(), media_type="application/json",
                                headers={"X-AE-Guncel": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(p.stat().st_mtime)), "Cache-Control": "no-store"})
        raise HTTPException(404, "Yok: " + yol)
    if a == "yaz":
        if request.method != "POST":
            raise HTTPException(405, "POST")
        if not kim:
            DURUM["red"] += 1
            raise HTTPException(401, "Anahtar gerekli")
        g = await request.body()
        if len(g) > 20 * 1024 * 1024:
            raise HTTPException(413, "Çok büyük")
        try:
            json.loads(g)
        except Exception:
            raise HTTPException(400, "JSON değil")
        p = DEPO / yol
        p.parent.mkdir(parents=True, exist_ok=True)
        t = p.with_name(p.name + ".tmp" + _secrets.token_hex(4))
        t.write_bytes(g); os.replace(t, p)
        with open(DEPO.parent / "depo_yazim.log", "a") as f:
            f.write(f"{time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())}\t{kim}\t{yol}\t{len(g)}\n")
        return {"tamam": True}
    raise HTTPException(404, "Bilinmeyen işlem")
