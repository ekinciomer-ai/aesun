#!/usr/bin/env python3
"""dist/ klasörünü cPanel'e yükler (cPanel API, port 2083; FTP gerekmez).
Yalnız değişen dosyalar tek bir zip olarak gönderilir ve sunucuda açılır.
Ortam: CP_HOST, CP_USER, CP_PASS, CP_DIR (varsayılan public_html)."""
import base64, hashlib, io, json, os, ssl, sys, time, urllib.parse, urllib.request, uuid, zipfile

HOST = os.environ.get("CP_HOST") or "aksarayenerji.net"          # cPanel API sunucusu
ALAN = os.environ.get("CP_ALAN") or HOST                           # yüklenecek alan adı
KONTROL = [x.split("=", 1) for x in (os.environ.get("CP_KONTROL") or "=<title").split(";") if x]
USER, PASS, TOKEN = os.environ["CP_USER"], os.environ.get("CP_PASS", ""), os.environ.get("CP_TOKEN", "").strip()
DIZIN = (os.environ.get("CP_DIR") or "").strip().strip("/")   # boşsa alan adının kök klasörü cPanel'den bulunur
KAYNAK = sys.argv[1] if len(sys.argv) > 1 else "dist"
MANIFEST = ".dagitim3.json"
# API anahtarı (cPanel → Güvenlik → Manage API Tokens) varsa o, yoksa hesap şifresi kullanılır
AUTH = f"cpanel {USER}:{TOKEN}" if TOKEN else "Basic " + base64.b64encode(f"{USER}:{PASS}".encode()).decode()
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
                sys.exit("::error::cPanel girişi reddedildi (" + ("API anahtarı" if TOKEN else "şifre") + ", HTTP " + str(e.code) + "). FTP_KULLANICI cPanel hesap adı olmalı (ör. aksaraye), user@alanadi biçiminde FTP alt hesabı değil.")
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


def yukle_dizine(hedef, dosyalar):
    """dosyalar: [(ad, bayt)] → hedef klasöre tek istekte yükler."""
    sinir = uuid.uuid4().hex
    govde = io.BytesIO()
    for k, v in (("dir", hedef), ("overwrite", "1")):
        govde.write(f"--{sinir}\r\nContent-Disposition: form-data; name=\"{k}\"\r\n\r\n{v}\r\n".encode())
    for i, (ad, icerik) in enumerate(dosyalar, 1):
        govde.write(f"--{sinir}\r\nContent-Disposition: form-data; name=\"file-{i}\"; filename=\"{ad}\"\r\nContent-Type: application/octet-stream\r\n\r\n".encode())
        govde.write(icerik)
        govde.write(b"\r\n")
    govde.write(f"--{sinir}--\r\n".encode())
    j = istek("execute/Fileman/upload_files", govde.getvalue(), f"multipart/form-data; boundary={sinir}")
    if not j.get("status"):
        raise RuntimeError(f"yükleme ({hedef}): {j.get('errors')}")


VAR_DIZIN = set()


def dizin_hazirla(goreli):
    """public_html altındaki klasörü (gerekirse üst klasörleriyle) oluşturur."""
    parca = [p for p in goreli.split("/") if p]
    for i in range(len(parca)):
        yol = "/".join(parca[:i + 1])
        if yol in VAR_DIZIN:
            continue
        ust = DIZIN + ("/" + "/".join(parca[:i]) if i else "")
        try:
            api2("Fileman", "mkdir", path=ust, name=parca[i])
        except Exception as e:
            if "exist" not in str(e).lower() and "mevcut" not in str(e).lower():
                print(f"::warning::klasör {yol}: {e}")
        VAR_DIZIN.add(yol)


def main():
    global DIZIN
    if not DIZIN or DIZIN == ".":
        d = uapi("DomainInfo", "single_domain_data", domain=ALAN) or {}
        kok = str(d.get("documentroot") or "")
        ev = str(d.get("homedir") or "")
        if not kok:
            sys.exit(f"::error::{ALAN} için kök klasör bulunamadı")
        DIZIN = kok[len(ev):].strip("/") if ev and kok.startswith(ev) else kok.split("/", 3)[-1].strip("/")
        print(f"::notice::{ALAN} kök klasörü: {DIZIN}")
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
    print(f"::notice::{len(yerel)} dosya, {len(degisen)} değişmiş → {ALAN} ({DIZIN})")
    if degisen:
        gruplar = {}
        for y in degisen:
            gruplar.setdefault(y.rsplit("/", 1)[0] if "/" in y else "", []).append(y)
        for d, liste in sorted(gruplar.items()):
            if d:
                dizin_hazirla(d)
            hedef = DIZIN + ("/" + d if d else "")
            paket, boy = [], 0
            for y in liste:
                b = open(os.path.join(KAYNAK, y), "rb").read()
                if paket and boy + len(b) > 8 * 1024 * 1024:   # cPanel tek istekte ~10 MB üstünü 500 ile reddediyor
                    yukle_dizine(hedef, paket); paket, boy = [], 0
                paket.append((y.rsplit("/", 1)[-1], b)); boy += len(b)
            if paket:
                yukle_dizine(hedef, paket)
            print(f"  {hedef or DIZIN}: {len(liste)} dosya")
        uapi("Fileman", "save_file_content", dir=DIZIN, file=MANIFEST, content=json.dumps(yerel))
    for y in degisen[:40]:
        print("  +", y)
    # klasör izinleri 0755 (web sunucusu okuyabilsin)
    dizinler = sorted({y.rsplit("/", 1)[0] for y in yerel if "/" in y})
    for d in dizinler:
        try:
            api2("Fileman", "fileop", op="chmod", metadata="0755", sourcefiles=f"{DIZIN}/{d}", doubledecode=0)
        except Exception as e:
            print(f"::warning::chmod {d}: {e}")
    try:
        l = uapi("Fileman", "list_files", dir=DIZIN, include_mime=0) or []
        print("izinler: " + ", ".join(f"{x.get('file')}={x.get('nicemode')}" for x in l if x.get('type') == 'dir'))
    except Exception as e:
        print("::warning::izin listesi:", e)
    print("::notice::Yükleme tamam.")
    # canlı kontrol
    CANLI = []
    for yol, aranan in KONTROL:
        yol = yol.lstrip("/")
        try:
            with urllib.request.urlopen(urllib.request.Request(f"https://{ALAN}/{yol}?k={int(time.time())}", headers={"User-Agent": "Mozilla/5.0"}), context=ssl._create_unverified_context(), timeout=30) as r:
                g = r.read().decode("utf-8", "ignore")
                CANLI.append(f"/{yol} {r.status}" + ("✓" if aranan in g else "?"))
        except Exception as e:
            CANLI.append(f"/{yol} {getattr(e, 'code', e)}✗")
    print(f"::notice::{ALAN} canlı: " + " · ".join(CANLI))
    if any("✗" in c for c in CANLI):
        sys.exit(1)

if __name__ == "__main__":
    try:
        main()
    except SystemExit:
        raise
    except Exception as e:   # hata özette (annotation) de görünsün
        print(f"::error::{ALAN} yükleme hatası: {type(e).__name__}: {str(e)[:400]}")
        raise
