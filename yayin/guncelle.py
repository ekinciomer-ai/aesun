#!/usr/bin/env python3
"""Yayın Takibi otomatik güncelleyici (bilgisayar gerekmez; GitHub Actions'ta çalışır).

Kaynaklar:
  1) YouTube kanal RSS'i (anahtarsız, herkese açık): yayındaki son videolar, yayın saati, izlenme.
  2) YT_API_KEY sırrı varsa YouTube Data API: tablodaki TÜM herkese açık videoların güncel izlenmesi.
  2b) YT_API_KEY varsa yorumlar (yanıt bekleyenler Portal → Yayın Takibi → Yorumlar kutusunda).
  3) TikTok: planlı içeriklerde plan saati geçtiyse "Yayında" yapılır (TikTok planlananı kendisi yayınlar).
Planlı/gizli YouTube içerikleri herkese açık kaynaklarda görünmez; onları Claude/Antigravity yazar,
bu betik yalnız yayına çıktıklarında durumlarını ve izlenmelerini günceller.
"""
import json, os, re, sys, urllib.request, urllib.parse
import xml.etree.ElementTree as ET
from datetime import datetime, timedelta, timezone

YOL = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "docs", "yayin", "yayin.json")
TZ = timezone(timedelta(hours=3))
KANALLAR = {
    "UC77LyY3gqWmBNAKp2lbsGBg": ("Antik Stüdyo", "TR"),
    "UCFLJUlhUSgjcLbp9ad_t9PQ": ("Ancient Studio", "EN"),
    "UCTC_yS0lwl-owMuo5b4bNtQ": ("Estudio Antiguo", "ES"),
}
NS = {"a": "http://www.w3.org/2005/Atom", "yt": "http://www.youtube.com/xml/schemas/2015",
      "media": "http://search.yahoo.com/mrss/"}
UA = {"User-Agent": "Mozilla/5.0 (AksarayEnerji-YayinTakibi/1.0)"}


def getir(url):
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=30) as r:
        return r.read()


def seri_tahmin(t):
    tl = t.lower()
    if any(k in tl for k in ["emu", "kedi", "cat died", "güvercin", "pigeon", "patileri", "paws"]):
        return "Tarihin Patileri"
    if any(k in tl for k in ["tablo", "painting", "mona lisa", "van gogh", "venüs", "venus", "çığlık", "scream",
                             "gece devriyesi", "night watch", "dalga", "wave", "akşam yemeği", "supper",
                             "kaplumbağa", "tortoise", "inci küpeli", "pearl earring"]):
        return "Tablo Serisi"
    return "Gündem + Tarih"


