#!/bin/bash
# YouTube yükleme kuyruğu (bilgisayar gerekmez). .github/workflows/yt_kuyruk.yml çalıştırır.
# Girdi: paket içinde kuyruk/<kod>.json + kuyruk/<kod>.mp4
#   json: {"kod","kanal":"TR|EN","baslik","aciklama","etiketler":[],"kategori":"17","publishAt":"2026-11-05T19:00:00+03:00","sentetik":false,"seri"}
# Kurallar: aynı kod ya da aynı başlık kanalda varsa YÜKLEMEZ; herkese açma yalnız publishAt ile planlıdır; silme yok.
# Çıktı: '===KUYRUK===' ... '===SON===' arasında sırsız JSON sonuç listesi.
set -euo pipefail
D=/opt/aesun/youtube
mkdir -p "$D/yedek"; chmod 700 "$D"
python3 - "$D" "$(pwd)/kuyruk" <<'PY'
import json, os, sys, glob, urllib.request, urllib.parse, urllib.error
D, KQ = sys.argv[1], sys.argv[2]
ist = json.load(open(os.path.join(D, "istemci.json"), encoding="utf-8"))
KANAL = {"TR": "UC77LyY3gqWmBNAKp2lbsGBg", "EN": "UCFLJUlhUSgjcLbp9ad_t9PQ"}
kayit_yol = os.path.join(D, "yuklenen_kuyruk.json")
kayit = json.load(open(kayit_yol, encoding="utf-8")) if os.path.exists(kayit_yol) else {}

def token(cid):
    t = json.load(open(os.path.join(D, "kanallar", f"{cid}.json"), encoding="utf-8"))
    b = urllib.parse.urlencode({"client_id": ist["client_id"], "client_secret": ist["client_secret"],
                                "refresh_token": t["refresh_token"], "grant_type": "refresh_token"}).encode()
    with urllib.request.urlopen(urllib.request.Request("https://oauth2.googleapis.com/token", data=b), timeout=30) as r:
        return json.load(r)["access_token"]

def basliklar(tok, cid):
    up = "UU" + cid[2:]; ids, sayfa = [], ""
    while True:
        u = f"https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId={up}&maxResults=50" + (f"&pageToken={sayfa}" if sayfa else "")
        with urllib.request.urlopen(urllib.request.Request(u, headers={"Authorization": f"Bearer {tok}"}), timeout=30) as r:
            d = json.load(r)
        ids += [(i["snippet"]["title"], i["snippet"]["resourceId"]["videoId"]) for i in d.get("items", [])]
        sayfa = d.get("nextPageToken")
        if not sayfa or len(ids) >= 500: return dict(ids)

