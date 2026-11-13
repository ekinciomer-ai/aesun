#!/bin/bash
# YouTube yükleme kuyruğu (bilgisayar gerekmez). .github/workflows/yt_kuyruk.yml çalıştırır.
# Girdi: paket içinde kuyruk/<kod>.json + kuyruk/<kod>.mp4 (+ isteğe bağlı kuyruk/<kod>.jpg veya .png özel kapak)
#   json: {"kod","kanal":"TR|EN|ES|KZ_TR|KZ_EN|OD","baslik","aciklama","etiketler":[],"kategori":"27","publishAt":"2026-11-05T19:00:00+03:00","sentetik":false,"seri","tarih_sabit":false}
# HESAP SINIRI: 6 kanal toplamı günde en fazla 4 yükleme + 4 yayın; dolu günde yayın ilk boş güne kayar (tarih_sabit:true olanlar hariç).
# Kurallar: aynı kod ya da aynı başlık kanalda varsa YÜKLEMEZ; herkese açma yalnız publishAt ile planlıdır; silme yok.
# Çıktı: '===KUYRUK===' ... '===SON===' arasında sırsız JSON sonuç listesi.
set -euo pipefail
D=/opt/aesun/youtube
mkdir -p "$D/yedek"; chmod 700 "$D"
python3 - "$D" "$(pwd)/kuyruk" <<'PY'
import json, os, sys, glob, urllib.request, urllib.parse, urllib.error
D, KQ = sys.argv[1], sys.argv[2]
ist = json.load(open(os.path.join(D, "istemci.json"), encoding="utf-8"))
KANAL = {"TR": "UC77LyY3gqWmBNAKp2lbsGBg", "EN": "UCFLJUlhUSgjcLbp9ad_t9PQ", "ES": "UCTC_yS0lwl-owMuo5b4bNtQ",
         "KZ_TR": "UC7o3DG9m1gBbvMjFZjB5KEg", "KZ_EN": "UC41-Z82jCQ8955az6JUDIAw", "OD": "UCg75Mvb6C8CBSJPeuwzBFZA"}
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

# ── HESAP SINIRI (Ömer, 13 Kas 2026): 6 kanalın toplamı günde en fazla 4 YÜKLEME ve günde en fazla 4 YAYIN. ──
# Sınır dolarsa iş silinmez: yükleme sırada kalır (kuyruk 4 saatte bir yeniden dener), yayın günü dolu ise
# publishAt aynı saatle ilk boş güne kaydırılır. Sayaç: /opt/aesun/youtube/hesap_sayac.json
from datetime import datetime as _dt, timezone as _tz, timedelta as _td
HESAP_GUNLUK = 4
_IST = _tz(_td(hours=3))
_sayac_yol = os.path.join(D, "hesap_sayac.json")
try:
    _sayac = json.load(open(_sayac_yol, encoding="utf-8"))
except Exception:
    _sayac = {}
_plan = None

def _plan_sayim():
    """Tüm kanallarda planlı (publishAt) ve bugün yayınlanmış videoları güne göre say."""
    global _plan
    if _plan is not None:
        return _plan
    _plan = {}
    for _d, _cid in KANAL.items():
        try:
            if _d not in toklar:
                toklar[_d] = token(_cid); mevcut[_d] = basliklar(toklar[_d], _cid)
            _ids = list(mevcut[_d].values())[:200]
            for _i in range(0, len(_ids), 50):
                _u = "https://www.googleapis.com/youtube/v3/videos?part=status,snippet&id=" + ",".join(_ids[_i:_i + 50])
                with urllib.request.urlopen(urllib.request.Request(_u, headers={"Authorization": f"Bearer {toklar[_d]}"}), timeout=30) as _r:
                    for _v in json.load(_r).get("items", []):
                        _pa = _v["status"].get("publishAt") or (_v["snippet"].get("publishedAt") if _v["status"].get("privacyStatus") == "public" else None)
                        if _pa:
                            _g = _dt.fromisoformat(_pa.replace("Z", "+00:00")).astimezone(_IST).strftime("%Y-%m-%d")
                            _plan[_g] = _plan.get(_g, 0) + 1
        except Exception as _e:
            print(f"NOT: hesap sayımı {_d} okunamadı: {type(_e).__name__}")
    return _plan
