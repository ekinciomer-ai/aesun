"""Davalar · geçici salt-okunur görüntüleyici (tek kullanıcı, süreli).
Portal ve merkez API'den bağımsızdır: şifreli dava klasörünü ve anahtarı yalnız okur, hiçbir şey yazmaz.
Dışarıya port açmaz; yalnız Cloudflare geçici tüneli (rastgele adres) üzerinden erişilir, sunucu adresi görünmez.
Giriş: DG_KUL + DG_PAROLA (PBKDF2 özeti, düz şifre yok). DG_BITIS (epoch) sonrası her istek 410."""
import base64, hashlib, hmac, json, os, re, secrets, time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

KOK = Path("/davalar")
ANAHTAR = Path("/davalar_anahtar").read_bytes()[:32]
KUL = os.environ["DG_KUL"]
TUZ, OZ = os.environ["DG_PAROLA"].split("$")
BITIS = float(os.environ.get("DG_BITIS", "0"))
SAYFA = (Path(__file__).parent / "index.html").read_bytes()
ID = re.compile(r"^[a-f0-9]{8,40}$")
TURLER = {"pdf": "application/pdf", "png": "image/png", "jpg": "image/jpeg", "txt": "text/plain; charset=utf-8",
          "html": "text/plain; charset=utf-8", "tif": "image/tiff"}
OTURUM, HATA = {}, {}          # oturum -> bitiş ; ip -> [deneme zamanları]
OTURUM_SN, KILIT_SN, KILIT_N = 12 * 3600, 900, 6
_dz = {"m": None, "v": None}


def coz(p: Path) -> bytes:
    b = p.read_bytes()
    return AESGCM(ANAHTAR).decrypt(b[:12], b[12:], None)


def dizin():
    p = KOK / "dizin.sifreli"
    if not p.is_file():
        return {"davalar": [], "evrak": {}}
    m = p.stat().st_mtime
    if _dz["m"] != m:
        _dz["v"], _dz["m"] = json.loads(coz(p)), m
    return _dz["v"]


def parola_dogru(k: str, s: str) -> bool:
    h = hashlib.pbkdf2_hmac("sha256", s.encode(), base64.b64decode(TUZ), 300000).hex()
    return hmac.compare_digest(k.strip().lower(), KUL) & hmac.compare_digest(h, OZ)


class H(BaseHTTPRequestHandler):
    server_version = ""
    sys_version = ""

    def log_message(self, *a):   # içerik/şifre günlüğe yazılmaz
        pass

    def ip(self):
        return self.headers.get("CF-Connecting-IP") or self.client_address[0]

    def gonder(self, kod, govde=b"", tur="text/plain; charset=utf-8", ek=None):
        self.send_response(kod)
        for k, v in {"Content-Type": tur, "Content-Length": str(len(govde)), "Cache-Control": "private, no-store",
                     "X-Robots-Tag": "noindex, nofollow", "X-Content-Type-Options": "nosniff", "Referrer-Policy": "no-referrer",
                     "X-Frame-Options": "SAMEORIGIN",
                     "Content-Security-Policy": "default-src 'self'; img-src 'self' blob:; frame-src blob:; style-src 'unsafe-inline'; script-src 'unsafe-inline'",
                     **(ek or {})}.items():
            self.send_header(k, v)
        self.end_headers()
        if self.command != "HEAD":
            self.wfile.write(govde)

    def oturum(self):
        c = self.headers.get("Cookie", "")
        m = re.search(r"(?:^|;\s*)dg=([A-Za-z0-9_-]{20,})", c)
        return bool(m and OTURUM.get(m.group(1), 0) > time.time())

    def sure_bitti(self):
        if BITIS and time.time() > BITIS:
            self.gonder(410, "Bu bağlantının süresi doldu.".encode())
            return True
        return False

    def do_GET(self):
        if self.sure_bitti():
            return
        yol = self.path.split("?")[0]
        if yol == "/":
            return self.gonder(200, SAYFA, "text/html; charset=utf-8")
        if not self.oturum():
            return self.gonder(401, b"{}", "application/json")
        if yol == "/api/dizin":
            d = dizin()
            return self.gonder(200, json.dumps({"guncel": d.get("guncel"), "davalar": d.get("davalar", [])}, ensure_ascii=False).encode(), "application/json")
        m = re.fullmatch(r"/api/evrak/([a-f0-9]{8,40})", yol)
        if m:
            eid = m.group(1)
            bilgi = dizin().get("evrak", {}).get(eid)
            p = KOK / "e" / f"{eid}.sifreli"
            if not bilgi or not p.is_file():
                return self.gonder(404, b"yok")
            tur = bilgi.get("tur", "pdf")
            return self.gonder(200, coz(p), TURLER.get(tur, "application/octet-stream"), {"Content-Disposition": "inline"})
        self.gonder(404, b"yok")

    do_HEAD = do_GET

    def do_POST(self):
        if self.sure_bitti():
            return
        yol = self.path.split("?")[0]
        if yol == "/cikis":
            return self.gonder(200, b"{}", "application/json", {"Set-Cookie": "dg=; Max-Age=0; Path=/; Secure; HttpOnly; SameSite=Strict"})
        if yol != "/giris":
            return self.gonder(404, b"yok")
        ip, now = self.ip(), time.time()
        HATA[ip] = [t for t in HATA.get(ip, []) if now - t < KILIT_SN]
        if len(HATA[ip]) >= KILIT_N:
            return self.gonder(429, "Çok fazla hatalı deneme. 15 dakika sonra tekrar deneyin.".encode())
        n = min(int(self.headers.get("Content-Length") or 0), 2048)
        f = parse_qs(self.rfile.read(n).decode("utf-8", "ignore"))
        if not parola_dogru((f.get("k") or [""])[0], (f.get("s") or [""])[0]):
            HATA[ip].append(now)
            time.sleep(1)
            return self.gonder(403, "Kullanıcı adı ya da şifre hatalı.".encode())
        HATA.pop(ip, None)
        t = secrets.token_urlsafe(32)
        for k in [k for k, v in OTURUM.items() if v < now]:
            OTURUM.pop(k, None)
        OTURUM[t] = now + OTURUM_SN
        self.gonder(200, b"{}", "application/json", {"Set-Cookie": f"dg={t}; Max-Age={OTURUM_SN}; Path=/; Secure; HttpOnly; SameSite=Strict"})


if __name__ == "__main__":
    ThreadingHTTPServer(("0.0.0.0", 8000), H).serve_forever()
