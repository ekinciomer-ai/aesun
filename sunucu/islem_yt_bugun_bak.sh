#!/bin/bash
# Salt okunur: bugünkü planlı videoların YouTube'daki gerçek durumu (tüm bağlı kanal anahtarlarıyla dener).
set -euo pipefail
D=/opt/aesun/youtube
python3 - "$D" <<'PY'
import json, os, sys, glob, urllib.request, urllib.parse
D = sys.argv[1]
VIDS = ["hJk7pJ-7kVI","6LI0hwINbiM","o0bblLZDQIM","JgIl__JbxjI","rU1D9Elankc","AtaoU8aG7-Y","jogs0Swksew","FyBLB24Swcs","sMHq7klzw2Q","xXCMq2peH0A"]
ist = json.load(open(os.path.join(D, "istemci.json"), encoding="utf-8"))
kalan = set(VIDS)
for f in sorted(glob.glob(os.path.join(D, "kanallar", "*.json"))):
    if not kalan: break
    try:
        t = json.load(open(f, encoding="utf-8"))
        b = urllib.parse.urlencode({"client_id": ist["client_id"], "client_secret": ist["client_secret"], "refresh_token": t["refresh_token"], "grant_type": "refresh_token"}).encode()
        tok = json.load(urllib.request.urlopen(urllib.request.Request("https://oauth2.googleapis.com/token", data=b), timeout=30))["access_token"]
        r = json.load(urllib.request.urlopen(urllib.request.Request("https://www.googleapis.com/youtube/v3/videos?part=snippet,status&id=" + ",".join(kalan), headers={"Authorization": f"Bearer {tok}"}), timeout=40))
        for v in r.get("items", []):
            st = v["status"]
            if "publishAt" not in st and st.get("privacyStatus") != "public" and v["id"] in kalan:
                pass
            print(f"NOT: VID {os.path.basename(f)[:10]} {v['id']} priv={st.get('privacyStatus')} up={st.get('uploadStatus')} plan={st.get('publishAt','-')} yay={v['snippet'].get('publishedAt','')[:16]} fail={st.get('failureReason') or st.get('rejectionReason') or '-'} | {v['snippet']['title'][:35]}")
            kalan.discard(v["id"])
    except Exception as e:
        print(f"NOT: HATA {os.path.basename(f)[:10]} {type(e).__name__} {str(e)[:120]}")
print("NOT: BULUNAMAYAN " + " ".join(sorted(kalan)))
PY
