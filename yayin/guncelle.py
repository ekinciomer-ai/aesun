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

    # 2) YouTube Data API (isteğe bağlı)
    anahtar = os.environ.get("YT_API_KEY", "").strip()
    if anahtar:
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

    # 2b) Yorumlar (YT_API_KEY ile; bilgisayar gerekmez). Herkese açık videolardaki yorumlar okunur,
    #     kanalın kendisinin yanıt verip vermediği işaretlenir. Yanıt GÖNDERİLMEZ.
    if anahtar:
        yorumlar, eski = [], {y["id"]: y for y in j.get("yorumlar", [])}
        kanal_id = {v[0]: k for k, v in KANALLAR.items()}
        for x in K:
            if x.get("platform") != "YouTube" or x.get("durum") != "Yayında" or not x.get("vid"):
                continue
            cid = kanal_id.get(x.get("kanal"))
            q = urllib.parse.urlencode({"part": "snippet,replies", "videoId": x["vid"], "maxResults": 50,
                                        "order": "time", "textFormat": "plainText", "key": anahtar})
            try:
                d = json.loads(getir("https://www.googleapis.com/youtube/v3/commentThreads?" + q))
            except Exception:
                continue  # yorumları kapalı video vb.
            for it in d.get("items", []):
                ust = it["snippet"]["topLevelComment"]["snippet"]
                yazar_cid = (ust.get("authorChannelId") or {}).get("value")
                if cid and yazar_cid == cid:
                    continue  # kanalın kendi yorumu
                yanitlar = (it.get("replies") or {}).get("comments", [])
                kanal_yaniti = next((r["snippet"]["textDisplay"] for r in yanitlar
                                     if (r["snippet"].get("authorChannelId") or {}).get("value") == cid), None)
                if kanal_yaniti is None and it["snippet"].get("totalReplyCount", 0) > len(yanitlar):
                    kanal_yaniti = (eski.get(it["id"]) or {}).get("yanit")
                t = datetime.fromisoformat(ust["publishedAt"].replace("Z", "+00:00")).astimezone(TZ)
                yorumlar.append({
                    "id": it["id"], "kanal": x.get("kanal"), "dil": x.get("dil"), "vid": x["vid"],
                    "video": x.get("baslik"), "yazar": ust.get("authorDisplayName"),
                    "metin": ust.get("textDisplay", "")[:1000], "zaman": t.isoformat(timespec="minutes"),
                    "begeni": ust.get("likeCount", 0), "yanitlandi": kanal_yaniti is not None,
                    "yanit": kanal_yaniti,
                    "link": f"https://www.youtube.com/watch?v={x['vid']}&lc={it['id']}",
                })
        yorumlar.sort(key=lambda y: y["zaman"], reverse=True)
        yeni_say = sum(1 for y in yorumlar if y["id"] not in eski)
        if yorumlar != j.get("yorumlar"):
            j["yorumlar"] = yorumlar; degisti += 1
            if yeni_say:
                notlar.append(f"{yeni_say} yeni yorum")

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
