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
ACIK = {"portal/veri.json", "n8n/canli_anahtar.json"}   # zaten şifreli/özet ya da herkese açık içerik
ACIK_DESEN = re.compile(r"^n8n/wp/plan_\d{4}-\d{2}-\d{2}\.png$")
IZINLI = re.compile(r"^[A-Za-z0-9_\-./]+\.(json|csv)$")
GIT_KILIT = threading.Lock()
DURUM = {"sha": None, "son": 0.0, "hata": None, "ozet": {}, "basla": time.time(), "istek": 0, "red": 0}

def _git(*a, cwd=None):
    url = REPO if not TOKEN else REPO.replace("https://", f"https://x-access-token:{TOKEN}@")
    a = [x.replace("{URL}", url) for x in a]
    r = subprocess.run(["git", *a], cwd=cwd, capture_output=True, text=True, timeout=120)
    if r.returncode:
        raise RuntimeError((r.stderr or r.stdout).replace(TOKEN, "***")[-300:] if TOKEN else (r.stderr or r.stdout)[-300:])
    return r.stdout.strip()

def _ozet_yukle():
    try:
        DURUM["ozet"] = {k: str(v).lower() for k, v in (json.loads((VERI / "portal/veri.json").read_text()).get("api_ozet") or {}).items() if isinstance(v, str) and len(v) == 64}
    except Exception as e:
        DURUM["hata"] = "veri.json: " + str(e)[:100]

def esitle():
    with GIT_KILIT:
        if not (VERI / ".git").exists():
            VERI.parent.mkdir(parents=True, exist_ok=True)
            _git("clone", "--depth", "1", "--single-branch", "--branch", "main", "{URL}", str(VERI))
        else:
            _git("fetch", "--depth", "1", "{URL}", "main", cwd=VERI)
            _git("reset", "--hard", "FETCH_HEAD", cwd=VERI)
        _git("reflog", "expire", "--expire=now", "--all", cwd=VERI)
        DURUM["sha"] = _git("rev-parse", "--short", "HEAD", cwd=VERI)
        _ozet_yukle()
        DURUM["son"] = time.time()

def dongu():
    sayac = 0
    while True:
        try:
            esitle(); DURUM["hata"] = None
            sayac += 1
            if sayac % 120 == 0:
                with GIT_KILIT:
                    subprocess.run(["git", "gc", "--prune=now", "-q"], cwd=VERI, timeout=300)
        except Exception as e:
            DURUM["hata"] = str(e)[:300]
        time.sleep(ARALIK)

app = FastAPI(title="aesun-api", docs_url=None, redoc_url=None, openapi_url=None)
app.add_middleware(CORSMiddleware, allow_origins=["https://portal.aksarayenerji.net", "https://aksarayenerji.net", "https://ekinciomer-ai.github.io"],
                   allow_methods=["GET", "POST"], allow_headers=["X-AE-Anahtar", "Content-Type"], max_age=3600)

@app.get("/v1/acik/{yol:path}")
def acik(yol: str, request: Request):
    if yol not in ACIK and not ACIK_DESEN.match(yol):
        raise HTTPException(404, "yok")
    p = (VERI / yol).resolve()
    if not str(p).startswith(str(VERI.resolve()) + "/") or not p.is_file():
        raise HTTPException(404, "yok")
    mt = "image/png" if yol.endswith(".png") else "application/json"
    return Response(p.read_bytes(), media_type=mt, headers={"Cache-Control": "no-cache", "Access-Control-Allow-Origin": "*", "X-Veri-Sha": DURUM["sha"] or ""})

