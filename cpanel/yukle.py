#!/usr/bin/env python3
"""dist/ klasörünü cPanel'e yükler (cPanel API, port 2083; FTP gerekmez).
Yalnız değişen dosyalar tek bir zip olarak gönderilir ve sunucuda açılır.
Ortam: CP_HOST, CP_USER, CP_PASS, CP_DIR (varsayılan public_html)."""
import base64, hashlib, io, json, os, ssl, sys, time, urllib.parse, urllib.request, uuid, zipfile

HOST = os.environ.get("CP_HOST") or "aksarayenerji.net"
USER, PASS = os.environ["CP_USER"], os.environ["CP_PASS"]
DIZIN = (os.environ.get("CP_DIR") or "public_html").strip("/").rstrip("/") or "public_html"
if DIZIN in (".", "./"):
    DIZIN = "public_html"
KAYNAK = sys.argv[1] if len(sys.argv) > 1 else "dist"
MANIFEST = ".dagitim.json"
AUTH = "Basic " + base64.b64encode(f"{USER}:{PASS}".encode()).decode()
CTX = ssl.create_default_context()


def istek(yol, veri=None, tip=None):
    global CTX
    url = f"https://{HOST}:2083/{yol}"
    for deneme in range(2):
        req = urllib.request.Request(url, data=veri, headers={"Authorization": AUTH, **({"Content-Type": tip} if tip else {})})
        try:
            with urllib.request.urlopen(req, context=CTX, timeout=300) as r:
                return json.loads(r.read().decode() or "{}")
        except urllib.error.URLError as e:
            if isinstance(getattr(e, "reason", None), ssl.SSLError) and deneme == 0:
                print("::warning::Sunucu sertifikası doğrulanamadı; doğrulamasız devam ediliyor.")
                CTX = ssl._create_unverified_context()
                continue
            if isinstance(e, urllib.error.HTTPError) and e.code in (401, 403):
                sys.exit("::error::cPanel girişi reddedildi (kullanıcı adı/şifre). FTP_KULLANICI cPanel hesap adı olmalı.")
            raise


def uapi(mod, fn, **p):
    j = istek(f"execute/{mod}/{fn}", urllib.parse.urlencode(p).encode(), "application/x-www-form-urlencoded")
    if not j.get("status"):
        raise RuntimeError(f"{mod}::{fn}: {j.get('errors')}")
    return j.get("data")


def api2(mod, fn, **p):
    q = {"cpanel_jsonapi_version": 2, "cpanel_jsonapi_module": mod, "cpanel_jsonapi_func": fn, **p}
    j = istek("json-api/cpanel?" + urllib.parse.urlencode(q))
    r = (j.get("cpanelresult") or {})
    if r.get("error") or (r.get("event") or {}).get("result") == 0:
        raise RuntimeError(f"{mod}::{fn}: {r.get('error') or r}")
    return r.get("data")


def yukle_dosya(ad, icerik):
    sinir = uuid.uuid4().hex
    govde = io.BytesIO()
    for k, v in (("dir", DIZIN), ("overwrite", "1")):
        govde.write(f"--{sinir}\r\nContent-Disposition: form-data; name=\"{k}\"\r\n\r\n{v}\r\n".encode())
    govde.write(f"--{sinir}\r\nContent-Disposition: form-data; name=\"file-1\"; filename=\"{ad}\"\r\nContent-Type: application/zip\r\n\r\n".encode())
    govde.write(icerik)
    govde.write(f"\r\n--{sinir}--\r\n".encode())
    j = istek("execute/Fileman/upload_files", govde.getvalue(), f"multipart/form-data; boundary={sinir}")
    if not j.get("status"):
        raise RuntimeError(f"yükleme: {j.get('errors')}")


def main():
    yerel = {}
    for kok, _, dosyalar in os.walk(KAYNAK):
        for d in dosyalar:
            tam = os.path.join(kok, d)
            yol = os.path.relpath(tam, KAYNAK).replace(os.sep, "/")
            yerel[yol] = hashlib.sha1(open(tam, "rb").read()).hexdigest()
    try:
        eski = json.loads((uapi("Fileman", "get_file_content", dir=DIZIN, file=MANIFEST) or {}).get("content") or "{}")
    except Exception:
        eski = {}
    degisen = sorted(y for y, h in yerel.items() if eski.get(y) != h)
    print(f"::notice::{len(yerel)} dosya, {len(degisen)} değişmiş → {HOST}/{DIZIN}")
    if degisen:
        buf = io.BytesIO()
        with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as z:
            for y in degisen:
                z.write(os.path.join(KAYNAK, y), y)
        ad = f"_dagitim_{int(time.time())}.zip"
        yukle_dosya(ad, buf.getvalue())
        api2("Fileman", "fileop", op="extract", sourcefiles=f"{DIZIN}/{ad}", destfiles=DIZIN, doubledecode=0)
        try:
            api2("Fileman", "fileop", op="unlink", sourcefiles=f"{DIZIN}/{ad}", doubledecode=0)
        except Exception as e:
            print("::warning::geçici zip silinemedi:", e)
        uapi("Fileman", "save_file_content", dir=DIZIN, file=MANIFEST, content=json.dumps(yerel))
    for y in degisen[:40]:
        print("  +", y)
    print("::notice::Yükleme tamam.")


if __name__ == "__main__":
    main()
