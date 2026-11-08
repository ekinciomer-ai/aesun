#!/bin/bash
# Tablo yorumu videolarını (sunucu/yt/tablo_paketi.json) YouTube'a yükler ve planlar.
# Kurallar: önce kanal yedeği; aynı başlık zaten varsa atlar; yapay zekâ beyanı işaretlenir; sır yazdırılmaz.
set -euo pipefail
D=/opt/aesun/youtube; P=/tmp/aesun_paket
mkdir -p "$D/yedek"; chmod 700 "$D" "$D/yedek"
python3 - "$D" "$P" <<'PY'
import json, os, sys, urllib.error, urllib.parse, urllib.request
from datetime import datetime, timezone, timedelta
D, P = sys.argv[1], sys.argv[2]
TZ = timezone(timedelta(hours=3))
ist = json.load(open(os.path.join(D, "istemci.json"), encoding="utf-8"))
paket = json.load(open(os.path.join(P, "sunucu/yt/tablo_paketi.json"), encoding="utf-8"))
def token(cid):
    t = json.load(open(os.path.join(D, "kanallar", f"{cid}.json"), encoding="utf-8"))
    body = urllib.parse.urlencode({"client_id": ist["client_id"], "client_secret": ist["client_secret"],
        "refresh_token": t["refresh_token"], "grant_type": "refresh_token"}).encode()
    return json.load(urllib.request.urlopen(urllib.request.Request("https://oauth2.googleapis.com/token", data=body), timeout=30))["access_token"]
def get(url, tok):
    return json.load(urllib.request.urlopen(urllib.request.Request(url, headers={"Authorization": f"Bearer {tok}"}), timeout=30))
kayit_yol = os.path.join(D, "tablo_yuklenenler.json")
yuklenen = json.load(open(kayit_yol)) if os.path.exists(kayit_yol) else {}
for it in paket:
    cid = it["kanal"]; tok = token(cid)
    # önce yedek: kanaldaki son videolar
    d = get(f"https://www.googleapis.com/youtube/v3/playlistItems?part=snippet,contentDetails&playlistId=UU{cid[2:]}&maxResults=50", tok)
    yedek = os.path.join(D, "yedek", f"tablo_once_{datetime.now(TZ).strftime('%Y%m%d_%H%M%S')}.json")
    json.dump(d, open(yedek, "w", encoding="utf-8"), ensure_ascii=False); os.chmod(yedek, 0o600)
    print("NOT: kanal yedeği alındı", os.path.basename(yedek))
    basliklar = {x["snippet"]["title"]: x["contentDetails"]["videoId"] for x in d.get("items", [])}
    if it["kod"] in yuklenen or it["baslik"] in basliklar:
        print("NOT: ATLANDI (zaten yüklü)", it["kod"], yuklenen.get(it["kod"], {}).get("vid") or basliklar.get(it["baslik"])); continue
    yol = os.path.join(P, it["dosya"]); boyut = os.path.getsize(yol)
    govde = {"snippet": {"title": it["baslik"][:100], "description": it["aciklama"], "tags": it["etiketler"],
                         "categoryId": it["kategori"], "defaultLanguage": it["dil"], "defaultAudioLanguage": it["dil"]},
             "status": {"privacyStatus": "private", "publishAt": it["publishAt"], "selfDeclaredMadeForKids": False,
                        "containsSyntheticMedia": bool(it["yapay_zeka"])}}
    def baslat(g):
        r = urllib.request.Request("https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status",
            data=json.dumps(g).encode(), method="POST", headers={"Authorization": f"Bearer {tok}", "Content-Type": "application/json; charset=UTF-8",
            "X-Upload-Content-Type": "video/mp4", "X-Upload-Content-Length": str(boyut)})
        return urllib.request.urlopen(r, timeout=30).headers.get("Location")
    try:
        try:
            loc = baslat(govde)
        except urllib.error.HTTPError as e:
            m = e.read().decode("utf-8", "replace")
            if "quota" in m.lower():
                print("NOT: HATA günlük YouTube kotası doldu"); break
            print("NOT: planlı yükleme reddedildi, özel yükleniyor:", m[:160].replace("\n", " "))
            govde["status"].pop("publishAt", None); loc = baslat(govde)
        up = urllib.request.Request(loc, data=open(yol, "rb").read(), method="PUT", headers={"Content-Type": "video/mp4", "Content-Length": str(boyut)})
        s = json.load(urllib.request.urlopen(up, timeout=600))
        st = s.get("status", {})
        yuklenen[it["kod"]] = {"vid": s["id"], "durum": st.get("privacyStatus"), "publishAt": st.get("publishAt"), "zaman": datetime.now(TZ).isoformat(timespec="seconds")}
        json.dump(yuklenen, open(kayit_yol, "w"), ensure_ascii=False, indent=1); os.chmod(kayit_yol, 0o600)
        print(f"NOT: YUKLENDI {it['kod']} vid={s['id']} durum={st.get('privacyStatus')} plan={st.get('publishAt') or 'yok'} upload={st.get('uploadStatus')}")
    except urllib.error.HTTPError as e:
        print(f"NOT: HATA {it['kod']} HTTP {e.code}: {e.read().decode('utf-8','replace')[:220]}")
PY