@app.post("/v1/portal/veri")
async def portal_veri_yaz(request: Request, mesaj: str = "güncelleme"):
    DURUM["istek"] += 1
    r = roller(request)
    if "yonetici" not in r:
        DURUM["red"] += 1
        raise HTTPException(401 if not r else 403, "yönetici yetkisi gerekli")
    g = await request.body()
    if len(g) > 2 * 1024 * 1024:
        raise HTTPException(413, "çok büyük")
    try:
        v = json.loads(g)
        if not isinstance(v, dict) or not all(k in v for k in ("kullanicilar", "moduller", "rehber", "kul_tuz")):
            raise ValueError("eksik alan")
    except Exception:
        raise HTTPException(400, "geçersiz portal verisi")
    icerik = json.dumps(v, ensure_ascii=False, indent=1).encode("utf-8")
    temiz_mesaj = re.sub(r"[\r\n]+", " ", str(mesaj or "güncelleme")).strip()[:80] or "güncelleme"
    try:
        with GIT_KILIT:
            if (VERI / ".git").exists():
                _git("fetch", "--depth", "1", "{URL}", "main", cwd=VERI)
                _git("reset", "--hard", "FETCH_HEAD", cwd=VERI)
            hedef = VERI / "portal/veri.json"
            hedef.parent.mkdir(parents=True, exist_ok=True)
            hedef.write_bytes(icerik)
            _ozet_yukle()
            _git("config", "user.name", "aesun-bot", cwd=VERI)
            _git("config", "user.email", "aesun-bot@users.noreply.github.com", cwd=VERI)
            _git("add", "portal/veri.json", cwd=VERI)
            if subprocess.run(["git", "diff", "--cached", "--quiet"], cwd=VERI).returncode != 0:
                _git("commit", "-m", "portal: " + temiz_mesaj, cwd=VERI)
                _git("push", "{URL}", "HEAD:main", cwd=VERI)
                DURUM["sha"] = _git("rev-parse", "--short", "HEAD", cwd=VERI)
            DURUM["son"] = time.time()
    except Exception as e:
        raise HTTPException(502, "git yazılamadı: " + str(e)[:180])
    return {"tamam": True, "sha": DURUM["sha"]}

@app.on_event("startup")
def basla():
    threading.Thread(target=dongu, daemon=True).start()

def roller(req: Request):
    t = req.headers.get("x-ae-anahtar", "")
    if len(t) < 32:
        return set()
    h = hashlib.sha256(t.encode()).hexdigest()
    return {r for r, v in DURUM["ozet"].items() if hmac.compare_digest(v, h)}

# ---- Müşteri Monitoring (AEMonitoring'den ayrı veri: /musteri, aesun-musteri kapsayıcısı yazar) ----
MUSTERI = Path(os.environ.get("MUSTERI_VERI", "/musteri"))
MUSTERI_DOSYA = re.compile(r"^(son|reaktif|gun_\d{8}|ay_\d{6}|yil_\d{4})\.json$")

def musteri_sidler(req: Request):
    """Yönetici: tüm santraller. Müşteri kullanıcısı: yalnız rolündeki santraller (ms_<sid>)."""
    r = roller(req)
    if "yonetici" in r:
        try:
            return set(json.loads((MUSTERI / "santraller.json").read_text()).keys()), True
        except Exception:
            return set(), True
    return {x[3:] for x in r if x.startswith("ms_")}, False

@app.get("/v1/musteri/liste")
def musteri_liste(request: Request):
    DURUM["istek"] += 1
    sidler, yon = musteri_sidler(request)
    if not sidler and not yon:
        DURUM["red"] += 1
        raise HTTPException(401, "yetki yok")
    out = []
    for sid in sorted(sidler):
        p = MUSTERI / sid / "son.json"
        if p.is_file():
            out.append(json.loads(p.read_text()))
    d = {"santraller": out}
    if yon:
        try:
            d["toplayici"] = json.loads((MUSTERI / "durum.json").read_text())
        except Exception:
            d["toplayici"] = None
    return JSONResponse(d, headers={"Cache-Control": "no-store"})

@app.get("/v1/musteri/{sid}/{dosya}")
def musteri_dosya(sid: str, dosya: str, request: Request):
    DURUM["istek"] += 1
    if not sid.isdigit() or not MUSTERI_DOSYA.match(dosya):
        raise HTTPException(404, "yok")
    sidler, _ = musteri_sidler(request)
    if sid not in sidler:
        DURUM["red"] += 1
        raise HTTPException(403, "bu santrale yetki yok")
    p = MUSTERI / sid / dosya
    if not p.is_file():
        raise HTTPException(404, "yok")
    return Response(p.read_bytes(), media_type="application/json", headers={"Cache-Control": "no-store"})

@app.get("/v1/bekci")
def bekci_durum():
    """ns1 sistem bekçisinin son turu (host zamanlayıcısı yazar). Yalnız iş/servis tazeliği; sır yok."""
    p = Path("/veri/bekci_ns1.json")
    if not p.is_file():
        raise HTTPException(404, "bekçi henüz çalışmadı")
    d = json.loads(p.read_text()); d["yas_sn"] = round(time.time() - p.stat().st_mtime)
    return JSONResponse(d, headers={"Cache-Control": "no-store", "Access-Control-Allow-Origin": "*"})

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


