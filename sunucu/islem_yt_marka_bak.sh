#!/bin/bash
# Salt okunur: bağlı kanalların marka bilgisi (ad, açıklama, anahtar kelimeler, logo ve kapak). Logo/kapak küçük önizleme olarak günlüğe.
D=/opt/aesun/youtube python3 - <<'PY'
import json, os, urllib.request, urllib.parse, base64, glob
D = os.environ["D"]; ist = json.load(open(D + "/istemci.json"))
for f in sorted(glob.glob(D + "/kanallar/*.json")):
    cid = os.path.basename(f)[:-5]; t = json.load(open(f))
    b = urllib.parse.urlencode({"client_id": ist["client_id"], "client_secret": ist["client_secret"], "refresh_token": t["refresh_token"], "grant_type": "refresh_token"}).encode()
    tok = json.load(urllib.request.urlopen(urllib.request.Request("https://oauth2.googleapis.com/token", data=b), timeout=30))["access_token"]
    r = urllib.request.Request("https://www.googleapis.com/youtube/v3/channels?part=snippet,brandingSettings&mine=true", headers={"Authorization": "Bearer " + tok})
    for c in json.load(urllib.request.urlopen(r, timeout=30)).get("items", []):
        sn, br = c["snippet"], c.get("brandingSettings", {})
        print(f"NOT: KANAL {c['id']} · {sn.get('title')} · {sn.get('customUrl')} · ülke {br.get('channel',{}).get('country')} · dil {sn.get('defaultLanguage')}")
        print("NOT: AÇIKLAMA " + (sn.get("description") or "")[:700].replace("\n", " ⏎ "))
        print("NOT: ANAHTAR " + (br.get("channel", {}).get("keywords") or "")[:300])
        for ad, u in (("LOGO", (sn.get("thumbnails", {}).get("high") or {}).get("url")), ("KAPAK", br.get("image", {}).get("bannerExternalUrl"))):
            if not u: print(f"NOT: {ad} yok"); continue
            try:
                v = urllib.request.urlopen(u + ("=w2560" if ad == "KAPAK" else ""), timeout=30).read()
                print(f"GORSEL_{ad}_{c['id']} " + base64.b64encode(v).decode())
            except Exception as e: print(f"NOT: {ad} indirilemedi {type(e).__name__}")
PY
