#!/usr/bin/env python3
"""AVY · Arazi Veri Yönetimi (Aksaray Enerji) — Portal Tek Giriş (SSO) + Türkçe arayüz sarmalayıcısı.

belluxx/aleph (alephgeo) çekirdeğini değiştirmeden 0.0.0.0:8100 üzerinde çalıştırır:
  - Yalnız Aksaray Enerji Portal yöneticisi (veya 'avy' yetkisi olan kullanıcı) erişebilir.
  - Şifre sorulmaz: Portal'daki sıfır-bilgi api_ozet (SHA-256(SHA-256('aesun-api|rol|anahtar'))) ile doğrulanır.
  - Doğrulanan tarayıcıya 14 günlük HttpOnly + Secure HMAC çerezi (ae_avy_sso) verilir.
"""
import hashlib
import hmac
import http.cookies
import http.server
import json
import os
import re
import secrets
import ssl
import sys
import threading
import time
import urllib.request
from pathlib import Path
from urllib.parse import parse_qs, unquote, urlsplit

import alephgeo.dashboard as d

PORTAL_URL = os.environ.get("AVY_PORTAL_URL", "https://portal.aksarayenerji.net")
VERI_URL = os.environ.get("AVY_VERI_URL", "https://api.aksarayenerji.net/v1/acik/portal/veri.json")
CEREZ_AD = "ae_avy_sso"
CEREZ_OMUR = 14 * 86400
IZINLI_ROLLER = ("yonetici", "avy")

# TLS bağlamı (sistem sertifika deposu varsa kullan)
try:
    import truststore
    TLS_CTX = truststore.SSLContext(ssl.PROTOCOL_TLS_CLIENT)
except Exception:
    TLS_CTX = ssl.create_default_context()


def _sir_yukle() -> bytes:
    """HMAC çerez imzalama sırrını kalıcı önbellek dizininde (0600) tutar; yoksa bellekte üretir."""
    hedef = Path(os.environ.get("AVY_SIR_DOSYA", "/veri/cache/.avy_sso_sir"))
    try:
        if hedef.is_file():
            veri = bytes.fromhex(hedef.read_text(encoding="ascii").strip())
            if len(veri) >= 32:
                return veri
        hedef.parent.mkdir(parents=True, exist_ok=True)
        yeni = secrets.token_bytes(32)
        fd = os.open(str(hedef), os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600)
        with os.fdopen(fd, "w", encoding="ascii") as f:
            f.write(yeni.hex())
        return yeni
    except OSError:
        return secrets.token_bytes(32)


SSO_SIR = _sir_yukle()
_OZET_KILIT = threading.Lock()
_OZET_ONBELLEK = {"zaman": 0.0, "veri": {}}


def api_ozet_getir() -> dict:
    """Merkez API'den portal veri.json içindeki api_ozet sözlüğünü 60 sn önbellekle okur."""
    simdi = time.time()
    with _OZET_KILIT:
        if simdi - _OZET_ONBELLEK["zaman"] < 60 and _OZET_ONBELLEK["veri"]:
            return _OZET_ONBELLEK["veri"]
    try:
        istek = urllib.request.Request(
            f"{VERI_URL}?_t={int(simdi)}",
            headers={"User-Agent": "aesun-avy-sso/1.0", "Accept": "application/json"},
        )
        with urllib.request.urlopen(istek, context=TLS_CTX, timeout=8) as yanit:
            veri = json.loads(yanit.read(500_000).decode("utf-8"))
        ozet = veri.get("api_ozet") if isinstance(veri, dict) else None
        if isinstance(ozet, dict) and ozet:
            with _OZET_KILIT:
                _OZET_ONBELLEK["zaman"] = simdi
                _OZET_ONBELLEK["veri"] = ozet
            return ozet
    except Exception as hata:
        print(f"avy sso: veri.json okunamadı: {hata}", file=sys.stderr)
    with _OZET_KILIT:
        return _OZET_ONBELLEK["veri"]


