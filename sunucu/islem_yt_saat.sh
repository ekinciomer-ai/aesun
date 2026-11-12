#!/bin/bash
# Planlı videoların yayın saatini değiştirir (sunucu/yt_saat_degis.json). Silme/gizleme yok; eski publishAt yedeklenir.
# Güvenlik: yalnız hâlâ planlı (private + publishAt) videolara dokunur; yeni tarih eski tarihle aynı gün değilse atlar.
set -euo pipefail
D=/opt/aesun/youtube
python3 - "$D" "$(pwd)/sunucu/yt_saat_degis.json" <<'PY'
import json, os, sys, urllib.request, urllib.parse
from datetime import datetime, timedelta, timezone
D, F = sys.argv[1], sys.argv[2]
TZ = timezone(timedelta(hours=3)); simdi = datetime.now(TZ)
cfg = json.load(open(F, encoding="utf-8")); CID = cfg["kanal"]
ist = json.load(open(os.path.join(D, "istemci.json"), encoding="utf-8"))
t = json.load(open(os.path.join(D, "kanallar", f"{CID}.json"), encoding="utf-8"))
b = urllib.parse.urlencode({"client_id": ist["client_id"], "client_secret": ist["client_secret"], "refresh_token": t["refresh_token"], "grant_type": "refresh_token"}).encode()
tok = json.load(urllib.request.urlopen(urllib.request.Request("https://oauth2.googleapis.com/token", data=b), timeout=30))["access_token"]
def api(url, veri=None, yontem=None):
    h = {"Authorization": f"Bearer {tok}"}
    if veri is not None: h["Content-Type"] = "application/json"; veri = json.dumps(veri).encode()
    return json.load(urllib.request.urlopen(urllib.request.Request(url, data=veri, headers=h, method=yontem), timeout=40))
yedek = []
for d in cfg["degisim"]:
    v = api(f"https://www.googleapis.com/youtube/v3/videos?part=status,snippet&id={d['vid']}")["items"]
    if not v: print(f"NOT: BULUNAMADI {d['vid']}"); continue
    v = v[0]; st = dict(v["status"]); pa = st.get("publishAt")
    if not pa: print(f"NOT: ATLANDI {d['vid']} (planlı değil)"); continue
    eski = datetime.fromisoformat(pa.replace("Z", "+00:00")).astimezone(TZ)
    yeni = datetime.strptime(d["yeni"], "%Y-%m-%d %H:%M").replace(tzinfo=TZ)
    if eski.date() != yeni.date() or yeni <= simdi + timedelta(minutes=30):
        print(f"NOT: ATLANDI {d['vid']} (gün farklı ya da saat geçmiş: {eski:%d.%m %H:%M})"); continue
    yedek.append({"vid": d["vid"], "eski_publishAt": pa})
    for x in ("uploadStatus", "failureReason", "rejectionReason", "madeForKids", "publicStatsViewable"): st.pop(x, None)
    st["privacyStatus"] = "private"; st["publishAt"] = yeni.astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    api("https://www.googleapis.com/youtube/v3/videos?part=status", {"id": d["vid"], "status": st}, "PUT")
    print(f"NOT: SAAT {d['vid']} | {eski:%d.%m %H:%M} -> {yeni:%d.%m %H:%M} | {v['snippet']['title'][:45]}")
json.dump(yedek, open(os.path.join(D, "yedek", f"saat_{simdi:%Y%m%d%H%M}.json"), "w"), indent=1)
PY
