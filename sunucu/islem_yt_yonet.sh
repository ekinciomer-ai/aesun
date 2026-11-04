#!/bin/bash
# Kanal yönetimi (otomatik, günde 2 kez; .github/workflows/yayin_yonet.yml çalıştırır).
# 1) Her iki kanalın TÜM yüklemelerinin gerçek durumunu okur (herkese açık / planlı / gizli, yayın saati).
# 2) YouTube Analytics'ten video başına izlenme, ortalama izlenme süresi ve izlenme yüzdesini okur.
# 3) docs/yayin/analiz.json eylemlerini uygular: GİZLE (tekrar eden kopya → Gizli), ERTELE (durdurulan serinin ileri tarihli planını kaldırır).
#    YASAK: silme, herkese açma, planlama, başlık/açıklama değişikliği. İşlem öncesi durum yedeklenir.
# Çıktı: '===ANALITIK===' ile '===SON===' arasında sırsız JSON (iş akışı bunu docs/yayin/analitik.json'a yazar).
set -euo pipefail
D=/opt/aesun/youtube
mkdir -p "$D/yedek"; chmod 700 "$D" "$D/yedek"
python3 - "$D" "$(pwd)/docs_analiz.json" <<'PY'
import json, os, sys, urllib.request, urllib.parse, urllib.error
from datetime import datetime, timedelta, timezone
D, ANALIZ = sys.argv[1], sys.argv[2]
TZ = timezone(timedelta(hours=3))
simdi = datetime.now(TZ)
ist = json.load(open(os.path.join(D, "istemci.json"), encoding="utf-8"))
KANALLAR = {"UC77LyY3gqWmBNAKp2lbsGBg": "Antik Stüdyo", "UCFLJUlhUSgjcLbp9ad_t9PQ": "Ancient Studio"}
MAKS_GIZLE = 3

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
    req = urllib.request.Request(url, data=veri, headers=h, method=yontem)
    with urllib.request.urlopen(req, timeout=40) as r:
        return json.load(r)

try:
    analiz = json.load(open(ANALIZ, encoding="utf-8"))
except Exception:
    analiz = {}
gizle = [e for e in analiz.get("eylemler", []) if e.get("tur") == "GİZLE" and e.get("vid")]