def main():
    j = json.load(open(YOL, encoding="utf-8"))
    K = j.get("kayitlar", [])
    vid_ix = {x.get("vid"): x for x in K if x.get("vid")}
    simdi = datetime.now(TZ)
    degisti, notlar = 0, []

    # 0) CutkodA sunucusu canlı ucu (YouTube API bağlıysa planlı/gizli dahil tam liste)
    canli_ok = False
    try:
        c = json.loads(getir("https://panel.cutkoda.com/api/yayin-takip"))
        if c.get("kayitlar"):
            canli_ok = True
            for v in c["kayitlar"]:
                x = vid_ix.get(v["vid"])
                if x is None:
                    x = {k: v.get(k) for k in ("platform", "kanal", "dil", "tur", "baslik", "durum", "tarih", "saat", "izlenme", "link", "vid")}
                    x.update(seri=seri_tahmin(v.get("baslik", "")), ureten="?")
                    K.append(x); vid_ix[v["vid"]] = x; degisti += 1
                    notlar.append(f"Yeni içerik eklendi: {v.get('kanal')} · {v.get('baslik')}")
                for k in ("durum", "tarih", "saat", "izlenme"):
                    if v.get(k) not in (None, "") and x.get(k) != v[k]:
                        x[k] = v[k]; degisti += 1
            notlar += c.get("notlar", [])
    except Exception as e:
        notlar.append(f"CutkodA canlı ucu okunamadı: {e}")

    # 1) RSS (canlı uç yoksa)
    for cid, (kanal, dil) in ({} if canli_ok else KANALLAR).items():
        try:
            kok = ET.fromstring(getir(f"https://www.youtube.com/feeds/videos.xml?channel_id={cid}"))
        except Exception as e:
            notlar.append(f"RSS okunamadı ({kanal}): {e}")
            continue
        for en in kok.findall("a:entry", NS):
            vid = en.findtext("yt:videoId", namespaces=NS)
            baslik = (en.findtext("a:title", namespaces=NS) or "").strip()
            yay = datetime.fromisoformat(en.findtext("a:published", namespaces=NS).replace("Z", "+00:00")).astimezone(TZ)
            st = en.find("media:group/media:community/media:statistics", NS)
            izl = int(st.get("views")) if st is not None and st.get("views", "").isdigit() else None
            link_el = en.find("a:link", NS)
            href = link_el.get("href") if link_el is not None else ""
            short = "/shorts/" in href or "#shorts" in baslik.lower()
            x = vid_ix.get(vid)
            if x is None:
                x = dict(platform="YouTube", kanal=kanal, dil=dil, tur="Short" if short else "Video",
                         seri=seri_tahmin(baslik), baslik=baslik, durum="Yayında", tarih="", saat="",
                         izlenme=None, link=(f"https://youtube.com/shorts/{vid}" if short else f"https://youtu.be/{vid}"),
                         vid=vid, ureten="?", not_="")
                x.pop("not_")
                K.append(x); vid_ix[vid] = x; degisti += 1
                notlar.append(f"Yeni içerik eklendi: {kanal} · {baslik}")
            yeni = {"durum": "Yayında", "tarih": yay.strftime("%Y-%m-%d"), "saat": yay.strftime("%H:%M")}
            if izl is not None:
                yeni["izlenme"] = izl
            for k, v in yeni.items():
                if x.get(k) != v:
                    x[k] = v; degisti += 1

    # 2) YouTube Data API (isteğe bağlı): kanalların herkese açık yüklemelerini bul + tüm izlenmeleri güncelle
    anahtar = os.environ.get("YT_API_KEY", "").strip()
    if anahtar:
        for cid, (kanal, dil) in KANALLAR.items():
            try:
                q = urllib.parse.urlencode({"part": "contentDetails", "playlistId": "UU" + cid[2:], "maxResults": 50, "key": anahtar})
                ids = [i["contentDetails"]["videoId"] for i in json.loads(getir("https://www.googleapis.com/youtube/v3/playlistItems?" + q)).get("items", [])]
                yeni = [v for v in ids if v not in vid_ix]
                if yeni:
                    q = urllib.parse.urlencode({"part": "snippet,contentDetails", "id": ",".join(yeni), "key": anahtar})
                    for v in json.loads(getir("https://www.googleapis.com/youtube/v3/videos?" + q)).get("items", []):
                        sn = v["snippet"]; baslik = sn.get("title", "")
                        yay = datetime.fromisoformat(sn["publishedAt"].replace("Z", "+00:00")).astimezone(TZ)
                        dk = re.match(r"PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?", v["contentDetails"].get("duration", ""))
                        sure = sum(int(a or 0) * b for a, b in zip(dk.groups(), (3600, 60, 1))) if dk else 999
                        short = sure <= 180
                        x = dict(platform="YouTube", kanal=kanal, dil=dil, tur="Short" if short else "Video",
                                 seri=seri_tahmin(baslik), baslik=baslik, durum="Yayında", tarih=yay.strftime("%Y-%m-%d"),
                                 saat=yay.strftime("%H:%M"), izlenme=None,
                                 link=(f"https://youtube.com/shorts/{v['id']}" if short else f"https://youtu.be/{v['id']}"),
                                 vid=v["id"], ureten="?")
                        K.append(x); vid_ix[v["id"]] = x; degisti += 1
                        notlar.append(f"Yeni içerik eklendi: {kanal} · {baslik}")
            except Exception as e:
                notlar.append(f"YouTube API kanal listesi okunamadı ({kanal}): {e}")
        vids = [v for v in vid_ix if v]
        for i in range(0, len(vids), 50):
            q = urllib.parse.urlencode({"part": "statistics,status", "id": ",".join(vids[i:i + 50]), "key": anahtar})
            try:
                d = json.loads(getir("https://www.googleapis.com/youtube/v3/videos?" + q))
            except Exception as e:
                notlar.append(f"YouTube API okunamadı: {e}"); break
            for it in d.get("items", []):
                x = vid_ix.get(it["id"])
                v = it.get("statistics", {}).get("viewCount")
                if x is not None and v is not None and x.get("izlenme") != int(v):
                    x["izlenme"] = int(v); degisti += 1
                lk = it.get("statistics", {}).get("likeCount")
                if x is not None and lk is not None and x.get("begeni") != int(lk):
                    x["begeni"] = int(lk); degisti += 1
                if x is not None and it.get("status", {}).get("privacyStatus") == "public" and x.get("durum") == "Planlı":
                    x["durum"] = "Yayında"; degisti += 1

    # 2b) Yorumlar (YT_API_KEY ile; bilgisayar gerekmez). Herkese açık videolardaki yorumlar okunur,
    #     kanalın kendisinin yanıt verip vermediği işaretlenir. Yanıt GÖNDERİLMEZ.
    if anahtar:
        yorumlar, eski = [], {y["id"]: y for y in j.get("yorumlar", [])}
        kanal_id = {v[0]: k for k, v in KANALLAR.items()}
        gorulen = set()

        def ekle_yorum(sn, yid, vid, kanal, cid, kanal_yaniti, ust_id=None):
            if yid in gorulen:
                return
            yazar_cid = (sn.get("authorChannelId") or {}).get("value")
            if cid and yazar_cid == cid:
                return  # kanalın kendi yorumu
            gorulen.add(yid)
            x = vid_ix.get(vid) or {}
            t = datetime.fromisoformat(sn["publishedAt"].replace("Z", "+00:00")).astimezone(TZ)
            kayit = {
                "id": yid, "kanal": kanal, "dil": x.get("dil") or KANALLAR.get(cid, ("", ""))[1], "vid": vid,
                "video": x.get("baslik") or vid, "yazar": sn.get("authorDisplayName"),
                "metin": sn.get("textDisplay", "")[:1000], "zaman": t.isoformat(timespec="minutes"),
                "begeni": sn.get("likeCount", 0), "yanitlandi": kanal_yaniti is not None,
                "yanit": kanal_yaniti,
                "link": f"https://www.youtube.com/watch?v={vid}&lc={yid}",
            }
            if ust_id:
                kayit["ust_id"] = ust_id  # bir yoruma yazılmış cevap
            yorumlar.append(kayit)

        def isle_thread(it, kanal, cid):
            ust = it["snippet"]["topLevelComment"]["snippet"]
            vid = it["snippet"].get("videoId") or ust.get("videoId")
            if not vid:
                return
            yanitlar = (it.get("replies") or {}).get("comments", [])
            kanal_yaniti = next((r["snippet"]["textDisplay"] for r in yanitlar
                                 if (r["snippet"].get("authorChannelId") or {}).get("value") == cid), None)
            if kanal_yaniti is None and it["snippet"].get("totalReplyCount", 0) > len(yanitlar):
                kanal_yaniti = (eski.get(it["id"]) or {}).get("yanit")
            ekle_yorum(ust, it["id"], vid, kanal, cid, kanal_yaniti)
            # Başkalarının cevapları: kanal sonrasında yanıt vermediyse "yanıt bekliyor" sayılır
            for i, r in enumerate(yanitlar):
                rs = r["snippet"]
                if (rs.get("authorChannelId") or {}).get("value") == cid:
                    continue
                sonra = next((q["snippet"]["textDisplay"] for q in yanitlar[i + 1:]
                              if (q["snippet"].get("authorChannelId") or {}).get("value") == cid), None)
                if sonra is None:
                    sonra = (eski.get(r["id"]) or {}).get("yanit")
                ekle_yorum(rs, r["id"], vid, kanal, cid, sonra, ust_id=it["id"])

        # a) Kanal bazında: tablodaki durumdan bağımsız, kanalın BÜTÜN videolarındaki yorumlar
        tarandi = set()
        for cid, (ad, _dil) in KANALLAR.items():
            sayfa = ""
            for _ in range(5):
                prm = {"part": "snippet,replies", "allThreadsRelatedToChannelId": cid, "maxResults": 100,
                       "order": "time", "textFormat": "plainText", "key": anahtar}
                if sayfa:
                    prm["pageToken"] = sayfa
                try:
                    d = json.loads(getir("https://www.googleapis.com/youtube/v3/commentThreads?" + urllib.parse.urlencode(prm)))
                except Exception as e:
                    notlar.append(f"yorumlar okunamadı ({ad}): {e}"); break
                for it in d.get("items", []):
                    isle_thread(it, ad, cid)
                tarandi.add(ad)
                sayfa = d.get("nextPageToken")
                if not sayfa:
                    break
        # b) Listede olmayan kanallar (ör. yeni açılan kanal): tablodaki yayındaki videolar tek tek
        for x in K:
            if x.get("platform") != "YouTube" or not x.get("vid") or x.get("kanal") in tarandi:
                continue
            if x.get("durum") not in ("Yayında", "Planlı"):
                continue
            cid = kanal_id.get(x.get("kanal"))
            q = urllib.parse.urlencode({"part": "snippet,replies", "videoId": x["vid"], "maxResults": 100,
                                        "order": "time", "textFormat": "plainText", "key": anahtar})
            try:
                d = json.loads(getir("https://www.googleapis.com/youtube/v3/commentThreads?" + q))
            except Exception:
                continue  # yorumları kapalı / henüz yayında değil
            for it in d.get("items", []):
                isle_thread(it, x.get("kanal"), cid)
        # Kalıcı: okuma hata verse de (ör. 2. sayfada) ya da yorum eski sayfalarda kalsa da eski yorumlar silinmez
        for y in j.get("yorumlar", []):
            if y["id"] not in gorulen:
                yorumlar.append(y); gorulen.add(y["id"])
        yorumlar.sort(key=lambda y: y["zaman"], reverse=True)
        yeni_say = sum(1 for y in yorumlar if y["id"] not in eski)
        # Yanıtsız yorumlar → yorum kuyruğu (taslak yanıtı Claude yazar, Ömer onaylar, sunucu gönderir)
        try:
            kyol = os.path.join(os.path.dirname(YOL), "yorum_kuyrugu.json")
            kq = json.load(open(kyol, encoding="utf-8")) if os.path.exists(kyol) else []
            var = {k.get("yorum_id") for k in kq}; ekle = 0
            for y in yorumlar:
                if not y["yanitlandi"] and y["id"] not in var:
                    kq.append({"kanal": y["kanal"], "video": y["video"], "vid": y["vid"], "yorum_id": y["id"], "yazar": y["yazar"],
                               "metin": y["metin"][:300], "zaman": y["zaman"], "durum": "TASLAK BEKLİYOR", "yanit": ""}); ekle += 1
            for k in kq:   # kanal yanıtlamışsa (Studio'dan elle) kuyruktan düş
                if k.get("durum") in ("ONAY BEKLİYOR", "TASLAK BEKLİYOR") and any(y["id"] == k.get("yorum_id") and y["yanitlandi"] for y in yorumlar):
                    k["durum"] = "elle yanıtlandı"
            if ekle:
                notlar.append(f"{ekle} yorum yanıt kuyruğuna eklendi")
            json.dump(kq, open(kyol, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
        except Exception as e:
            notlar.append(f"yorum kuyruğu yazılamadı: {e}")
        if yorumlar != j.get("yorumlar"):
            j["yorumlar"] = yorumlar; degisti += 1
            if yeni_say:
                notlar.append(f"{yeni_say} yeni yorum")

    # 2c) Sunucudaki resmi YouTube bağlantısının okuduğu GERÇEK durum (docs/yayin/analitik.json, yayin_yonet.yml yazar)
    try:
        an = json.load(open(os.path.join(os.path.dirname(YOL), "analitik.json"), encoding="utf-8"))
        taze = (simdi - datetime.fromisoformat(an["zaman"])).total_seconds() < 36 * 3600
    except Exception:
        an, taze = {}, False
    if taze:
        for kanal, kd in an.get("kanallar", {}).items():
            dil = "TR" if kanal == "Antik Stüdyo" else "EN"
            for vid, v in kd.get("videolar", {}).items():
                if v.get("uploadStatus") not in (None, "processed", "uploaded"):
                    continue
                if v["durum"] == "public":
                    d, t = "Yayında", datetime.fromisoformat(v["publishedAt"].replace("Z", "+00:00")).astimezone(TZ)
                elif v.get("publishAt"):
                    d, t = "Planlı", datetime.fromisoformat(v["publishAt"].replace("Z", "+00:00")).astimezone(TZ)
                else:
                    d, t = "Gizli", None
                x = vid_ix.get(vid)
                if x is None:
                    if d == "Gizli":
                        continue
                    sure = v.get("sure") or ""
                    m = re.match(r"PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?", sure)
                    sn = (int(m.group(1) or 0) * 3600 + int(m.group(2) or 0) * 60 + int(m.group(3) or 0)) if m else 999
                    short = sn <= 180
                    x = dict(platform="YouTube", kanal=kanal, dil=dil, tur="Short" if short else "Video",
                             seri=seri_tahmin(v.get("baslik") or ""), baslik=v.get("baslik") or "", durum=d, tarih="", saat="",
                             izlenme=None, link=(f"https://youtube.com/shorts/{vid}" if short else f"https://youtu.be/{vid}"), vid=vid, ureten="?")
                    K.append(x); vid_ix[vid] = x; degisti += 1
                    notlar.append(f"Yeni içerik (YouTube'dan): {kanal} · {x['baslik']}")
                yeni = {"durum": d, "izlenme": v.get("izlenme")}
                if t is not None:
                    yeni.update(tarih=t.strftime("%Y-%m-%d"), saat=t.strftime("%H:%M"))
                if v.get("izlenme_yuzde") is not None:
                    yeni["izlenme_yuzde"] = v["izlenme_yuzde"]
                if v.get("begeni") is not None:
                    yeni["begeni"] = v["begeni"]
                if v.get("izlenme_dk") is not None:
                    yeni["izlenme_dk"] = v["izlenme_dk"]
                for k2, val in yeni.items():
                    if x.get(k2) != val:
                        x[k2] = val; degisti += 1

    # 3) TikTok: plan saati geçen planlı içerik
    for x in K:
        # Yalnız TikTok Studio'da gerçekten planlanmış olanlar (not'u "HAZIR" ile başlayan = henüz yüklenmemiş dosya; dokunma)
        if x.get("platform") == "TikTok" and x.get("durum") == "Planlı" and x.get("tarih") and "HAZIR" not in (x.get("not") or ""):
            try:
                t = datetime.strptime(f"{x['tarih']} {x.get('saat') or '23:59'}", "%Y-%m-%d %H:%M").replace(tzinfo=TZ)
            except ValueError:
                continue
            if simdi >= t + timedelta(minutes=15):
                x["durum"] = "Yayında"
                x["not"] = (x.get("not", "") + " · " if x.get("not") else "") + "Plan saatinde otomatik yayınlandı (TikTok)"
                degisti += 1

    # 4) Günlük izlenme geçmişi (grafik için): her günün son ölçümü, video başına toplam izlenme
    try:
        gyol = os.path.join(os.path.dirname(YOL), "gecmis.json")
        g = json.load(open(gyol, encoding="utf-8")) if os.path.exists(gyol) else {"gunler": {}}
        snap = {}
        for x in K:
            if x.get("durum") == "Yayında" and isinstance(x.get("izlenme"), int):
                k = x.get("vid") or f"{x.get('platform','')}|{x.get('tarih') or ''}|{x.get('baslik','')}"
                snap[k] = x["izlenme"]
        bugun = simdi.strftime("%Y-%m-%d")
        if snap and g["gunler"].get(bugun) != snap:
            g["gunler"][bugun] = snap
            g["gunler"] = dict(sorted(g["gunler"].items())[-400:])
            json.dump(g, open(gyol, "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
    except Exception as e:
        notlar.append(f"İzlenme geçmişi yazılamadı: {e}")

    for n in notlar:
        print(n)
    if not degisti:
        print("Değişiklik yok."); return 0
    j["guncelleme"] = simdi.isoformat(timespec="seconds")
    j["otomatik"] = {"son_calisma": j["guncelleme"], "kaynak": ("CutkodA sunucusu" if canli_ok else "YouTube RSS") + (" + YouTube API" if anahtar else "") + " + TikTok plan saati",
                     "notlar": notlar[-10:]}
    json.dump(j, open(YOL, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print(f"{degisti} alan güncellendi.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