def belirtec_dogrula(belirtec: str) -> str | None:
    """Portal'dan gelen 64 haneli SHA-256 belirtecinin özetini api_ozet ile sabit zamanda karşılaştırır."""
    t = (belirtec or "").strip().lower()
    if len(t) != 64 or any(c not in "0123456789abcdef" for c in t):
        return None
    aday = hashlib.sha256(t.encode("ascii")).hexdigest()
    ozet = api_ozet_getir()
    for rol in IZINLI_ROLLER:
        beklenen = str(ozet.get(rol) or "").strip().lower()
        if len(beklenen) == 64 and hmac.compare_digest(aday, beklenen):
            return rol
    return None


def cerez_uret(rol: str) -> str:
    son = int(time.time()) + CEREZ_OMUR
    govde = f"{rol}.{son}"
    imza = hmac.new(SSO_SIR, govde.encode("ascii"), hashlib.sha256).hexdigest()
    return f"{govde}.{imza}"


def cerez_dogrula(ham_cookie: str) -> str | None:
    if not ham_cookie:
        return None
    try:
        c = http.cookies.SimpleCookie()
        c.load(ham_cookie)
        morsel = c.get(CEREZ_AD)
        if not morsel:
            return None
        parcalar = morsel.value.split(".")
        if len(parcalar) != 3:
            return None
        rol, son_s, imza = parcalar
        if rol not in IZINLI_ROLLER:
            return None
        son = int(son_s)
        if time.time() >= son:
            return None
        beklenen = hmac.new(SSO_SIR, f"{rol}.{son}".encode("ascii"), hashlib.sha256).hexdigest()
        return rol if hmac.compare_digest(imza, beklenen) else None
    except Exception:
        return None


FAVICON_DATA = (
    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E"
    "%3Cpath d='M32 4a28 28 0 0 0 0 56z' fill='%23D7262E'/%3E"
    "%3Cpath d='M32 4a28 28 0 0 1 0 56z' fill='%232B2F35'/%3E"
    "%3Cpath d='M36 10 20 36h11l-4 18 18-28H34z' fill='%23fff'/%3E%3C/svg%3E"
)

MARKA_HEADER = f"""    <header class="brand avy-brand">
      <a href="#/" aria-label="AVY · Arazi Veri Yönetimi, tüm kayıtlar">
        <svg class="logo" viewBox="0 0 64 64" aria-hidden="true">
          <path d="M32 4a28 28 0 0 0 0 56z" fill="#D7262E"/>
          <path d="M32 4a28 28 0 0 1 0 56z" fill="#2B2F35"/>
          <path d="M36 10 20 36h11l-4 18 18-28H34z" fill="#fff"/>
        </svg>
        <span class="avy-baslik"><b>AVY</b><small>Arazi Veri Yönetimi</small></span>
      </a>
      <a class="avy-portal-bag" href="{PORTAL_URL}/" title="Aksaray Enerji Portal'a dön">← Portal</a>
    </header>"""

EK_STIL = """
/* AVY · Arazi Veri Yönetimi — Aksaray Enerji Kurumsal Uyarlama */
:root { --accent: #D32027; }
@media (prefers-color-scheme: dark) { :root { --accent: #E53935; --on-accent: #fff; } }
.avy-brand { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 12px 18px; }
.avy-baslik { display: flex; flex-direction: column; line-height: 1.12; }
.avy-baslik b { font-size: 17px; font-weight: 800; letter-spacing: .04em; }
.avy-baslik small { font-size: 11px; font-weight: 500; color: var(--muted); letter-spacing: .02em; margin-top: 2px; }
.avy-portal-bag {
  font: 600 11.5px/1 var(--sans) !important;
  padding: 6px 10px;
  border: 1px solid var(--line);
  border-radius: 999px;
  color: var(--muted);
  background: var(--surface);
  white-space: nowrap;
}
.avy-portal-bag:hover { border-color: var(--accent); color: var(--accent); }
"""