out = {"zaman": simdi.isoformat(timespec="minutes"), "kanallar": {}, "islemler": [], "hatalar": []}
for cid, ad in KANALLAR.items():
    try:
        tok = token(cid)
        ch = api(f"https://www.googleapis.com/youtube/v3/channels?part=contentDetails,statistics&id={cid}", tok)["items"][0]
        up = ch["contentDetails"]["relatedPlaylists"]["uploads"]
        ids, sayfa = [], ""
        while True:
            d = api(f"https://www.googleapis.com/youtube/v3/playlistItems?part=contentDetails&playlistId={up}&maxResults=50" + (f"&pageToken={sayfa}" if sayfa else ""), tok)
            ids += [i["contentDetails"]["videoId"] for i in d.get("items", [])]
            sayfa = d.get("nextPageToken")
            if not sayfa or len(ids) >= 500: break
        videolar = {}
        for i in range(0, len(ids), 50):
            d = api("https://www.googleapis.com/youtube/v3/videos?part=snippet,status,statistics,contentDetails&id=" + ",".join(ids[i:i+50]), tok)
            for v in d.get("items", []):
                st, sn = v.get("status", {}), v.get("snippet", {})
                videolar[v["id"]] = {"baslik": sn.get("title"), "durum": st.get("privacyStatus"), "uploadStatus": st.get("uploadStatus"),
                                     "publishAt": st.get("publishAt"), "publishedAt": sn.get("publishedAt"),
                                     "sure": v.get("contentDetails", {}).get("duration"),
                                     "izlenme": int(v.get("statistics", {}).get("viewCount", 0) or 0),
                                     "begeni": int(v.get("statistics", {}).get("likeCount", 0) or 0),
                                     "yorum": int(v.get("statistics", {}).get("commentCount", 0) or 0),
                                     "sentetik": st.get("containsSyntheticMedia")}
        # Analytics: video başına izlenme süresi ve izlenme yüzdesi (veri 1-2 gün gecikmeli gelir)
        try:
            q = urllib.parse.urlencode({"ids": "channel==MINE", "startDate": (simdi - timedelta(days=60)).strftime("%Y-%m-%d"),
                                        "endDate": simdi.strftime("%Y-%m-%d"), "dimensions": "video",
                                        "metrics": "views,averageViewDuration,averageViewPercentage,likes,subscribersGained",
                                        "sort": "-views", "maxResults": 200})
            a = api("https://youtubeanalytics.googleapis.com/v2/reports?" + q, tok)
            kol = [c["name"] for c in a.get("columnHeaders", [])]
            for r in a.get("rows", []):
                x = dict(zip(kol, r)); v = videolar.get(x["video"])
                if v is not None:
                    v.update(an_izlenme=x.get("views"), ort_sure_sn=x.get("averageViewDuration"),
                             izlenme_yuzde=round(x.get("averageViewPercentage") or 0, 1), abone_kazanc=x.get("subscribersGained"))
        except urllib.error.HTTPError as e:
            out["hatalar"].append(f"{ad} analitik: HTTP {e.code}")
        # GİZLE: yalnız bu kanalın videosu, şu an public/planlı ise, en fazla MAKS_GIZLE
        for e in [e for e in gizle if e["vid"] in videolar][:MAKS_GIZLE]:
            v = videolar[e["vid"]]
            if v["durum"] == "private" and not v.get("publishAt"):
                continue
            k = videolar.get(e.get("kalan") or "")
            def sn(d):
                import re as _r
                m = _r.match(r"PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?", d or "")
                return (int(m.group(1) or 0) * 3600 + int(m.group(2) or 0) * 60 + int(m.group(3) or 0)) if m else -99
            # güvenlik: kalacak asıl video bu kanalda HERKESE AÇIK olmalı ve süreleri aynı olmalı (gerçek tekrar)
            if not k or k["durum"] != "public" or abs(sn(k.get("sure")) - sn(v.get("sure"))) > 3:
                print(f"NOT: {ad} · {e['vid']} atlandı (asıl video doğrulanamadı)")
                continue
            mevcut = api(f"https://www.googleapis.com/youtube/v3/videos?part=status&id={e['vid']}", tok)["items"][0]
            yedek = os.path.join(D, "yedek", f"gizle_{e['vid']}_{simdi.strftime('%Y%m%d%H%M')}.json")
            json.dump(mevcut, open(yedek, "w", encoding="utf-8"), ensure_ascii=False)
            st = mevcut["status"]; st["privacyStatus"] = "private"; st.pop("publishAt", None)
            for k in ("uploadStatus", "failureReason", "rejectionReason", "madeForKids"):
                st.pop(k, None)
            api("https://www.googleapis.com/youtube/v3/videos?part=status", tok, {"id": e["vid"], "status": st}, "PUT")
            v["durum"] = "private"; v["publishAt"] = None
            out["islemler"].append({"zaman": simdi.isoformat(timespec="minutes"), "kanal": ad, "vid": e["vid"],
                                    "islem": "Gizli'ye alındı", "neden": e.get("neden")})
            print(f"NOT: {ad} · {e['vid']} Gizli'ye alındı (tekrar)")
        # ERTELE: durdurulan serinin İLERİ TARİHLİ planı kaldırılır (video Gizli kalır, silinmez; plan yeniden kurulabilir)
        for e in [e for e in analiz.get("eylemler", []) if e.get("tur") == "ERTELE" and e.get("vid") in videolar][:5]:
            v = videolar[e["vid"]]
            if v["durum"] != "private" or not v.get("publishAt"):
                continue
            mevcut = api(f"https://www.googleapis.com/youtube/v3/videos?part=status&id={e['vid']}", tok)["items"][0]
            json.dump(mevcut, open(os.path.join(D, "yedek", f"ertele_{e['vid']}_{simdi.strftime('%Y%m%d%H%M')}.json"), "w", encoding="utf-8"), ensure_ascii=False)
            st = mevcut["status"]; eski_plan = st.pop("publishAt", None)
            for k in ("uploadStatus", "failureReason", "rejectionReason", "madeForKids"):
                st.pop(k, None)
            api("https://www.googleapis.com/youtube/v3/videos?part=status", tok, {"id": e["vid"], "status": st}, "PUT")
            v["publishAt"] = None
            out["islemler"].append({"zaman": simdi.isoformat(timespec="minutes"), "kanal": ad, "vid": e["vid"],
                                    "islem": f"planı kaldırıldı (eski plan {eski_plan})", "neden": e.get("neden")})
            print(f"NOT: {ad} · {e['vid']} planı kaldırıldı (seri durduruldu)")
        out["kanallar"][ad] = {"id": cid, "abone": int(ch["statistics"].get("subscriberCount", 0) or 0),
                               "toplam_izlenme": int(ch["statistics"].get("viewCount", 0) or 0), "videolar": videolar}
        print(f"NOT: {ad}: {len(videolar)} video okundu")
    except Exception as e:
        out["hatalar"].append(f"{ad}: {type(e).__name__} {e}"[:200])
        print(f"NOT: HATA {ad}: {type(e).__name__}")
print("===ANALITIK===")
print(json.dumps(out, ensure_ascii=False))
print("===SON===")
PY
