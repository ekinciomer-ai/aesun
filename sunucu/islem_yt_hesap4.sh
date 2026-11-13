#!/bin/bash
# (13 Kas 2026, Ömer: "yayınları azalt") — 2. çalıştırma: TARİHE BAĞLI videolar SABIT listesiyle asıl günlerine döner.
# Tek seferlik: 6 kanalın planlı videolarını hesap genelinde günde en fazla 4 yayına yayar.
# Öncelik Antik Stüdyo (yerinde kalır), sonra diğer kanallar kendi sıralarıyla ilk boş güne (aynı saat) kayar.
# Silme/gizleme yok; yalnız publishAt değişir. Eski değerler /opt/aesun/youtube/yedek/hesap4_<zaman>.json
set -euo pipefail
D=/opt/aesun/youtube
python3 - "$D" <<'PY'
import json, os, sys, urllib.request, urllib.parse
from datetime import datetime, timedelta, timezone
D = sys.argv[1]; TZ = timezone(timedelta(hours=3)); simdi = datetime.now(TZ); GUNLUK = 4
# Tarihe bağlı içerik (gök olayı "bu gece / yarın / sıradaki 24 Kasım"): ASLA kaydırılmaz, asıl saatine sabitlenir.
SABIT = {"XiWQHCF8pPI": "2026-11-17 21:00", "SSWnBsrAjQU": "2026-11-18 02:00", "L5IIRYQ0i7c": "2026-11-19 21:00",
         "Xv82CELi5hM": "2026-11-20 02:00", "yCiaMGpe34E": "2026-11-23 21:00", "vbF9fnQz3Lc": "2026-11-24 02:00",
         "QAzkFFZij2E": "2026-11-24 21:00", "ZXqZrhJmIs8": "2026-11-25 02:00"}
KANAL = [("TR", "UC77LyY3gqWmBNAKp2lbsGBg"), ("EN", "UCFLJUlhUSgjcLbp9ad_t9PQ"), ("ES", "UCTC_yS0lwl-owMuo5b4bNtQ"),
         ("KZ_TR", "UC7o3DG9m1gBbvMjFZjB5KEg"), ("KZ_EN", "UC41-Z82jCQ8955az6JUDIAw"), ("OD", "UCg75Mvb6C8CBSJPeuwzBFZA")]
ist = json.load(open(os.path.join(D, "istemci.json"), encoding="utf-8"))
def token(cid):
    t = json.load(open(os.path.join(D, "kanallar", f"{cid}.json"), encoding="utf-8"))
    b = urllib.parse.urlencode({"client_id": ist["client_id"], "client_secret": ist["client_secret"], "refresh_token": t["refresh_token"], "grant_type": "refresh_token"}).encode()
    return json.load(urllib.request.urlopen(urllib.request.Request("https://oauth2.googleapis.com/token", data=b), timeout=30))["access_token"]
def api(url, tok, veri=None, yontem=None):
    h = {"Authorization": f"Bearer {tok}"}
    if veri is not None: h["Content-Type"] = "application/json"; veri = json.dumps(veri).encode()
    return json.load(urllib.request.urlopen(urllib.request.Request(url, data=veri, headers=h, method=yontem), timeout=40))
gun = {}; planli = []
for kod, cid in KANAL:
    try:
        tok = token(cid)
    except Exception as e:
        print(f"NOT: {kod} token yok ({type(e).__name__}), atlandı"); continue
    ids, sayfa = [], ""
    while True:
        d = api(f"https://www.googleapis.com/youtube/v3/playlistItems?part=contentDetails&playlistId=UU{cid[2:]}&maxResults=50" + (f"&pageToken={sayfa}" if sayfa else ""), tok)
        ids += [i["contentDetails"]["videoId"] for i in d.get("items", [])]; sayfa = d.get("nextPageToken")
        if not sayfa or len(ids) >= 300: break
    for i in range(0, len(ids), 50):
        for v in api("https://www.googleapis.com/youtube/v3/videos?part=snippet,status&id=" + ",".join(ids[i:i+50]), tok).get("items", []):
            st = v["status"]; pa = st.get("publishAt")
            if pa:
                t = datetime.fromisoformat(pa.replace("Z", "+00:00")).astimezone(TZ)
                if t > simdi + timedelta(minutes=30):
                    planli.append({"kod": kod, "tok": tok, "v": v, "t": t}); continue
            if st.get("privacyStatus") == "public":
                g = datetime.fromisoformat(v["snippet"]["publishedAt"].replace("Z", "+00:00")).astimezone(TZ).date()
                if g == simdi.date(): gun[g] = gun.get(g, 0) + 1
# Öncelik: Antik Stüdyo önce, sonra zaman sırası
for p in planli:
    if p["v"]["id"] in SABIT:
        p["t_hedef"] = datetime.strptime(SABIT[p["v"]["id"]], "%Y-%m-%d %H:%M").replace(tzinfo=TZ)
planli.sort(key=lambda p: (p["v"]["id"] not in SABIT, p["kod"] != "TR", p["t"]))
yedek, degisen = [], 0
for p in planli:
    t = p["t"]
    if "t_hedef" in p:  # sabit: günü doluluğa bakmadan asıl tarihine
        yeni = p["t_hedef"]; g = yeni.date(); gun[g] = gun.get(g, 0) + 1
    else:
        g = t.date()
        while gun.get(g, 0) >= GUNLUK: g += timedelta(days=1)
        gun[g] = gun.get(g, 0) + 1
        yeni = t.replace(year=g.year, month=g.month, day=g.day)
    if yeni == t: continue
    v = p["v"]; st = dict(v["status"])
    yedek.append({"vid": v["id"], "kanal": p["kod"], "eski_publishAt": st["publishAt"]})
    for x in ("uploadStatus", "failureReason", "rejectionReason", "madeForKids", "publicStatsViewable"): st.pop(x, None)
    st["privacyStatus"] = "private"; st["publishAt"] = yeni.astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    try:
        api("https://www.googleapis.com/youtube/v3/videos?part=status", p["tok"], {"id": v["id"], "status": st}, "PUT"); degisen += 1
        print(f"NOT: TAŞINDI {v['id']} | {p['kod']} | {t:%Y-%m-%d %H:%M} -> {yeni:%Y-%m-%d %H:%M} | {v['snippet']['title'][:40]}")
    except Exception as e:
        print(f"NOT: HATA {v['id']} {type(e).__name__} {str(e)[:80]}")
json.dump(yedek, open(os.path.join(D, "yedek", f"hesap4_{simdi:%Y%m%d%H%M}.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print(f"NOT: ÖZET {len(planli)} planlı video, {degisen} taşındı; hesap genelinde günde en fazla {GUNLUK}")
for g in sorted(gun): print(f"NOT: GÜN {g} {gun[g]}")
PY