HTML_CEVIRILER = (
    ('<html lang="en">', '<html lang="tr">'),
    ('<title>Aleph</title>', '<title>AVY · Arazi Veri Yönetimi · Aksaray Enerji</title>'),
    ('<h1>Captures <span id="capture-count" class="count"></span></h1>',
     '<h1>Arazi Kayıtları <span id="capture-count" class="count"></span></h1>'),
    ('title="Captures folder"><span class="label">Folder</span>',
     'title="Kayıt klasörü"><span class="label">Klasör</span>'),
    ('<a class="button primary wide" href="#/new">New capture</a>',
     '<a class="button primary wide" href="#/new">+ Yeni Arazi Çekimi</a>'),
    ('<a class="back" href="#/">← Captures</a>',
     '<a class="back" href="#/">← Arazi Kayıtları</a>'),
    ('<h1>New capture</h1>', '<h1>Yeni Arazi Çekimi</h1>'),
    ('<h2 class="label">Area</h2>', '<h2 class="label">Bölge Seçimi</h2>'),
    ('<div class="field shape"><span>Shape</span>', '<div class="field shape"><span>Çizim Şekli</span>'),
    ('<i data-icon="rectangle"></i>Rectangle', '<i data-icon="rectangle"></i>Dikdörtgen'),
    ('<i data-icon="polygon"></i>Polygon', '<i data-icon="polygon"></i>Poligon'),
    ('<button id="redraw" type="button" class="small">Redraw</button>',
     '<button id="redraw" type="button" class="small">Yeniden Çiz</button>'),
    ('<h2 class="label">Sources</h2>', '<h2 class="label">Veri Katmanları</h2>'),
    ('<i data-icon="warning"></i>Google data', '<i data-icon="warning"></i>Veri Kaynağı Notu'),
    ("Street View, satellite imagery, and 3D meshes are © Google and its providers. Downloading them goes against Google's terms. You are responsible for how you use them.",
     "Sokak görünümü, uydu görüntüsü ve 3B modeller © Google ve sağlayıcılarına aittir; mühendislik ön inceleme amaçlıdır."),
    ('<i data-icon="streetview"></i><span>Street View</span>',
     '<i data-icon="streetview"></i><span>Sokak Görünümü</span>'),
    ('<label class="field"><span>Roads</span>', '<label class="field"><span>Yol Kapsamı</span>'),
    ('value="main"><span>Main</span>', 'value="main"><span>Ana Yollar</span>'),
    ('value="roads"><span>Roads</span>', 'value="roads"><span>Yollar</span>'),
    ('value="all"><span>All paths</span>', 'value="all"><span>Tümü</span>'),
    ('<span>Spacing</span>', '<span>Adım Aralığı</span>'),
    ('<span>Camera</span>', '<span>Kamera</span>'),
    ('<i data-icon="sides"></i>sides', '<i data-icon="sides"></i>yanlar'),
    ('<i data-icon="sphere"></i>sphere', '<i data-icon="sphere"></i>360° küre'),
    ('<span>Field of view</span>', '<span>Görüş Açısı</span>'),
    ('<span>Resolution</span>', '<span>Çözünürlük</span>'),
    ('<span>Parallel requests</span>', '<span>Paralel İstek</span>'),
    ('<i data-icon="satellite"></i><span>Satellite</span>',
     '<i data-icon="satellite"></i><span>Uydu Görüntüsü</span>'),
    ('<span>Zoom</span>', '<span>Yakınlaştırma (Zoom)</span>'),
    ('<span>Tile format</span>', '<span>Görüntü Formatı</span>'),
    ('<i data-icon="osm"></i><span>OSM map</span>',
     '<i data-icon="osm"></i><span>OSM Bina &amp; Yol</span>'),
    ('OpenStreetMap data clipped to the area. The first capture in a region downloads its Geofabrik file, which can be hundreds of MB.',
     'Seçilen alana kırpılmış OpenStreetMap bina, yol ve şebeke verisi (.osm). Türkiye paketi sunucuda hazırdır.'),
    ('<i data-icon="terrain"></i><span>Terrain</span>',
     '<i data-icon="terrain"></i><span>Arazi Kotu (DEM)</span>'),
    ('<i data-icon="mesh"></i><span>3D mesh</span>',
     '<i data-icon="mesh"></i><span>3B Model (GLB)</span>'),
    ('Google Earth photogrammetry, saved as mesh.glb.',
     '3B fotogrametri arazi ve yapı modeli (mesh.glb olarak indirilir).'),
    ('<span>Detail level</span>', '<span>Detay Seviyesi</span>'),
    ('<summary class="label">Advanced</summary>', '<summary class="label">Gelişmiş Ayarlar</summary>'),
    ('<span>Pause between requests</span>', '<span>İstekler Arası Bekleme</span>'),
    ('A pause also makes requests sequential.', 'Bekleme süresi verilirse istekler sırayla yapılır.'),
    ('>Preview</button>', '>Planla ve Önizle</button>'),
    ('>← Settings</button>', '>← Ayarlara Dön</button>'),
    ('<h1>Preview</h1>', '<h1>Çekim Özeti</h1>'),
    ('<p class="label">Planning</p>', '<p class="label">Planlanıyor</p>'),
    ('<p class="label">Estimated time</p>', '<p class="label">Tahmini Süre</p>'),
    ('Excludes the first download of a regional OSM file and building the final files.',
     'Bölgesel ilk OSM indirmesi ve sonuç dosyalarını birleştirme süresi hariçtir.'),
    ('>Cancel</button>', '>Vazgeç</button>'),
    ('>Start capture</button>', '>Çekimi Başlat</button>'),
    ('<p class="label">Capturing</p>', '<p class="label">İndiriliyor</p>'),
    ('<h2 class="label">Layers</h2>', '<h2 class="label">Harita Katmanları</h2>'),
    ('<h2 class="label">Files</h2>', '<h2 class="label">İndirilebilir Dosyalar</h2>'),
    ('>Copy path</button>', '>Yolu Kopyala</button>'),
    ('>Stop</button>', '>Durdur</button>'),
    ('>Resume capture</button>', '>Çekime Devam Et</button>'),
    ('placeholder="Search places" aria-label="Search places"',
     'placeholder="Konum, il, ilçe, köy ara…" aria-label="Konum ara"'),
)

