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


# ---------------- Tek giriş (SSO) · fatura.aksarayenerji.net ----------------
# Akış: portal → https://fatura…/sso#t=<rol belirteci>&r=<rol>  (parça: sunucu günlüğüne düşmez)
#   /sso sayfası belirteci POST /sso/giris'e yollar → SHA-256 özeti veri.json api_ozet ile karşılaştırılır
#   → HttpOnly imzalı çerez (ae_sso) → Caddy forward_auth her istekte GET /v1/sso/dogrula ile çerezi doğrular.
# İmza anahtarı sunucuda üretilir (/veri/sso_sir, root-only); belirtecin kendisi hiçbir yerde saklanmaz.
from fastapi.responses import HTMLResponse, RedirectResponse
SSO_SIR_YOL = Path(os.environ.get("AESUN_SSO_SIR", "/veri/sso_sir"))
SSO_ROL = {"fatura", "yonetici", "parasal"}
SSO_SURE = int(os.environ.get("AESUN_SSO_SN", str(14 * 24 * 3600)))
SSO_PORTAL = "https://portal.aksarayenerji.net/?git=fatura"
COOKIE = "ae_sso"

def sso_sir():
    try:
        s = SSO_SIR_YOL.read_bytes()
        if len(s) >= 32:
            return s
    except Exception:
        pass
    s = _secrets.token_bytes(32)
    SSO_SIR_YOL.parent.mkdir(parents=True, exist_ok=True)
    SSO_SIR_YOL.write_bytes(s); os.chmod(SSO_SIR_YOL, 0o600)
    return s

def sso_imzala(rol: str, son: int):
    g = f"{rol}.{son}"
    return g + "." + hmac.new(sso_sir(), g.encode(), hashlib.sha256).hexdigest()

def sso_coz(c: str):
    try:
        rol, son, im = c.split(".")
        if rol not in SSO_ROL or int(son) < time.time():
            return None
        if not hmac.compare_digest(hmac.new(sso_sir(), f"{rol}.{son}".encode(), hashlib.sha256).hexdigest(), im):
            return None
        return rol
    except Exception:
        return None

SSO_SAYFA = """<!doctype html><html lang="tr"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Fatura · giriş</title><style>body{font:16px system-ui,sans-serif;color:#1C1F24;background:#F3F4F6;display:grid;place-items:center;min-height:100vh;margin:0}
.k{background:#fff;border-radius:16px;padding:28px 32px;box-shadow:0 2px 8px rgba(0,0,0,.08);text-align:center;max-width:360px}.k b{display:block;font-size:18px;margin-bottom:6px}
.k p{color:#6B7280;margin:0}.k a{display:inline-block;margin-top:14px;color:#E8622A;font-weight:700}</style>
<div class="k"><b id="b">Giriş yapılıyor…</b><p id="p">Portal oturumunuz doğrulanıyor.</p><a id="a" href="PORTAL" style="display:none">Portala dön</a></div>
<script>(function(){var q=new URLSearchParams(location.hash.slice(1)),t=q.get('t')||'',r=q.get('r')||'';history.replaceState(null,'',location.pathname);
function hata(m){document.getElementById('b').textContent='Giriş yapılamadı';document.getElementById('p').textContent=m;document.getElementById('a').style.display='inline-block';}
if(!t){hata('Bu sayfa portaldan açılmalı.');return;}
fetch('/sso/giris',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({t:t,r:r}),credentials:'same-origin'}).then(function(x){return x.json().catch(function(){return {};}).then(function(j){return [x.status,j];});})
.then(function(a){if(a[0]===200&&a[1].tamam){try{localStorage.clear();sessionStorage.clear();}catch(e){} /* GesFin'in süresi dolmuş eski oturumu kalmasın */
location.replace('/');}else hata(a[1].hata||('HTTP '+a[0]));}).catch(function(){hata('Sunucuya ulaşılamadı.');});})();</script></html>"""

@app.get("/sso")
def sso_sayfa():
    return HTMLResponse(SSO_SAYFA.replace("PORTAL", SSO_PORTAL), headers={"Cache-Control": "no-store"})

@app.post("/sso/giris")
async def sso_giris(request: Request):
    DURUM["istek"] += 1
    try:
        g = json.loads(await request.body())
        t = str(g.get("t", ""))
    except Exception:
        raise HTTPException(400, "JSON değil")
    if len(t) < 32 or len(t) > 200:
        raise HTTPException(400, "belirteç yok")
    h = hashlib.sha256(t.encode()).hexdigest()
    rol = next((r for r, v in DURUM["ozet"].items() if r in SSO_ROL and hmac.compare_digest(v, h)), None)
    if not rol:
        DURUM["red"] += 1
        return JSONResponse({"tamam": False, "hata": "Portal belirteci tanınmadı. Portalda Fatura yetkiniz yoksa yöneticinize başvurun."}, status_code=401)
    son = int(time.time()) + SSO_SURE
    r = JSONResponse({"tamam": True, "rol": rol})
    r.set_cookie(COOKIE, sso_imzala(rol, son), max_age=SSO_SURE, httponly=True, secure=True, samesite="lax", path="/")
    return r

@app.get("/v1/sso/dogrula")
def sso_dogrula(request: Request):
    rol = sso_coz(request.cookies.get(COOKIE, ""))
    if rol:
        return Response(status_code=204, headers={"X-AE-Rol": rol})
    uri = request.headers.get("x-forwarded-uri", "/")
    # tarayıcı gezintisi → portala yönlendir; XHR/API → 401
    if "text/html" in request.headers.get("accept", "") and not uri.startswith("/api/"):
        return RedirectResponse(SSO_PORTAL, status_code=302)
    return JSONResponse({"hata": "portal girişi gerekli"}, status_code=401)

@app.get("/sso/cikis")
def sso_cikis():
    r = RedirectResponse("https://portal.aksarayenerji.net/", status_code=302)
    r.delete_cookie(COOKIE, path="/")
    return r
