#!/bin/bash
# Ömer onayı (9 Kas 2026): yapay görsel/klon ses içeren kanallarda videolara YouTube "yapay zekâ ile üretildi" işareti
# (status.containsSyntheticMedia=true) + Ancient Studio'daki herkese açık Piri Reis kopyasını (2lzVsp3c5Q0) gizliye alma.
# Önce herkese açık videolar, kota için tur başına en çok 110 güncelleme (her biri 50 birim). Silme yok, başka alan değişmez.
set -euo pipefail
D=/opt/aesun/youtube; mkdir -p "$D/yedek"; chmod 700 "$D/yedek"
python3 - "$D" <<'PY'
import json, os, sys, time, urllib.request, urllib.parse
D = sys.argv[1]
ist = json.load(open(os.path.join(D, "istemci.json"), encoding="utf-8"))
KANAL = ["UC77LyY3gqWmBNAKp2lbsGBg", "UCFLJUlhUSgjcLbp9ad_t9PQ", "UCTC_yS0lwl-owMuo5b4bNtQ", "UC7o3DG9m1gBbvMjFZjB5KEg", "UC41-Z82jCQ8955az6JUDIAw"]
GIZLE = {"2lzVsp3c5Q0"}
MAKS = 110
def token(cid):
    t = json.load(open(os.path.join(D, "kanallar", f"{cid}.json"), encoding="utf-8"))
    b = urllib.parse.urlencode({"client_id": ist["client_id"], "client_secret": ist["client_secret"], "refresh_token": t["refresh_token"], "grant_type": "refresh_token"}).encode()
    with urllib.request.urlopen(urllib.request.Request("https://oauth2.googleapis.com/token", data=b), timeout=30) as r:
        return json.load(r)["access_token"]
def api(u, tok, veri=None, yontem=None):
    h = {"Authorization": f"Bearer {tok}"}
    if veri is not None: h["Content-Type"] = "application/json"; veri = json.dumps(veri).encode()
    with urllib.request.urlopen(urllib.request.Request(u, data=veri, headers=h, method=yontem), timeout=40) as r:
        return json.load(r)
yedek, yap, sayac, kalan = {}, [], 0, 0
for cid in KANAL:
    tok = token(cid)
    up = api(f"https://www.googleapis.com/youtube/v3/channels?part=contentDetails&id={cid}", tok)["items"][0]["contentDetails"]["relatedPlaylists"]["uploads"]
    ids, s = [], ""
    while True:
        d = api(f"https://www.googleapis.com/youtube/v3/playlistItems?part=contentDetails&playlistId={up}&maxResults=50" + (f"&pageToken={s}" if s else ""), tok)
        ids += [i["contentDetails"]["videoId"] for i in d.get("items", [])]
        s = d.get("nextPageToken")
        if not s: break
    ids = list(dict.fromkeys(ids))
    for i in range(0, len(ids), 50):
        for v in api("https://www.googleapis.com/youtube/v3/videos?part=status&id=" + ",".join(ids[i:i+50]), tok).get("items", []):
            yedek[v["id"]] = v["status"]
            yap.append((cid, tok, v))
json.dump(yedek, open(os.path.join(D, "yedek", time.strftime("yz_isaret_oncesi_%Y%m%d_%H%M.json")), "w"))
print("NOT: yedek alındı", len(yedek), "video")
yap.sort(key=lambda x: (x[2]["status"].get("privacyStatus") != "public"))
for cid, tok, v in yap:
    st = v["status"]
    gizle = v["id"] in GIZLE and st.get("privacyStatus") == "public"
    if st.get("containsSyntheticMedia") is True and not gizle: continue
    if sayac >= MAKS: kalan += 1; continue
    yeni = {k: st[k] for k in ("privacyStatus", "publishAt", "license", "embeddable", "publicStatsViewable") if k in st}
    yeni["selfDeclaredMadeForKids"] = bool(st.get("madeForKids", False))
    yeni["containsSyntheticMedia"] = True
    if gizle: yeni["privacyStatus"] = "private"; yeni.pop("publishAt", None)
    try:
        api("https://www.googleapis.com/youtube/v3/videos?part=status", tok, {"id": v["id"], "status": yeni}, "PUT")
        sayac += 1
        if gizle: print("NOT: gizliye alındı", v["id"])
    except urllib.error.HTTPError as e:
        print("NOT: HATA", v["id"], e.code, e.read()[:160].decode("utf-8", "ignore")); 
        if e.code == 403: break
print("NOT: yapay zekâ işareti eklendi:", sayac, "· kotadan dolayı sonraki tura kalan:", kalan)
PY