sonuc, toklar, mevcut = [], {}, {}
for jf in sorted(glob.glob(os.path.join(KQ, "*.json"))):
    it = json.load(open(jf, encoding="utf-8")); kod = it["kod"]; dil = it["kanal"]
    mp4 = jf[:-5] + ".mp4"
    try:
        if kod in kayit:
            sonuc.append({"kod": kod, "durum": "zaten yüklü", "vid": kayit[kod]["vid"], **{k: it.get(k) for k in ("kanal", "baslik", "publishAt", "seri")}}); continue
        cid = KANAL[dil]
        if dil not in toklar:
            toklar[dil] = token(cid); mevcut[dil] = basliklar(toklar[dil], cid)
        if it["baslik"] in mevcut[dil] and mevcut[dil][it["baslik"]] != it.get("yerine"):
            vid = mevcut[dil][it["baslik"]]; kayit[kod] = {"vid": vid}
            sonuc.append({"kod": kod, "durum": "zaten yüklü (başlık)", "vid": vid, **{k: it.get(k) for k in ("kanal", "baslik", "publishAt", "seri")}}); continue
        boyut = os.path.getsize(mp4)
        dil_kodu = "tr" if dil == "TR" else "en"
        govde = {"snippet": {"title": it["baslik"][:100], "description": it["aciklama"][:4900], "tags": it.get("etiketler", []),
                             "categoryId": it.get("kategori", "27"), "defaultLanguage": dil_kodu, "defaultAudioLanguage": dil_kodu},
                 "status": {"privacyStatus": "private", "publishAt": it["publishAt"], "selfDeclaredMadeForKids": False,
                            "containsSyntheticMedia": bool(it.get("sentetik", False))}}
        req = urllib.request.Request("https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status",
                                     data=json.dumps(govde).encode(), method="POST",
                                     headers={"Authorization": f"Bearer {toklar[dil]}", "Content-Type": "application/json; charset=UTF-8",
                                              "X-Upload-Content-Length": str(boyut), "X-Upload-Content-Type": "video/mp4"})
        with urllib.request.urlopen(req, timeout=60) as r:
            loc = r.headers["Location"]
        with open(mp4, "rb") as f:
            put = urllib.request.Request(loc, data=f.read(), method="PUT", headers={"Content-Type": "video/mp4", "Content-Length": str(boyut)})
        with urllib.request.urlopen(put, timeout=600) as r:
            v = json.load(r)
        kayit[kod] = {"vid": v["id"]}
        try:
            import shutil; os.makedirs(os.path.join(D, "medya"), exist_ok=True); shutil.copy(mp4, os.path.join(D, "medya", f"{kod}.mp4"))
        except Exception: pass
        json.dump(kayit, open(kayit_yol, "w", encoding="utf-8"), ensure_ascii=False)
        sonuc.append({"kod": kod, "durum": "yüklendi ve planlandı", "vid": v["id"], **{k: it.get(k) for k in ("kanal", "baslik", "publishAt", "seri")}})
        print(f"NOT: {kod} yüklendi → {v['id']} (plan {it['publishAt']})")
        # "yerine": aynı içeriğin eski sürümü → planı kaldırılır, Gizli kalır (silme yok, önce yedek)
        eski = it.get("yerine")
        if eski:
            u = f"https://www.googleapis.com/youtube/v3/videos?part=status&id={eski}"
            with urllib.request.urlopen(urllib.request.Request(u, headers={"Authorization": f"Bearer {toklar[dil]}"}), timeout=30) as r:
                m = json.load(r)["items"][0]
            json.dump(m, open(os.path.join(D, "yedek", f"yerine_{eski}.json"), "w", encoding="utf-8"), ensure_ascii=False)
            st = m["status"]
            if st.get("privacyStatus") != "public":
                st.pop("publishAt", None)
                for k in ("uploadStatus", "failureReason", "rejectionReason", "madeForKids"): st.pop(k, None)
                st["privacyStatus"] = "private"
                req = urllib.request.Request("https://www.googleapis.com/youtube/v3/videos?part=status", data=json.dumps({"id": eski, "status": st}).encode(),
                                             method="PUT", headers={"Authorization": f"Bearer {toklar[dil]}", "Content-Type": "application/json"})
                urllib.request.urlopen(req, timeout=30).read()
                sonuc[-1]["eski_gizlendi"] = eski
                print(f"NOT: eski sürüm {eski} planı kaldırıldı (Gizli)")
            else:
                print(f"NOT: eski sürüm {eski} zaten herkese açık; dokunulmadı")
    except urllib.error.HTTPError as e:
        govde = e.read().decode("utf-8", "replace")[:300]
        sonuc.append({"kod": kod, "durum": f"HATA HTTP {e.code}", "detay": govde.replace("\n", " ")})
        print(f"NOT: HATA {kod} HTTP {e.code}")
    except Exception as e:
        sonuc.append({"kod": kod, "durum": f"HATA {type(e).__name__}"}); print(f"NOT: HATA {kod} {type(e).__name__}")
json.dump(kayit, open(kayit_yol, "w", encoding="utf-8"), ensure_ascii=False)
print("===KUYRUK==="); print(json.dumps(sonuc, ensure_ascii=False)); print("===SON===")
PY
