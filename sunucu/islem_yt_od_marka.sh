#!/bin/bash
# Ömür Dediğin (OD) kanal markası: kapak görseli yüklenir, açıklama, anahtar kelimeler, ülke ve dil yazılır.
# Önce mevcut ayar yedeklenir (/opt/aesun/youtube/yedek/). Profil fotoğrafı API ile değiştirilemez (YouTube kısıtı): elle yüklenir.
set -u
D=/opt/aesun/youtube M=/tmp/aesun_paket/sunucu/yt/marka python3 - <<'PY'
import json, os, glob, time, urllib.request, urllib.parse
D, M = os.environ["D"], os.environ["M"]
ist = json.load(open(D + "/istemci.json")); bilinen = {"UC77LyY3gqWmBNAKp2lbsGBg", "UCFLJUlhUSgjcLbp9ad_t9PQ"}
m = json.load(open(M + "/od.json", encoding="utf-8"))
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
    if cid in bilinen: continue
    tk = tok(f)
    for c in api("https://www.googleapis.com/youtube/v3/channels?part=snippet,brandingSettings&mine=true", tk).get("items", []):
        if c["id"] == "UCg75Mvb6C8CBSJPeuwzBFZA":
            hedef = (c, tk)
if not hedef:
    raise SystemExit("NOT: HATA Ömür Dediğin kanalı bağlı değil (önce yt_kur ile izin verilmeli)")
c, tk = hedef
os.makedirs(D + "/yedek", exist_ok=True)
json.dump(c, open(D + f"/yedek/{c['id']}_{time.strftime('%Y%m%d_%H%M')}.json", "w"), ensure_ascii=False)
print(f"NOT: kanal {c['id']} · {c['snippet']['title']} · {c['snippet'].get('customUrl')} · önceki ayar yedeklendi")
# 1) kapak
img = open(M + "/od_kapak.jpg", "rb").read()
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
