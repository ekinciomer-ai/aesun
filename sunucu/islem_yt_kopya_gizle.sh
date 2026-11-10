#!/bin/bash
# Tek seferlik (10 Kas 2026): Antik Stüdyo'daki iki tekrar eden kopyayı Gizli'ye alır (silme YOK, geri alınabilir).
#  - RLOK3eLO8wQ (mihrap, 10 Kas 14:00) -> asıl: cmmPBbDMpsA (herkese açık)
#  - cJ-0QhR2VtY (devekuşu yumurtası, 11 Kas 14:00 planlı) -> asıl: kXI2HQhm1tU (planlı, aynı saat)
# Ayrıca: 10 Kas 19:00/21:00 planlıların gerçek durumunu ve beş kanalda aynı başlıkla açık/planlı kalan kopyaları RAPORLAR (dokunmaz).
# İşlem öncesi her videonun durumu /opt/aesun/youtube/yedek/ altına yazılır. Geri alma: yedekteki status ile PUT.
set -euo pipefail
D=/opt/aesun/youtube
python3 - "$D" <<'PY'
import json, os, sys, re, urllib.request, urllib.parse
from datetime import datetime, timedelta, timezone
D = sys.argv[1]; TZ = timezone(timedelta(hours=3)); simdi = datetime.now(TZ)
ist = json.load(open(os.path.join(D, "istemci.json"), encoding="utf-8"))
KANALLAR = {"UC77LyY3gqWmBNAKp2lbsGBg": "Antik Stüdyo", "UCFLJUlhUSgjcLbp9ad_t9PQ": "Ancient Studio",
            "UCTC_yS0lwl-owMuo5b4bNtQ": "Estudio Antiguo", "UC7o3DG9m1gBbvMjFZjB5KEg": "Kozmos Lab TR",
            "UC41-Z82jCQ8955az6JUDIAw": "Kozmos Lab"}
GIZLE = [("RLOK3eLO8wQ", "cmmPBbDMpsA"), ("cJ-0QhR2VtY", "kXI2HQhm1tU")]
KONTROL = ["MUV-poUW_ro", "7naXMebQd70", "HDiPtzD4qC4"]

def token(cid):
    t = json.load(open(os.path.join(D, "kanallar", f"{cid}.json"), encoding="utf-8"))
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

def sn(d):
    m = re.match(r"PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?", d or "")
    return (int(m.group(1) or 0)*3600 + int(m.group(2) or 0)*60 + int(m.group(3) or 0)) if m else -99

def norm(t):
    return re.sub(r"[^a-z0-9çğıöşü]+", "", (t or "").lower())

for cid, ad in KANALLAR.items():
    try:
        tok = token(cid)
        up = api(f"https://www.googleapis.com/youtube/v3/channels?part=contentDetails&id={cid}", tok)["items"][0]["contentDetails"]["relatedPlaylists"]["uploads"]
        ids, sayfa = [], ""
        while True:
            d = api(f"https://www.googleapis.com/youtube/v3/playlistItems?part=contentDetails&playlistId={up}&maxResults=50" + (f"&pageToken={sayfa}" if sayfa else ""), tok)
            ids += [i["contentDetails"]["videoId"] for i in d.get("items", [])]
            sayfa = d.get("nextPageToken")
            if not sayfa or len(ids) >= 500: break
        V = {}
        for i in range(0, len(ids), 50):
            for v in api("https://www.googleapis.com/youtube/v3/videos?part=snippet,status,statistics,contentDetails&id=" + ",".join(ids[i:i+50]), tok).get("items", []):
                V[v["id"]] = v
        def ozet(v):
            st = v["status"]
            return f"{st.get('privacyStatus')} publishAt={st.get('publishAt')} upload={st.get('uploadStatus')} izlenme={v.get('statistics',{}).get('viewCount')}"
        for w in KONTROL:
            if w in V: print(f"NOT: KONTROL {ad} {w}: {ozet(V[w])} · {V[w]['snippet']['title'][:45]}")
        for gid, kid in GIZLE:
            if gid not in V: continue
            g, k = V[gid], V.get(kid)
            gs, ks = g["status"], (k or {}).get("status", {})
            if gs.get("privacyStatus") == "private" and not gs.get("publishAt"):
                print(f"NOT: {gid} zaten gizli"); continue
            asil_ok = k is not None and (ks.get("privacyStatus") == "public" or ks.get("publishAt")) \
                      and abs(sn(k["contentDetails"].get("duration")) - sn(g["contentDetails"].get("duration"))) <= 3 \
                      and norm(k["snippet"]["title"]) == norm(g["snippet"]["title"])
            if not asil_ok:
                print(f"NOT: {gid} ATLANDI (asıl {kid} doğrulanamadı)"); continue
            mevcut = api(f"https://www.googleapis.com/youtube/v3/videos?part=status&id={gid}", tok)["items"][0]
            json.dump(mevcut, open(os.path.join(D, "yedek", f"gizle_{gid}_{simdi.strftime('%Y%m%d%H%M')}.json"), "w", encoding="utf-8"), ensure_ascii=False)
            st = mevcut["status"]; st["privacyStatus"] = "private"; st.pop("publishAt", None)
            for x in ("uploadStatus", "failureReason", "rejectionReason", "madeForKids"): st.pop(x, None)
            api("https://www.googleapis.com/youtube/v3/videos?part=status", tok, {"id": gid, "status": st}, "PUT")
            son = api(f"https://www.googleapis.com/youtube/v3/videos?part=status&id={gid}", tok)["items"][0]["status"]
            print(f"NOT: GİZLENDİ {ad} {gid} -> {son.get('privacyStatus')} publishAt={son.get('publishAt')} (asıl {kid} kaldı)")
        # rapor: aynı başlıkla birden fazla açık/planlı
        grup = {}
        for vid, v in V.items():
            st = v["status"]
            if st.get("privacyStatus") == "public" or st.get("publishAt"):
                grup.setdefault(norm(v["snippet"]["title"]), []).append(vid)
        gizlenen = {g for g, _ in GIZLE}
        for t, l in grup.items():
            l = [x for x in l if x not in gizlenen]
            if len(l) > 1: print(f"NOT: KOPYA RAPOR {ad}: {', '.join(l)} · {V[l[0]]['snippet']['title'][:45]}")
    except Exception as e:
        print(f"NOT: HATA {ad}: {type(e).__name__} {str(e)[:120]}")
PY
