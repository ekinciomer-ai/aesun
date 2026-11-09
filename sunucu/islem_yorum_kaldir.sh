#!/bin/bash
# Ömer'in istediği yorumu YouTube'da gizler (moderasyon "rejected"; yazar engellenmez). Önce yorum yedeklenir.
# Liste: sunucu/yorum_kaldir.txt (satır: kanal_id yorum_id)
set -euo pipefail
D=/opt/aesun/youtube; mkdir -p "$D/yedek"
python3 - "$D" "$(pwd)/sunucu/yorum_kaldir.txt" <<'PY'
import json, os, sys, urllib.request, urllib.parse, urllib.error
from datetime import datetime
D, L = sys.argv[1], sys.argv[2]
ist = json.load(open(os.path.join(D, "istemci.json")))
def token(cid):
    t = json.load(open(os.path.join(D, "kanallar", f"{cid}.json")))
    b = urllib.parse.urlencode({"client_id": ist["client_id"], "client_secret": ist["client_secret"], "refresh_token": t["refresh_token"], "grant_type": "refresh_token"}).encode()
    with urllib.request.urlopen(urllib.request.Request("https://oauth2.googleapis.com/token", data=b), timeout=30) as r: return json.load(r)["access_token"]
for sat in open(L):
    p = sat.split()
    if len(p) != 2: continue
    cid, yid = p; H = {"Authorization": f"Bearer {token(cid)}"}
    try:
        with urllib.request.urlopen(urllib.request.Request("https://www.googleapis.com/youtube/v3/comments?part=snippet&id=" + yid, headers=H), timeout=30) as r: once = json.load(r)
        json.dump(once, open(os.path.join(D, "yedek", f"yorum_{yid}_{datetime.now():%Y%m%d%H%M}.json"), "w"), ensure_ascii=False)
        q = urllib.parse.urlencode({"id": yid, "moderationStatus": "rejected", "banAuthor": "false"})
        with urllib.request.urlopen(urllib.request.Request("https://www.googleapis.com/youtube/v3/comments/setModerationStatus?" + q, data=b"", headers=H, method="POST"), timeout=30) as r:
            print("NOT: kaldırıldı", yid, r.status)
    except urllib.error.HTTPError as e:
        print("NOT: HATA", yid, e.code, e.read()[:200])
PY
