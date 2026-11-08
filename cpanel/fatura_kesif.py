#!/usr/bin/env python3
"""fatura.aksarayenerji.net keşfi (YALNIZ OKUMA): cPanel'de kök klasörü ve dosya listesi + sitenin ana sayfası.
Dosya içerikleri yazdırılmaz (sır olabilir); yalnız ad/boyut/tarih ve sayfanın bağlantı/betik adları."""
import json, os, re, ssl, urllib.parse, urllib.request
H, U, T = os.environ.get("CP_HOST", "aksarayenerji.net"), os.environ["CP_USER"], os.environ.get("CP_TOKEN", "")
ALAN = os.environ.get("ALAN", "fatura.aksarayenerji.net")
ctx = ssl._create_unverified_context()
def api(yol, **p):
    r = urllib.request.Request(f"https://{H}:2083/execute/{yol}?" + urllib.parse.urlencode(p), headers={"Authorization": f"cpanel {U}:{T}"})
    with urllib.request.urlopen(r, context=ctx, timeout=60) as x:
        return json.loads(x.read().decode())
notlar = []
import socket
try:
    notlar.append("DNS: " + ", ".join(sorted({a[4][0] for a in socket.getaddrinfo(ALAN, 443)})))
except Exception as e:
    notlar.append(f"DNS: {e}")
try:
    with urllib.request.urlopen(urllib.request.Request(f"https://{ALAN}/", headers={"User-Agent": "Mozilla/5.0"}), timeout=30, context=ctx) as x:
        b = x.read().decode("utf-8", "ignore")
    t = re.search(r"<title>(.*?)</title>", b, re.S)
    lnk = sorted(set(re.findall(r'(?:href|src|action)=["\']([^"\'#]+)', b)))[:60]
    api_ = sorted(set(re.findall(r'["\'`](/?(?:api|veri|data)[A-Za-z0-9_\-/.]*\.(?:php|json|csv))', b)))[:40]
    fetch = sorted(set(re.findall(r'fetch\(\s*["\'`]([^"\'`]+)', b)))[:40]
    notlar.append(f"site: {x.status} başlık={t.group(1).strip()[:80] if t else '-'} boyut={len(b)} giriş_formu={'password' in b.lower()}")
    notlar.append("bağlantılar: " + " | ".join(lnk))
    notlar.append("veri uçları: " + " | ".join(api_ + fetch))
except Exception as e:
    notlar.append(f"site: {getattr(e,'code',e)}")
try:
    d = api("DomainInfo/single_domain_data", domain=ALAN).get("data") or {}
    kok, ev = d.get("documentroot", ""), d.get("homedir", "")
    if not kok or kok.rstrip("/") == ev.rstrip("/"):
        raise RuntimeError("bu alan adı bu cPanel hesabında değil")
    notlar.append(f"kök: {kok.replace(ev, '~')} · tür {d.get('type')}")
    goreli = kok[len(ev):].strip("/") if ev and kok.startswith(ev) else kok
    satir = []
    def gez(yol, derin):
        if derin > 3 or len(satir) > 400:
            return
        l = api("Fileman/list_files", dir=yol, include_mime=0, show_hidden=1).get("data") or []
        for f in l:
            ad = yol[len(goreli):].lstrip("/") + ("/" if yol != goreli else "") + f.get("file", "")
            if f.get("type") == "dir":
                satir.append(f"{ad}/")
                if f.get("file") not in (".git", "node_modules", "vendor", "cache", "logs", "tmp"):
                    gez(yol + "/" + f["file"], derin + 1)
            else:
                satir.append(f"{ad} ({f.get('humansize')}, {f.get('mtime')})")
    gez(goreli, 0)
    for i in range(0, len(satir), 40):
        notlar.append("dosyalar: " + " | ".join(satir[i:i + 40]))
except Exception as e:
    notlar.append(f"cPanel: {getattr(e,'code',e)} {str(e)[:150]}")
for n in notlar[:8]:
    print("::notice::" + n[:3800])
