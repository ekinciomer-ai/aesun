#!/bin/bash
# SALT OKUNUR denetim: bütün bağlı kanalların videolarını "özgün olmayan içerik / AI slop" risklerine göre listeler.
# Değişiklik yapmaz. Çıktı '===SLOP===' ile '===SON===' arasında JSON (sır yok).
set -euo pipefail
D=/opt/aesun/youtube
python3 - "$D" <<'PY'
import json, os, sys, urllib.request, urllib.parse, glob
D = sys.argv[1]
ist = json.load(open(os.path.join(D, "istemci.json"), encoding="utf-8"))
def token(f):
    t = json.load(open(f, encoding="utf-8"))
    b = urllib.parse.urlencode({"client_id": ist["client_id"], "client_secret": ist["client_secret"], "refresh_token": t["refresh_token"], "grant_type": "refresh_token"}).encode()
    with urllib.request.urlopen(urllib.request.Request("https://oauth2.googleapis.com/token", data=b), timeout=30) as r:
        return json.load(r)["access_token"]
def api(u, tok):
    with urllib.request.urlopen(urllib.request.Request(u, headers={"Authorization": f"Bearer {tok}"}), timeout=40) as r:
        return json.load(r)
out = []
for f in sorted(glob.glob(os.path.join(D, "kanallar", "*.json"))):
    try:
        tok = token(f)
        ch = api("https://www.googleapis.com/youtube/v3/channels?part=snippet,contentDetails,statistics&mine=true", tok)["items"][0]
        up = ch["contentDetails"]["relatedPlaylists"]["uploads"]
        ids, s = [], ""
        while True:
            d = api(f"https://www.googleapis.com/youtube/v3/playlistItems?part=contentDetails&playlistId={up}&maxResults=50" + (f"&pageToken={s}" if s else ""), tok)
            ids += [i["contentDetails"]["videoId"] for i in d.get("items", [])]
            s = d.get("nextPageToken")
            if not s or len(ids) >= 300: break
        vids = []
        for i in range(0, len(ids), 50):
            d = api("https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails,status,statistics&id=" + ",".join(ids[i:i+50]), tok)
            for v in d.get("items", []):
                sn, st = v["snippet"], v["status"]
                vids.append({"id": v["id"], "baslik": sn["title"][:90], "tarih": sn.get("publishedAt", "")[:16], "sure": v["contentDetails"]["duration"],
                             "durum": st.get("privacyStatus"), "plan": st.get("publishAt", "")[:16], "yz": st.get("containsSyntheticMedia"),
                             "aciklama_uz": len(sn.get("description", "")), "etiket": len(sn.get("tags", []) or []), "izlenme": int(v.get("statistics", {}).get("viewCount", 0)),
                             "kapak_ozel": "maxres" in sn.get("thumbnails", {}) or "standard" in sn.get("thumbnails", {})})
        out.append({"kanal": ch["snippet"]["title"], "kid": ch["id"], "video": vids})
        print("NOT: okundu", ch["snippet"]["title"], len(vids), "video")
    except Exception as e:
        print("NOT: HATA", os.path.basename(f)[:6], str(e)[:120])
print("===SLOP==="); print(json.dumps(out, ensure_ascii=False)); print("===SON===")
PY