JS_CEVIRILER = (
    ('const NAMES = {streetview: "Street View", satellite: "Satellite", osm: "OSM map", terrain: "Terrain", mesh: "3D mesh"};',
     'const NAMES = {streetview: "Sokak Görünümü", satellite: "Uydu Görüntüsü", osm: "OSM Harita", terrain: "Arazi Kotu (DEM)", mesh: "3B Model"};'),
    ('const STATES = {planned: "Planned", running: "Capturing", interrupted: "Interrupted", stopped: "Stopped",\n                failed: "Failed", complete: "Complete", unreadable: "Unreadable"};',
     'const STATES = {planned: "Planlandı", running: "İndiriliyor", interrupted: "Yarıda Kaldı", stopped: "Durduruldu",\n                failed: "Hata", complete: "Tamamlandı", unreadable: "Okunamadı"};'),
    ('{center: [12.49, 41.89], zoom: 2}', '{center: [34.029, 38.368], zoom: 6.2}'),
    ('Aleph could not start:', 'AVY başlatılamadı:'),
)


def html_uyarla(ham: bytes) -> bytes:
    metin = ham.decode("utf-8")
    metin = re.sub(r'<link rel="icon" href="[^"]*">', f'<link rel="icon" href="{FAVICON_DATA}">', metin, count=1)
    metin = re.sub(r'<header class="brand">.*?</header>', MARKA_HEADER, metin, count=1, flags=re.S)
    for eski, yeni in HTML_CEVIRILER:
        metin = metin.replace(eski, yeni)
    return metin.encode("utf-8")


