#!/bin/bash
# Salt okunur: 6 kanalda son 25 videonun gerçek durumu (gizlilik, planlı zaman, işlenme, izlenme, çocuk ayarı) + kanal durumu.
set -euo pipefail
D=/opt/aesun/youtube
python3 - "$D" <<'PY'
import json, os, sys, urllib.request, urllib.parse
from datetime import datetime, timedelta, timezone
D = sys.argv[1]; TZ = timezone(timedelta(hours=3))
KANAL = [("TR", "UC77LyY3gqWmBNAKp2lbsGBg"), ("EN", "UCFLJUlhUSgjcLbp9ad_t9PQ"), ("ES", "UCTC_yS0lwl-owMuo5b4bNtQ"),
         ("KZ_TR", "UC7o3DG9m1gBbvMjFZjB5KEg"), ("KZ_EN", "UC41-Z82jCQ8955az6JUDIAw")]
ist = json.load(open(os.path.join(D, "istemci.json"), encoding="utf-8"))
def token(cid):
    t = json.load(open(os.path.join(D, "kanallar", f"{cid}.json"), encoding="utf-8"))
    b = urllib.parse.urlencode({"client_id": ist["client_id"], "client_secret": ist["client_secret"], "refresh_token": t["refresh_token"], "grant_type": "refresh_token"}).encode()
    return json.load(urllib.request.urlopen(urllib.request.Request("https://oauth2.googleapis.com/token", data=b), timeout=30))["access_token"]
def api(url, tok):
    return json.load(urllib.request.urlopen(urllib.request.Request(url, headers={"Authorization": f"Bearer {tok}"}), timeout=40))
for kod, cid in KANAL:
    try:
        tok = token(cid)
        ch = api(f"https://www.googleapis.com/youtube/v3/channels?part=status,statistics&id={cid}", tok)["items"][0]
        print(f"NOT: KANAL {kod} status={json.dumps(ch.get('status'))} stats={json.dumps(ch.get('statistics'))}")
        d = api(f"https://www.googleapis.com/youtube/v3/playlistItems?part=contentDetails&playlistId=UU{cid[2:]}&maxResults=25", tok)
        ids = [i["contentDetails"]["videoId"] for i in d.get("items", [])]
        for v in api("https://www.googleapis.com/youtube/v3/videos?part=snippet,status,statistics,contentDetails&id=" + ",".join(ids), tok).get("items", []):
            st = v["status"]; pa = v["snippet"].get("publishedAt", "")
            print(f"NOT: VID {kod} {v['id']} {st.get('privacyStatus')} up={st.get('uploadStatus')} fail={st.get('failureReason') or st.get('rejectionReason') or '-'} "
                  f"plan={st.get('publishAt','-')} yay={pa[:16]} kids={st.get('madeForKids')} emb={st.get('embeddable')} view={v.get('statistics',{}).get('viewCount')} "
                  f"dur={v['contentDetails'].get('duration')} reg={json.dumps(v['contentDetails'].get('regionRestriction'))} | {v['snippet']['title'][:40]}")
    except Exception as e:
        print(f"NOT: HATA {kod} {type(e).__name__} {str(e)[:150]}")
PY