# ---------------- Bağımsız demo · Mining Takip Sistemi (yalnız IP adresinden, Caddy basic_auth arkasında) ----------------
# Alan adı üzerinden erişilemez: Host başlığı yalnız DEMO_HOST olduğunda yanıt verir (Caddy o siteyi basic_auth ile korur).
DEMO_HOST = os.environ.get("AESUN_DEMO_HOST", "185.22.184.51")
DEMO_SAYFA = Path(__file__).with_name("demo") / "index.html"
DEMO_ALAN = ("guncellendi", "mod", "karar", "durum", "ozet", "plan", "olaylar", "sonraki", "ogrenme")

def demo_kapi(req: Request):
    if req.headers.get("host", "").split(":")[0] != DEMO_HOST:
        raise HTTPException(404, "yok")

DEMO_BAS = {"Cache-Control": "no-store", "X-Robots-Tag": "noindex, nofollow", "X-Frame-Options": "DENY", "Referrer-Policy": "no-referrer"}

@app.get("/")
def demo_ana(request: Request):
    demo_kapi(request)
    return HTMLResponse(DEMO_SAYFA.read_text(encoding="utf-8"), headers=DEMO_BAS)

@app.get("/veri.json")
def demo_veri(request: Request):
    demo_kapi(request)
    try:
        d = json.loads((VERI / "n8n/demo_durum.json").read_text())
    except Exception:
        raise HTTPException(503, "veri hazır değil")
    out = {k: d[k] for k in DEMO_ALAN if k in d}
    try:
        out["saha"] = demo_saha()
    except Exception:
        out["saha"] = None
    return JSONResponse(out, headers=DEMO_BAS)

# Demo saha şeması: kabin dağılımı (19 Eki saha notu), cihaz durumu (numara sırasıyla), cihaz gücü, Sera-2 inverterleri ve string güçleri.
# IP, seri no, MAC, havuz adı, konum, fiyat paylaşılmaz.
DEMO_KABIN = {"1": [23, 2, 3], "2": [17, 5, 7, 8], "3": [29, 28, 26, 11], "4": [1, 12, 10, 9], "5": [], "6": [6, 14, 15, 16],
              "7": [21, 22, 24, 25], "8": [18, 19, 20], "9": [4, 27, 13]}
DEMO_MODEL_W = {"S21e Hyd": 5300, "S19 XP+ Hyd": 5300, "S19e XP Hyd": 5830}

def _oku(yol):
    try:
        return json.loads((VERI / yol).read_text())
    except Exception:
        return {}

def demo_saha():
    mad = _oku("antminer_panel.json"); det = (_oku("n8n/cihaz_detay.json").get("cihaz") or {}); kim = _oku("n8n/cihaz_kimlik.json")
    md = {}
    for c in mad.get("devices") or []:
        no = str(c.get("actual_worker") or "").split(".")[-1]
        if no.isdigit():
            md[int(no)] = c
    def cihaz(n):
        c = md.get(n) or {}; o = det.get(f"{n:03d}") or {}
        th = float(c.get("hashrate_TH") or 0) if c.get("online") and not c.get("sleeping") else 0.0
        d = "u" if c.get("sleeping") else "c" if (c.get("online") and th > 1) else "i" if c.get("online") else "x"
        model = o.get("model") if o.get("model") not in (None, "", "?") else (kim.get(f"{n:03d}") or {}).get("model", "?")
        w = ((o.get("diger") or {}).get("watt") or DEMO_MODEL_W.get(model, 5300)) if d == "c" else 0
        return {"no": n, "d": d, "kw": round(w / 1000, 2), "th": round(th), "m": str(model).replace(" Hyd", ""), "t": c.get("temp_max")}
    kabin = {k: [cihaz(n) for n in v] for k, v in DEMO_KABIN.items()}
    fs = _oku("n8n/fusionsolar_son.json"); inv = []
    sera2 = [v for v in (fs.get("invertorler") or {}).values() if v.get("tesis") == "Sera-2"]
    def sira(v):
        m = re.search(r"(\d+)\s*$", str(v.get("ad") or "")); return int(m.group(1)) if m else 99
    for v in sorted(sera2, key=sira):
        pv = [[n, round((V or 0) * (A or 0) / 1000, 2)] for n, V, A in (v.get("pv") or [])]
        inv.append({"ad": "INV-%02d" % sira(v), "kw": round(float(v.get("guc_kw") or 0), 1), "on": "ebeke" in str(v.get("durum") or ""),
                    "nom": v.get("nominal_kw") or 100, "t": v.get("sicaklik_c"), "pv": pv})
    durum_no = "".join(cihaz(n)["d"] for n in range(1, 30))
    return {"kabin": kabin, "inv": inv, "durum_no": durum_no, "t": fs.get("guncelleme")}