def js_uyarla(ham: bytes) -> bytes:
    metin = ham.decode("utf-8").replace("\r\n", "\n")
    for eski, yeni in JS_CEVIRILER:
        metin = metin.replace(eski, yeni)
    return metin.encode("utf-8")


def css_uyarla(ham: bytes) -> bytes:
    return (ham.decode("utf-8") + "\n" + EK_STIL).encode("utf-8")


SSO_HTML = f"""<!doctype html>
<html lang="tr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow">
<meta name="referrer" content="no-referrer">
<title>AVY · Arazi Veri Yönetimi · Giriş</title>
<link rel="icon" href="{FAVICON_DATA}">
<style>
  body{{margin:0;min-height:100vh;display:grid;place-items:center;background:#F4F5F7;color:#2B2F35;font:15px/1.5 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}}
  .kart{{background:#fff;border:1px solid #DDE1E6;border-radius:16px;padding:28px 30px;width:min(420px,92vw);box-shadow:0 16px 48px rgba(20,24,30,.08);text-align:center}}
  .ust{{display:inline-flex;align-items:center;gap:10px;margin-bottom:14px;font-weight:800;font-size:18px}}
  .hata{{background:#FDECEC;color:#8E1117;border-radius:10px;padding:10px 12px;margin-top:12px;font-size:13.5px;display:none}}
  .btn{{display:inline-block;margin-top:14px;background:#D32027;color:#fff;text-decoration:none;padding:9px 16px;border-radius:9px;font-weight:600;font-size:13.5px}}
</style>
</head>
<body>
<div class="kart">
  <div class="ust">
    <svg width="32" height="32" viewBox="0 0 64 64"><path d="M32 4a28 28 0 0 0 0 56z" fill="#D7262E"/><path d="M32 4a28 28 0 0 1 0 56z" fill="#2B2F35"/><path d="M36 10 20 36h11l-4 18 18-28H34z" fill="#fff"/></svg>
    <span>AVY · Arazi Veri Yönetimi</span>
  </div>
  <div id="durum">Portal oturumu doğrulanıyor…</div>
  <div id="hata" class="hata"></div>
  <a id="don" class="btn" href="{PORTAL_URL}/?git=avy" style="display:none">Portal'a Dön</a>
</div>
<script>
(async () => {{
  const parca = new URLSearchParams((location.hash || '').replace(/^#/, ''));
  const t = (parca.get('t') || '').trim();
  const r = (parca.get('r') || 'yonetici').trim();
  if (location.hash) history.replaceState(null, '', '/sso');
  if (!t) {{ location.replace('{PORTAL_URL}/?git=avy'); return; }}
  try {{
    const yanit = await fetch('/sso/giris', {{
      method: 'POST',
      headers: {{ 'Content-Type': 'application/json' }},
      credentials: 'same-origin',
      body: JSON.stringify({{ t, r }})
    }});
    const veri = await yanit.json().catch(() => ({{}}));
    if (!yanit.ok || !veri.tamam) throw new Error(veri.hata || ('HTTP ' + yanit.status));
    location.replace('/');
  }} catch (e) {{
    document.getElementById('durum').textContent = 'Giriş tamamlanamadı';
    const h = document.getElementById('hata');
    h.style.display = 'block';
    h.textContent = e.message || String(e);
    document.getElementById('don').style.display = 'inline-block';
  }}
}})();
</script>
</body>
</html>
""".encode("utf-8")


_ORJ_HANDLE = d.Dashboard.handle


def _avy_handle(self, method, parts, query, body):
    res = _ORJ_HANDLE(self, method, parts, query, body)
    if method == "GET" and parts == [] and isinstance(res, tuple):
        return html_uyarla(res[0]), res[1], res[2]
    if method == "GET" and parts == ["app.js"] and isinstance(res, tuple):
        return js_uyarla(res[0]), res[1], res[2]
    if method == "GET" and parts == ["style.css"] and isinstance(res, tuple):
        return css_uyarla(res[0]), res[1], res[2]
    return res


d.Dashboard.handle = _avy_handle


