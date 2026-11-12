#!/bin/bash
# Tek seferlik (12 Kas 2026, Ömer kararı): Antik Stüdyo planlı videolarını günde en fazla 2 olacak şekilde ileri günlere yayar.
# Silme yok, gizleme yok; yalnız planlanan yayın zamanı (publishAt) değişir. Saatler: Gündem/Spor + Tarih 19:00, diğerleri 18:00.
# Önceki publishAt değerleri /opt/aesun/youtube/yedek/gunde2_<tarih>.json dosyasına yazılır (geri alma: o dosyadaki publishAt ile PUT).
set -euo pipefail
D=/opt/aesun/youtube
python3 - "$D" "$(pwd)/sunucu/yt_seri_haritasi.json" <<'PY'
import json, os, sys, urllib.request, urllib.parse
from datetime import datetime, timedelta, timezone
D, YAYIN = sys.argv[1], sys.argv[2]
TZ = timezone(timedelta(hours=3)); simdi = datetime.now(TZ)
CID = "UC77LyY3gqWmBNAKp2lbsGBg"
GUNLUK = 2
ist = json.load(open(os.path.join(D, "istemci.json"), encoding="utf-8"))
try:
    seri = {r["vid"]: r.get("seri") or "" for r in json.load(open(YAYIN, encoding="utf-8"))["kayitlar"] if r.get("vid")}
except Exception:
    seri = {}

def token():
    t = json.load(open(os.path.join(D, "kanallar", f"{CID}.json"), encoding="utf-8"))
    b = urllib.parse.urlencode({"client_id": ist["client_id"], "client_secret": ist["client_secret"],
                                "refresh_token": t["refresh_token"], "grant_type": "refresh_token"}).encode()
    with urllib.request.urlopen(urllib.request.Request("https://oauth2.googleapis.com/token", data=b), timeout=30) as r:
        return json.load(r)["access_token"]

def api(url, tok, veri=None, yontem=None):
    h = {"Authorization": f"Bearer {tok}"}
    if veri is not None:
        h["Content-Type"] = "application/json"; veri = json.dumps(veri).encode()
    with urllib.request.urlopen(urllib.request.Request(url, data=veri, headers=h, method=yontem), timeout=40) as r:
        return json.load(r)

tok = token()
up = api(f"https://www.googleapis.com/youtube/v3/channels?part=contentDetails&id={CID}", tok)["items"][0]["contentDetails"]["relatedPlaylists"]["uploads"]
ids, sayfa = [], ""
while True:
    d = api(f"https://www.googleapis.com/youtube/v3/playlistItems?part=contentDetails&playlistId={up}&maxResults=50" + (f"&pageToken={sayfa}" if sayfa else ""), tok)
    ids += [i["contentDetails"]["videoId"] for i in d.get("items", [])]
    sayfa = d.get("nextPageToken")
    if not sayfa: break
V = []
for i in range(0, len(ids), 50):
    for v in api("https://www.googleapis.com/youtube/v3/videos?part=snippet,status&id=" + ",".join(ids[i:i+50]), tok).get("items", []):
        pa = v["status"].get("publishAt")
        if pa:
            t = datetime.fromisoformat(pa.replace("Z", "+00:00")).astimezone(TZ)
            if t > simdi + timedelta(minutes=20):
                V.append((t, v))
V.sort(key=lambda x: x[0])
# Yayınlanmış (bugün) videoları gün sayımına kat
dolu = {}
yedek = []
plan = []
for t, v in V:
    vid = v["id"]; s = seri.get(vid, "")
    tercih = "19:00" if s in ("Gündem + Tarih", "Spor + Tarih") else "18:00"
    gun = t.date()
    while True:
        saatler = dolu.setdefault(gun, [])
        if len(saatler) < GUNLUK:
            # aynı gün aynı saat çakışmasın; orijinal saati koru, çakışırsa tercih/diğer slot
            aday = [t.strftime("%H:%M"), tercih, "18:00", "19:00", "21:00"]
            if len(saatler) == 0 and t.date() == gun:
                saat = t.strftime("%H:%M")
            else:
                saat = next(a for a in aday if a not in saatler)
            yeni = datetime.strptime(f"{gun} {saat}", "%Y-%m-%d %H:%M").replace(tzinfo=TZ)
            if yeni <= simdi + timedelta(minutes=30):
                gun += timedelta(days=1); continue
            saatler.append(saat)
            break
        gun += timedelta(days=1)
    plan.append((v, t, yeni, s))

json.dump([{"vid": v["id"], "baslik": v["snippet"]["title"], "eski_publishAt": v["status"]["publishAt"]} for v, t, y, s in plan],
          open(os.path.join(D, "yedek", f"gunde2_{simdi.strftime('%Y%m%d%H%M')}.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
degisen = 0
for v, eski, yeni, s in plan:
    if yeni == eski:
        continue
    st = dict(v["status"])
    for x in ("uploadStatus", "failureReason", "rejectionReason", "madeForKids", "publicStatsViewable"):
        st.pop(x, None)
    st["privacyStatus"] = "private"
    st["publishAt"] = yeni.astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    try:
        api("https://www.googleapis.com/youtube/v3/videos?part=status", tok, {"id": v["id"], "status": st}, "PUT")
        degisen += 1
        print(f"NOT: TAŞINDI {v['id']} | {eski.strftime('%d.%m %H:%M')} -> {yeni.strftime('%Y-%m-%d %H:%M')} | {s} | {v['snippet']['title'][:45]}")
    except Exception as e:
        print(f"NOT: HATA {v['id']} {type(e).__name__} {str(e)[:100]}")
print(f"NOT: ÖZET {len(plan)} planlı video, {degisen} tanesi taşındı; günde en fazla {GUNLUK}")
PY
