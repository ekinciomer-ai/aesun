#!/bin/bash
# Tek seferlik (21 Kas 2026, Ömer: "arada başka bir ses ekledin, akışı bozuyor"): Kara Kutu Mit #1-#2 Shorts'ları
# karışık TTS modeliyle seslendirildiği için planlı yayından çıkarılır → Gizli (silme YOK, geri alınabilir).
# Doğru sesli sürümler ayrıca yüklenecek. İşlem öncesi durum /opt/aesun/youtube/yedek/ altına yazılır.
set -euo pipefail
D=/opt/aesun/youtube
mkdir -p "$D/yedek"
python3 - "$D" <<'PY'
import json, os, sys, urllib.request, urllib.parse
from datetime import datetime, timedelta, timezone
D = sys.argv[1]; simdi = datetime.now(timezone(timedelta(hours=3)))
ist = json.load(open(os.path.join(D, "istemci.json"), encoding="utf-8"))
CID = "UCYtvxRIP1eF3-f0TAqh2PvA"  # Kara Kutu Mayday
HEDEF = ["ZpPT_3y1I0Y", "xv8CAdgPbQI"]
def token(cid):
    t = json.load(open(os.path.join(D, "kanallar", f"{cid}.json"), encoding="utf-8"))
    b = urllib.parse.urlencode({"client_id": ist["client_id"], "client_secret": ist["client_secret"], "refresh_token": t["refresh_token"], "grant_type": "refresh_token"}).encode()
    with urllib.request.urlopen(urllib.request.Request("https://oauth2.googleapis.com/token", data=b), timeout=30) as r:
        return json.load(r)["access_token"]
def api(url, tok, veri=None, yontem=None):
    h = {"Authorization": f"Bearer {tok}"}
    if veri is not None: h["Content-Type"] = "application/json"; veri = json.dumps(veri).encode()
    with urllib.request.urlopen(urllib.request.Request(url, data=veri, headers=h, method=yontem), timeout=40) as r:
        return json.load(r)
tok = token(CID)
for vid in HEDEF:
    its = api(f"https://www.googleapis.com/youtube/v3/videos?part=status,snippet&id={vid}", tok).get("items", [])
    if not its: print(f"NOT: {vid} bulunamadı"); continue
    v = its[0]; st = v["status"]
    json.dump(v, open(os.path.join(D, "yedek", f"kk_beklet_{vid}_{simdi.strftime('%Y%m%d%H%M')}.json"), "w", encoding="utf-8"), ensure_ascii=False)
    if st.get("privacyStatus") == "public":
        print(f"NOT: {vid} zaten herkese açık, dokunulmadı"); continue
    st["privacyStatus"] = "private"; st.pop("publishAt", None)
    for x in ("uploadStatus", "failureReason", "rejectionReason", "madeForKids"): st.pop(x, None)
    api("https://www.googleapis.com/youtube/v3/videos?part=status", tok, {"id": vid, "status": st}, "PUT")
    son = api(f"https://www.googleapis.com/youtube/v3/videos?part=status&id={vid}", tok)["items"][0]["status"]
    print(f"NOT: BEKLETİLDİ {vid} · {v['snippet']['title'][:50]} -> {son.get('privacyStatus')} publishAt={son.get('publishAt')}")
PY