for jf in sorted(glob.glob(os.path.join(KQ, "*.json"))):
    it = json.load(open(jf, encoding="utf-8")); kod = it["kod"]; dil = it["kanal"]
    mp4 = jf[:-5] + ".mp4"
    if not os.path.exists(mp4) and it.get("sunucu_video"): mp4 = "/opt/aesun/video_bekleyen/" + os.path.basename(it["sunucu_video"])
    try:
        if it.get("en_erken_yukle"):
            from datetime import datetime, timezone, timedelta
            bugun_ist = datetime.now(timezone(timedelta(hours=3))).strftime("%Y-%m-%d")
            if bugun_ist < it["en_erken_yukle"]:
                print(f"NOT: {kod} zamana yayılı yükleme ({it['en_erken_yukle']} bekleniyor)"); continue
        if it.get("islem") == "plan_kaldir":
            # yalnız planı kaldır: video Gizli kalır, silinmez (önce durum yedeği)
            cid = KANAL[dil]
            if dil not in toklar:
                toklar[dil] = token(cid); mevcut[dil] = basliklar(toklar[dil], cid)
            eski = it["vid"]
            u = f"https://www.googleapis.com/youtube/v3/videos?part=status&id={eski}"
            with urllib.request.urlopen(urllib.request.Request(u, headers={"Authorization": f"Bearer {toklar[dil]}"}), timeout=30) as r:
                m = json.load(r)["items"][0]
            json.dump(m, open(os.path.join(D, "yedek", f"plan_kaldir_{eski}.json"), "w", encoding="utf-8"), ensure_ascii=False)
            st = m["status"]
            if st.get("privacyStatus") == "public":
                print(f"NOT: {eski} zaten herkese açık; dokunulmadı"); sonuc.append({"kod": kod, "durum": "plan kaldırılamadı (yayında)", "eski": eski}); continue
            st.pop("publishAt", None)
            for k in ("uploadStatus", "failureReason", "rejectionReason", "madeForKids"): st.pop(k, None)
            st["privacyStatus"] = "private"
            req = urllib.request.Request("https://www.googleapis.com/youtube/v3/videos?part=status", data=json.dumps({"id": eski, "status": st}).encode(),
                                         method="PUT", headers={"Authorization": f"Bearer {toklar[dil]}", "Content-Type": "application/json"})
            urllib.request.urlopen(req, timeout=30).read()
            print(f"NOT: {eski} planı kaldırıldı (Gizli)"); sonuc.append({"kod": kod, "durum": "plan kaldırıldı", "eski": eski}); continue
        if kod in kayit:
            sonuc.append({"kod": kod, "durum": "zaten yüklü", "vid": kayit[kod]["vid"], **{k: it.get(k) for k in ("kanal", "baslik", "publishAt", "seri", "ureten", "tur")}}); continue
        cid = KANAL[dil]
        if dil not in toklar:
            toklar[dil] = token(cid); mevcut[dil] = basliklar(toklar[dil], cid)
        if not it.get("yerine") and it["baslik"] in mevcut[dil]:  # "yerine" verilmişse aynı başlık bilerek yeniden yüklenir
            vid = mevcut[dil][it["baslik"]]; kayit[kod] = {"vid": vid}
            sonuc.append({"kod": kod, "durum": "zaten yüklü (başlık)", "vid": vid, **{k: it.get(k) for k in ("kanal", "baslik", "publishAt", "seri", "ureten", "tur")}}); continue
        # Yayın öncesi kalite kapısı (ae-sistem-standartlari): engel varsa yüklenmez; uyarılar rapora girer
        if os.path.exists("/opt/aesun/kalite_kapisi.py"):
            import subprocess
            kk = subprocess.run(["python3", "/opt/aesun/kalite_kapisi.py", mp4, jf], capture_output=True, text=True, timeout=900)
            try: kq = json.loads(kk.stdout)
            except Exception: kq = {"gecti": False, "engel": ["kalite kapısı çalışmadı"], "uyari": []}
            if it.get("ust_bant_izinli") and kq.get("engel"):
                kq["engel"] = [e for e in kq["engel"] if "altyazı dışında yazı" not in e]
                kq["gecti"] = not kq["engel"]
            if not kq.get("gecti"):
                sonuc.append({"kod": kod, "durum": "KALİTE KAPISI: yüklenmedi", "engel": kq.get("engel"), **{k: it.get(k) for k in ("kanal", "baslik", "publishAt", "seri", "ureten", "tur")}})
                print(f"NOT: {kod} kalite kapısından geçemedi: {'; '.join(kq.get('engel') or [])}"); continue
            if kq.get("uyari"):
                print(f"NOT: {kod} kalite uyarısı: {'; '.join(kq['uyari'])}")
        _bugun = _dt.now(_IST).strftime("%Y-%m-%d")
        if _sayac.get(_bugun, 0) >= HESAP_GUNLUK:
            print(f"NOT: {kod} HESAP SINIRI: bugün {HESAP_GUNLUK} yükleme yapıldı; sırada kaldı, sonraki günde yüklenecek")
            sonuc.append({"kod": kod, "durum": "hesap sınırı: sırada", **{k: it.get(k) for k in ("kanal", "baslik", "publishAt", "seri", "ureten", "tur")}}); continue
        _pl = _plan_sayim()
        _t = _dt.fromisoformat(it["publishAt"]).astimezone(_IST)
        if _t < _dt.now(_IST):
            _t = _dt.now(_IST).replace(second=0, microsecond=0) + _td(hours=2)
        _eski_pa = it["publishAt"]
        # Tarihe bağlı içerik ("bu gece", maç günü, gök olayı) kuyruk json'unda "tarih_sabit": true taşır; günü kaydırılmaz.
        for _k in (range(0, 1) if it.get("tarih_sabit") else range(0, 120)):
            _g = (_t + _td(days=_k)).strftime("%Y-%m-%d")
            if it.get("tarih_sabit") or _pl.get(_g, 0) < HESAP_GUNLUK:
                _t = _t + _td(days=_k); break
        it["publishAt"] = _t.isoformat(timespec="seconds")
        if it["publishAt"][:10] != _eski_pa[:10]:
            print(f"NOT: {kod} HESAP SINIRI: {_eski_pa[:16]} dolu, yayın {it['publishAt'][:16]} gününe kaydırıldı")
        dil_kodu = {"TR": "tr", "EN": "en", "ES": "es", "KZ_TR": "tr", "OD": "tr"}.get(dil, "en")
        from datetime import datetime, timezone
        hemen_yayin = datetime.fromisoformat(it["publishAt"]) <= datetime.now(timezone.utc)
        durum_alan = ({"privacyStatus": "public", "selfDeclaredMadeForKids": False, "containsSyntheticMedia": bool(it.get("sentetik", False))}
                      if hemen_yayin else
                      {"privacyStatus": "private", "publishAt": it["publishAt"], "selfDeclaredMadeForKids": False, "containsSyntheticMedia": bool(it.get("sentetik", False))})
        govde = {"snippet": {"title": it["baslik"][:100], "description": it["aciklama"][:4900], "tags": it.get("etiketler", []),
                             "categoryId": it.get("kategori", "27"), "defaultLanguage": dil_kodu, "defaultAudioLanguage": dil_kodu},
                 "status": durum_alan}
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
        # Özel kapak (varsa: <kod>.jpg veya <kod>.png) — telefon doğrulaması yoksa 403 döner, yüklemeyi bozmaz
        kapak_yol = next((p for p in (jf[:-5] + ".jpg", jf[:-5] + ".png") if os.path.exists(p)), None)
        if kapak_yol:
            try:
                mime = "image/png" if kapak_yol.endswith(".png") else "image/jpeg"
                with open(kapak_yol, "rb") as kf:
                    kveri = kf.read()
                treq = urllib.request.Request(
                    f"https://www.googleapis.com/upload/youtube/v3/thumbnails/set?videoId={v['id']}",
                    data=kveri, method="POST",
                    headers={"Authorization": f"Bearer {toklar[dil]}", "Content-Type": mime, "Content-Length": str(len(kveri))},
                )
                urllib.request.urlopen(treq, timeout=60).read()
                print(f"NOT: {kod} özel kapak yüklendi ({os.path.basename(kapak_yol)})")
            except urllib.error.HTTPError as ke:
                print(f"NOT: {kod} özel kapak atlandı (HTTP {ke.code} — youtube.com/verify gerekli olabilir)")
            except Exception as ke:
                print(f"NOT: {kod} özel kapak hatası: {type(ke).__name__}")
        kayit[kod] = {"vid": v["id"]}
        try:
            import shutil; os.makedirs(os.path.join(D, "medya"), exist_ok=True); shutil.copy(mp4, os.path.join(D, "medya", f"{kod}.mp4"))
        except Exception: pass
        json.dump(kayit, open(kayit_yol, "w", encoding="utf-8"), ensure_ascii=False)
        sonuc.append({"kod": kod, "durum": "yüklendi ve planlandı", "vid": v["id"], **{k: it.get(k) for k in ("kanal", "baslik", "publishAt", "seri", "ureten", "tur")}})
        print(f"NOT: {kod} yüklendi → {v['id']} (plan {it['publishAt']})")
        _sayac[_bugun] = _sayac.get(_bugun, 0) + 1
        _g = it["publishAt"][:10]; _pl[_g] = _pl.get(_g, 0) + 1
        json.dump({k: v2 for k, v2 in _sayac.items() if k >= (_dt.now(_IST) - _td(days=30)).strftime("%Y-%m-%d")}, open(_sayac_yol, "w"), indent=1)
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