class AVYHandler(d.Handler):
    server_version = "AVY"

    def _yonlendir(self, hedef: str, cerez: str | None = None):
        self.send_response(302)
        self.send_header("Location", hedef)
        self.send_header("Cache-Control", "no-store")
        if cerez:
            self.send_header("Set-Cookie", cerez)
        self.end_headers()

    def _json_yanit(self, kod: int, veri: dict, cerez: str | None = None):
        govde = json.dumps(veri, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
        self.send_response(kod)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(govde)))
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Content-Type-Options", "nosniff")
        if cerez:
            self.send_header("Set-Cookie", cerez)
        self.end_headers()
        self.wfile.write(govde)

    def _guvenli_baglanti_mi(self) -> bool:
        proto = (self.headers.get("X-Forwarded-Proto") or "").lower()
        host = (self.headers.get("Host") or "").split(":")[0].lower()
        if proto == "https":
            return True
        return host not in ("127.0.0.1", "localhost")

    def dispatch(self, method):
        adres = urlsplit(self.path)
        yol = adres.path

        # 1) Sağlık ucu (hassas veri dönmez)
        if method == "GET" and yol == "/saglik":
            return self._json_yanit(200, {"durum": "ok", "servis": "avy"})

        # 2) Portal SSO uçları
        if method == "GET" and yol == "/sso":
            return self.send(200, SSO_HTML, "text/html; charset=utf-8", 0)

        if method == "POST" and yol == "/sso/giris":
            try:
                uzunluk = int(self.headers.get("Content-Length") or 0)
                govde = json.loads(self.rfile.read(min(uzunluk, 8192)) or b"{}")
            except Exception:
                return self._json_yanit(400, {"tamam": False, "hata": "Geçersiz istek gövdesi."})
            rol = belirtec_dogrula(str(govde.get("t") or ""))
            if not rol:
                return self._json_yanit(
                    403,
                    {"tamam": False, "hata": "Portal yetkisi doğrulanamadı. Lütfen Portal üzerinden tekrar açın."},
                )
            deger = cerez_uret(rol)
            ek = "; Secure" if self._guvenli_baglanti_mi() else ""
            cerez = f"{CEREZ_AD}={deger}; Path=/; Max-Age={CEREZ_OMUR}; HttpOnly; SameSite=Lax{ek}"
            return self._json_yanit(200, {"tamam": True, "rol": rol}, cerez=cerez)

        if method == "GET" and yol == "/sso/cikis":
            ek = "; Secure" if self._guvenli_baglanti_mi() else ""
            sil = f"{CEREZ_AD}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax{ek}"
            return self._yonlendir(f"{PORTAL_URL}/", cerez=sil)

        # 3) Tüm diğer uçlar için Portal SSO oturumu zorunlu
        rol = cerez_dogrula(self.headers.get("Cookie") or "")
        if not rol:
            kabul = (self.headers.get("Accept") or "").lower()
            if method == "GET" and not yol.startswith("/api/") and (yol in ("/", "") or "text/html" in kabul):
                return self._yonlendir(f"{PORTAL_URL}/?git=avy")
            return self._json_yanit(401, {"error": "Portal oturumu gerekli. Lütfen Portal üzerinden giriş yapın."})

        return super().dispatch(method)


class AVYServer(http.server.ThreadingHTTPServer):
    def __init__(self, adr, _handler):
        super().__init__(("0.0.0.0", adr[1]), AVYHandler)


def main():
    d.ThreadingHTTPServer = AVYServer
    from alephgeo.__main__ import main as aleph_main

    if len(sys.argv) <= 1:
        sys.argv = [
            "alephgeo",
            "dashboard",
            "-o",
            os.environ.get("AVY_CAPTURES", "/veri/captures"),
            "--cache-dir",
            os.environ.get("AVY_CACHE", "/veri/cache"),
            "--no-browser",
            "--port",
            os.environ.get("AVY_PORT", "8100"),
        ]
    sys.exit(aleph_main())


if __name__ == "__main__":
    main()
