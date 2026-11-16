#!/bin/bash
# Yolu Seç ! (YR) kanal markası: kapak görseli yüklenir, açıklama, anahtar kelimeler, ülke ve dil yazılır.
# Önce mevcut ayar yedeklenir (/opt/aesun/youtube/yedek/). Profil fotoğrafı API ile değiştirilemez (YouTube kısıtı): elle yüklenir.
set -u
# Kapak Canva'dan: indirme adresi şifreli gelir, sunucuda çözülüp indirilir (adres süreli ve imzalı)
if [ -f sunucu/yt/marka/yr_kapak_url.sifreli ]; then
  python3 - sunucu/yt/marka/yr_kapak_url.sifreli /tmp/yr_url.txt /opt/aesun/sir/ozel.pem <<'PY2'
import base64, json, subprocess, sys, tempfile
d = json.load(open(sys.argv[1])); out, key = sys.argv[2], sys.argv[3]
with tempfile.TemporaryDirectory() as t:
    open(t+"/ak","wb").write(base64.b64decode(d["ak"])); open(t+"/ct","wb").write(base64.b64decode(d["ct"]))
    subprocess.run(["openssl","pkeyutl","-decrypt","-inkey",key,"-pkeyopt","rsa_padding_mode:oaep","-pkeyopt","rsa_oaep_md:sha256","-in",t+"/ak","-out",t+"/k"],check=True)
    k = open(t+"/k","rb").read().hex()
    subprocess.run(["openssl","enc","-d","-aes-256-cbc","-K",k,"-iv",d["iv"],"-in",t+"/ct","-out",out],check=True)
PY2
  curl -sSf -o sunucu/yt/marka/yr_kapak.jpg "$(cat /tmp/yr_url.txt)" && echo "NOT: Canva kapağı indirildi ($(stat -c%s sunucu/yt/marka/yr_kapak.jpg) bayt)" || { echo "NOT: HATA Canva kapağı indirilemedi"; rm -f /tmp/yr_url.txt; exit 1; }
  rm -f /tmp/yr_url.txt
fi
D=/opt/aesun/youtube M=/tmp/aesun_paket/sunucu/yt/marka python3 - <<'PY'
import json, os, glob, time, urllib.request, urllib.parse
D, M = os.environ["D"], os.environ["M"]
ist = json.load(open(D + "/istemci.json")); HEDEF = "UCqVae87VSs6HokK4Qdm29Hw"
m = json.load(open(M + "/yr.json", encoding="utf-8"))
def tok(f):
    t = json.load(open(f))
    b = urllib.parse.urlencode({"client_id": ist["client_id"], "client_secret": ist["client_secret"], "refresh_token": t["refresh_token"], "grant_type": "refresh_token"}).encode()
    return json.load(urllib.request.urlopen(urllib.request.Request("https://oauth2.googleapis.com/token", data=b), timeout=30))["access_token"]
def api(u, tk, veri=None, yontem=None, tur="application/json"):
    h = {"Authorization": "Bearer " + tk}
    if veri is not None:
        h["Content-Type"] = tur; veri = veri if isinstance(veri, bytes) else json.dumps(veri).encode()
    return json.load(urllib.request.urlopen(urllib.request.Request(u, data=veri, headers=h, method=yontem), timeout=120))
hedef = None
for f in glob.glob(D + "/kanallar/*.json"):
    cid = os.path.basename(f)[:-5]
    if cid != HEDEF: continue
    tk = tok(f)
    for c in api("https://www.googleapis.com/youtube/v3/channels?part=snippet,brandingSettings&mine=true", tk).get("items", []):
        if c["id"] == HEDEF:
            hedef = (c, tk)
if not hedef:
    raise SystemExit("NOT: HATA Yolu Seç ! kanalı bağlı değil (önce yt_kur ile izin verilmeli)")
c, tk = hedef
os.makedirs(D + "/yedek", exist_ok=True)
json.dump(c, open(D + f"/yedek/{c['id']}_{time.strftime('%Y%m%d_%H%M')}.json", "w"), ensure_ascii=False)
print(f"NOT: kanal {c['id']} · {c['snippet']['title']} · {c['snippet'].get('customUrl')} · önceki ayar yedeklendi")
# 1) kapak
img = open(M + "/yr_kapak.jpg", "rb").read()
r = api("https://www.googleapis.com/upload/youtube/v3/channelBanners/insert?uploadType=media", tk, img, "POST", "image/jpeg")
url = r["url"]; print("NOT: kapak yüklendi")
# 2) marka ayarları (brandingSettings.channel tümüyle yazılır; mevcut alanlar korunur)
br = c.get("brandingSettings", {}); ch = br.get("channel", {})
ch.update({"title": m["baslik"], "description": m["aciklama"], "keywords": m["anahtar"], "country": m["ulke"], "defaultLanguage": m["dil"]})
govde = {"id": c["id"], "brandingSettings": {"channel": ch, "image": {"bannerExternalUrl": url}}}
api("https://www.googleapis.com/youtube/v3/channels?part=brandingSettings", tk, govde, "PUT")
print("NOT: açıklama, anahtar kelimeler, ülke (TR) ve dil (tr) yazıldı")
# 3) doğrulama
c2 = api(f"https://www.googleapis.com/youtube/v3/channels?part=snippet,brandingSettings&id={c['id']}", tk)["items"][0]
print("NOT: doğrulama · açıklama:", c2["snippet"]["description"][:80].replace("\n", " "), "· kapak:", "var" if c2["brandingSettings"].get("image", {}).get("bannerExternalUrl") else "yok")
PY
