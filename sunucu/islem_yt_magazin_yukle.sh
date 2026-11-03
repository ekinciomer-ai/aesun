#!/bin/bash
# Tarihi Magazin (TR #1-4) ve Bizarre History (EN #1-4) videolarını
# sunucudaki (/opt/aesun/youtube) resmi YouTube OAuth bağlantısı üzerinden kanallara yükler ve planlar.
# Kurallar:
# - Sırlar asla çıktıya/loglara yazılmaz.
# - İşlem öncesi her iki kanalın mevcut video durumu /opt/aesun/youtube/yedek/ altına yedeklenir.
# - Yapay zekâ beyanı (containsSyntheticMedia=True) işaretlenir.
set -euo pipefail

D=/opt/aesun/youtube
mkdir -p "$D/yedek" "$D/medya"
chmod 700 "$D" "$D/yedek" "$D/medya"

python3 - "$D" <<'PY'
import json
import os
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timezone, timedelta

D = sys.argv[1]
TZ = timezone(timedelta(hours=3))
ist_path = os.path.join(D, "istemci.json")
if not os.path.exists(ist_path):
    print("NOT: HATA istemci.json bulunamadi")
    sys.exit(1)

istemci = json.load(open(ist_path, encoding="utf-8"))

KANALLAR = {
    "TR": ("UC77LyY3gqWmBNAKp2lbsGBg", "Antik Stüdyo"),
    "EN": ("UCFLJUlhUSgjcLbp9ad_t9PQ", "Ancient Studio"),
}

def get_access_token(cid):
    kf = os.path.join(D, "kanallar", f"{cid}.json")
    if not os.path.exists(kf):
        raise RuntimeError(f"Kanal anahtari yok: {cid}")
    t = json.load(open(kf, encoding="utf-8"))
    body = urllib.parse.urlencode({
        "client_id": istemci["client_id"],
        "client_secret": istemci["client_secret"],
        "refresh_token": t["refresh_token"],
        "grant_type": "refresh_token",
    }).encode()
    req = urllib.request.Request("https://oauth2.googleapis.com/token", data=body)
    with urllib.request.urlopen(req, timeout=30) as resp:
        return json.load(resp)["access_token"]

def api_get(url, token):
    req = urllib.request.Request(url, headers={"Authorization": f"Bearer {token}"})
    with urllib.request.urlopen(req, timeout=30) as resp:
        return json.load(resp)

# 1. ÖNCE YEDEK: Her iki kanalın mevcut videolarını listele ve yedekle
yedek_veri = {"zaman": datetime.now(TZ).isoformat(timespec="seconds"), "kanallar": {}}
mevcut_basliklar = {"TR": {}, "EN": {}}
tokens = {}

for dil, (cid, kad) in KANALLAR.items():
    tok = get_access_token(cid)
    tokens[dil] = tok
    uploads_pid = "UU" + cid[2:]
    vids = []
    page_token = ""
    for _ in range(5):
        u = f"https://www.googleapis.com/youtube/v3/playlistItems?part=contentDetails&playlistId={uploads_pid}&maxResults=50"
        if page_token:
            u += f"&pageToken={page_token}"
        d = api_get(u, tok)
        vids.extend(it["contentDetails"]["videoId"] for it in d.get("items", []))
        page_token = d.get("nextPageToken", "")
        if not page_token:
            break
    detaylar = []
    for i in range(0, len(vids), 50):
        chunk = ",".join(vids[i:i+50])
        u = f"https://www.googleapis.com/youtube/v3/videos?part=snippet,status,statistics,contentDetails&id={chunk}"
        detaylar.extend(api_get(u, tok).get("items", []))
    yedek_veri["kanallar"][cid] = detaylar
    for v in detaylar:
        b = v.get("snippet", {}).get("title", "")
        st = v.get("status", {})
        gz = st.get("privacyStatus", "")
        pub = st.get("publishAt", "")
        mevcut_basliklar[dil][b] = v["id"]
        if gz != "public":
            print(f"NOT: mevcut [{dil}] {v['id']} ({gz} {pub}): {b[:65]}")

yedek_dosya = os.path.join(D, "yedek", f"durum_{datetime.now(TZ).strftime('%Y%m%d_%H%M%S')}.json")
with open(yedek_dosya, "w", encoding="utf-8") as f:
    json.dump(yedek_veri, f, ensure_ascii=False, indent=1)
os.chmod(yedek_dosya, 0o600)
print(f"NOT: kanal yedegi alindi ({os.path.basename(yedek_dosya)})")

# 2. YÜKLENECEK VİDEO LİSTESİ (Öncelik sırasıyla: Bölüm 1 TR/EN -> 2 TR/EN -> 3 TR/EN -> 4 TR/EN)
PAKET = [
    {
        "kod": "TR_01",
        "dil": "TR",
        "dosya": "Tarihi_Magazin_01_Fareli_Peruk_KESFET.mp4",
        "url": "https://panel.cutkoda.com/m/IZk7xs2xbKr6HusHUzu1OqDjLD871EuM/Tarihi_Magazin_01_Fareli_Peruk_KESFET.mp4",
        "baslik": "Saçının içinde FARE yaşayan zengin kadınlar?! 🐭👑 #shorts #tarih #keşfet",
        "aciklama": (
            "1770 yılında Fransa sarayında (Versay) ne kadar zenginseniz, saçınız o kadar yüksek olmak zorundaydı! "
            "Kuaförler 1 metrelik dev saç kulelerini ('Pouf' modeli) dik tutmak için domuz yağı ve buğday unu kullanıyordu. "
            "Saçlar haftalarca yıkanmadığı için un ve yağ kokusunu alan fareler gece uyurken kadınların yastıklarına ve saçlarına geliyordu! "
            "Dönemin sosyetesi içerideki bitleri kaşımak için elmas işlemeli kaşıma çubukları kullandı, gazeteler ise kafalarında "
            "fare kafesiyle uyuduklarına dair karikatürler yayınladı. Siz olsanız güzellik uğruna buna katlanır mıydınız? Yorumlara yazın 👇\n\n"
            "Görsel ve ses: Yapay zekâ destekli yeni nesil Keşfet kurgusu (POV + 3D Kesit + Sinematik).\n"
            "Kaynaklar: Versailles Palace Archives ('La Coiffure à la Belle Poule', 1778); Victoria and Albert Museum.\n\n"
            "#shorts #keşfet #ilginçbilgiler #tarih #biliyormuydunuz #güzellik #makyaj #şaşırtıcıbilgiler #tarihimagazin #viral #trend #kültür #bilgi #antikstudyo"
        ),
        "etiketler": [
            "shorts", "keşfet", "ilginç bilgiler", "tarih", "biliyor muydunuz",
            "şaşırtıcı bilgiler", "tarihi magazin", "güzellik sırları", "eski çağlarda yaşam",
            "versay sarayı", "marie antoinette", "tuhaf bilgiler", "viral shorts", "antik stüdyo"
        ],
        "publishAt": "2026-11-04T13:00:00+03:00",
    },
    {
        "kod": "EN_01",
        "dil": "EN",
        "dosya": "Bizarre_History_01_Mouse_Wig_KESFET.mp4",
        "url": "https://panel.cutkoda.com/m/Ey5oD0Z1F07B5Jh9bevSp_e65lgsC5QH/Bizarre_History_01_Mouse_Wig_KESFET.mp4",
        "baslik": "Did 1700s royal women really have LIVE MICE in their hair?! 🐭👑 #shorts #history #fyp",
        "aciklama": (
            "In 1770s Versailles, aristocratic women wore 3-foot-tall powdered hair towers ('Pouf' hairstyles) held together with melted pig lard and pounds of wheat flour! "
            "Because these towering wigs took hours to build, they went unwashed for weeks—attracting bugs and mice at night. "
            "While the famous 'wire mouse cages' were actually 1770s newspaper satire mocking royal fashion, the pig lard pomade, "
            "diamond-encrusted bug-scratcher sticks (grattoirs), and Queen Elizabeth I's toxic white lead makeup (Venetian Ceruse) were 100% real historical facts! "
            "Would you survive 18th-century beauty standards? Comment below 👇\n\n"
            "#shorts #fyp #history #weirdhistory #bizarrehistory #didyouknow #historyfacts #crazyfacts #viral #trending #marieantoinette #versailles #royalhistory #beautyhistory #ancientstudio"
        ),
        "etiketler": [
            "shorts", "fyp", "history", "weird history", "bizarre history",
            "did you know", "history facts", "crazy facts", "royal history",
            "marie antoinette hair", "18th century fashion", "dark history", "viral shorts", "ancient studio"
        ],
        "publishAt": "2026-11-04T14:30:00+03:00",
    },
    {
        "kod": "TR_02",
        "dil": "TR",
        "dosya": "Tarihi_Magazin_02_Tenya_Diyeti_KESFET.mp4",
        "url": "https://panel.cutkoda.com/m/xkgoUxuDX20BCX98aDeHRhgrRE7Q1-mw/Tarihi_Magazin_02_Tenya_Diyeti_KESFET.mp4",
        "baslik": "Zayıflamak için hap diye CANLI KURT yutanlar?! 🐛💊 #shorts #tarih #keşfet",
        "aciklama": (
            "1890'larda Viktorya döneminde incecik bir bele sahip olmak en büyük statü sembolüydü. "
            "Dar demir korseler yetmeyince, sahte ilaç tüccarları içinde tenya (bağırsak kurdu) kisti olduğu iddia edilen diyet hapları pazarladı! "
            "Midede büyüyüp yemekleri içeriden yiyen 5 metrelik paraziti çıkarmak içinse boğaza sıcak süt kasesi tutuluyor ya da 1898'de patenti alınan peynirli metal gırtlak tuzakları sarkıtılıyordu! "
            "Siz olsanız bu diyeti dener miydiniz? Yorumlara yazın 👇\n\n"
            "#shorts #keşfet #ilginçbilgiler #tarih #biliyormuydunuz #diyet #güzellik #şaşırtıcıbilgiler #tarihimagazin #viral #trend #antikstudyo"
        ),
        "etiketler": [
            "shorts", "keşfet", "ilginç bilgiler", "tarih", "biliyor muydunuz",
            "şaşırtıcı bilgiler", "tarihi magazin", "tenya diyeti", "viktorya dönemi",
            "tuhaf bilgiler", "viral shorts", "antik stüdyo"
        ],
        "publishAt": "2026-11-04T20:00:00+03:00",
    },
    {
        "kod": "EN_02",
        "dil": "EN",
        "dosya": "Bizarre_History_02_Tapeworm_Diet_KESFET.mp4",
        "url": "https://panel.cutkoda.com/m/58Wb5VW0689UW2FfkrRG9byj5ertp1j0/Bizarre_History_02_Tapeworm_Diet_KESFET.mp4",
        "baslik": "Swallowing LIVE WORMS to lose weight in 1890?! 🐛💊 #shorts #history #fyp",
        "aciklama": (
            "In the late 1800s, Victorian women were obsessed with having an impossibly tiny waist. "
            "Quack doctors advertised 'sanitized tapeworm pills' so the parasite would eat food inside your stomach! "
            "Even crazier, in 1898, U.S. Patent No. 609,305 was granted to Alpheus Meyers for a spring-loaded metal trap baited with food that patients swallowed on a string to catch the worm! "
            "Would you survive Victorian beauty standards? Comment below 👇\n\n"
            "#shorts #fyp #history #weirdhistory #bizarrehistory #didyouknow #historyfacts #crazyfacts #viral #trending #victorianera #medicalhistory #ancientstudio"
        ),
        "etiketler": [
            "shorts", "fyp", "history", "weird history", "bizarre history",
            "did you know", "history facts", "crazy facts", "victorian era",
            "tapeworm diet", "medical history", "viral shorts", "ancient studio"
        ],
        "publishAt": "2026-11-04T21:30:00+03:00",
    },
    {
        "kod": "TR_03",
        "dil": "TR",
        "dosya": "Tarihi_Magazin_03_Kursunlu_Makyaj_KESFET.mp4",
        "url": "https://panel.cutkoda.com/m/pn0sXCgW00-nG0ygHvHfZgMM4QVKYIqf/Tarihi_Magazin_03_Kursunlu_Makyaj_KESFET.mp4",
        "baslik": "Yüzünü çürüten ÖLÜMCÜL fondöten! Kraliçenin 2.5 cm maskesi ☠️👑 #shorts #tarih #keşfet",
        "aciklama": (
            "1500'lerde bronz ten tarlada çalışan köylülerin işaretiydi; soylu görünmenin tek kuralı hayalet kadar beyaz olmaktı! "
            "İngiltere Kraliçesi I. Elizabeth, çiçek hastalığı izlerini kapatmak için saf beyaz kurşun ve sirkeden yapılan 'Venedik Beyazı' (Venetian Ceruse) fondöteni kullandı. "
            "Kurşun cildini çürüttükçe makyajı yıkamak yerine üstüne yeni katmanlar sürdü ve saraydaki tüm aynaları kaldırttı! "
            "Siz olsanız güzellik uğruna bunu sürer miydiniz? Yorumlara yazın 👇\n\n"
            "#shorts #keşfet #ilginçbilgiler #tarih #biliyormuydunuz #makyaj #güzellik #şaşırtıcıbilgiler #tarihimagazin #viral #trend #antikstudyo"
        ),
        "etiketler": [
            "shorts", "keşfet", "ilginç bilgiler", "tarih", "biliyor muydunuz",
            "şaşırtıcı bilgiler", "tarihi magazin", "kraliçe elizabeth", "kurşunlu makyaj",
            "venedik beyazı", "viral shorts", "antik stüdyo"
        ],
        "publishAt": "2026-11-05T20:00:00+03:00",
    },
    {
        "kod": "EN_03",
        "dil": "EN",
        "dosya": "Bizarre_History_03_Toxic_Lead_Makeup_KESFET.mp4",
        "url": "https://panel.cutkoda.com/m/EwUvCoVmDXLWCc0YlgDT4PqwLwmze_77/Bizarre_History_03_Toxic_Lead_Makeup_KESFET.mp4",
        "baslik": "The royal makeup that ATE through Queen Elizabeth's skin! ☠️👑 #shorts #history #fyp",
        "aciklama": (
            "In the 1500s, pale skin was the ultimate symbol of royalty. "
            "After surviving smallpox, Queen Elizabeth I covered her scars with Venetian Ceruse—a luxury foundation made from toxic white lead and vinegar! "
            "As the lead slowly rotted her skin, caused hair loss, and blackened her teeth, she banned mirrors from the palace and layered the paste up to an inch thick without washing! "
            "Would you wear Renaissance makeup? Comment below 👇\n\n"
            "#shorts #fyp #history #weirdhistory #bizarrehistory #didyouknow #historyfacts #crazyfacts #viral #trending #queenelizabeth #tudorhistory #beautyhistory #ancientstudio"
        ),
        "etiketler": [
            "shorts", "fyp", "history", "weird history", "bizarre history",
            "did you know", "history facts", "crazy facts", "queen elizabeth",
            "venetian ceruse", "toxic makeup", "tudor history", "viral shorts", "ancient studio"
        ],
        "publishAt": "2026-11-05T21:30:00+03:00",
    },
    {
        "kod": "TR_04",
        "dil": "TR",
        "dosya": "Tarihi_Magazin_04_Gladyator_Teri_KESFET.mp4",
        "url": "https://panel.cutkoda.com/m/h1n4eloaODiXeyWa087_sWryfs8spzFs/Tarihi_Magazin_04_Gladyator_Teri_KESFET.mp4",
        "baslik": "Yüzlerine GLADYATÖR TERİ süren zengin kadınlar?! ⚔️🏺 #shorts #tarih #keşfet",
        "aciklama": (
            "Antik Roma'da zengin kadınların genç ve parlak kalmak için yüzlerine sürdüğü en pahalı gece kremi 'Gladyatör Teri' idi! "
            "Kolezyum'da dövüşen gladyatörlerin vücudunda biriken zeytinyağı, ter ve ölü deri tabakası dövüşten sonra 'Strigil' adlı kıvrık bronz aletle kazınıp küçük şişelere dolduruluyor ve arena önünde altın fiyatına satılıyordu! "
            "Siz olsanız güzellik uğruna bunu yüzünüze sürer miydiniz? Yorumlara yazın 👇\n\n"
            "#shorts #keşfet #ilginçbilgiler #tarih #biliyormuydunuz #ciltbakımı #güzellik #antikroma #şaşırtıcıbilgiler #tarihimagazin #viral #trend #antikstudyo"
        ),
        "etiketler": [
            "shorts", "keşfet", "ilginç bilgiler", "tarih", "biliyor muydunuz",
            "şaşırtıcı bilgiler", "tarihi magazin", "antik roma", "gladyatör teri",
            "strigil", "cilt bakımı", "viral shorts", "antik stüdyo"
        ],
        "publishAt": "2026-11-06T20:00:00+03:00",
    },
    {
        "kod": "EN_04",
        "dil": "EN",
        "dosya": "Bizarre_History_04_Gladiator_Sweat_KESFET.mp4",
        "url": "https://panel.cutkoda.com/m/0QhjsLntV5QuvY-iMS7mBmrT53SwjGwG/Bizarre_History_04_Gladiator_Sweat_KESFET.mp4",
        "baslik": "Why Roman women rubbed GLADIATOR SWEAT on their faces! ⚔️🏺 #shorts #history #fyp",
        "aciklama": (
            "In Ancient Rome, gladiators were the ultimate superstars. "
            "After combat in the Colosseum, attendants used a curved bronze blade called a 'strigil' to scrape the mixture of olive oil, sweat, arena dust, and dead skin off the fighters' bodies. "
            "Instead of throwing it away, they bottled the scrapings into vials (gloios) and sold them to wealthy Roman noblewomen as a luxury anti-aging face cream and aphrodisiac! "
            "Would you try Roman skincare? Comment below 👇\n\n"
            "#shorts #fyp #history #weirdhistory #bizarrehistory #didyouknow #historyfacts #crazyfacts #viral #trending #ancientrome #romanempire #gladiator #skincare #ancientstudio"
        ),
        "etiketler": [
            "shorts", "fyp", "history", "weird history", "bizarre history",
            "did you know", "history facts", "crazy facts", "ancient rome",
            "gladiator sweat", "strigil", "roman skincare", "viral shorts", "ancient studio"
        ],
        "publishAt": "2026-11-06T21:30:00+03:00",
    },
]

kayit_yol = os.path.join(D, "yuklenen_magazin.json")
yuklenenler = json.load(open(kayit_yol, encoding="utf-8")) if os.path.exists(kayit_yol) else {}

def resumable_init(tok, govde, boyut):
    data = json.dumps(govde).encode("utf-8")
    req = urllib.request.Request(
        "https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status",
        data=data,
        headers={
            "Authorization": f"Bearer {tok}",
            "Content-Type": "application/json; charset=UTF-8",
            "X-Upload-Content-Length": str(boyut),
            "X-Upload-Content-Type": "video/mp4",
        },
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=30) as resp:
        return resp.headers.get("Location")

for it in PAKET:
    kod = it["kod"]
    dil = it["dil"]
    baslik = it["baslik"]
    if kod in yuklenenler or baslik in mevcut_basliklar[dil]:
        vid = yuklenenler.get(kod, {}).get("vid") or mevcut_basliklar[dil].get(baslik)
        print(f"NOT: ATLANDI (zaten yuklu) {kod} -> vid={vid}")
        continue

    yerel = os.path.join(D, "medya", it["dosya"])
    if not os.path.exists(yerel) or os.path.getsize(yerel) < 100000:
        req = urllib.request.Request(it["url"], headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=120) as r, open(yerel, "wb") as f:
            while True:
                b = r.read(1024 * 256)
                if not b:
                    break
                f.write(b)

    boyut = os.path.getsize(yerel)
    tok = tokens[dil]
    lang_code = "tr" if dil == "TR" else "en"
    snippet = {
        "title": baslik[:100],
        "description": it["aciklama"],
        "tags": it["etiketler"],
        "categoryId": "27",
        "defaultLanguage": lang_code,
        "defaultAudioLanguage": lang_code,
    }
    status_planli = {
        "privacyStatus": "private",
        "publishAt": it["publishAt"],
        "selfDeclaredMadeForKids": False,
        "containsSyntheticMedia": True,
    }

    try:
        try:
            loc = resumable_init(tok, {"snippet": snippet, "status": status_planli}, boyut)
        except urllib.error.HTTPError as e:
            err_body = e.read().decode("utf-8", errors="replace")
            if "quota" in err_body.lower():
                print(f"NOT: KOTA DOLDU ({kod}): gunluk YouTube API yukleme kotasi sinirina ulasildi")
                break
            status_ozel = {
                "privacyStatus": "private",
                "selfDeclaredMadeForKids": False,
                "containsSyntheticMedia": True,
            }
            loc = resumable_init(tok, {"snippet": snippet, "status": status_ozel}, boyut)

        with open(yerel, "rb") as vf:
            video_bytes = vf.read()
        up_req = urllib.request.Request(
            loc,
            data=video_bytes,
            headers={
                "Content-Type": "video/mp4",
                "Content-Length": str(boyut),
            },
            method="PUT",
        )
        with urllib.request.urlopen(up_req, timeout=300) as up_resp:
            sonuc = json.load(up_resp)

        vid = sonuc["id"]
        st_out = sonuc.get("status", {})
        gz_out = st_out.get("privacyStatus", "")
        pub_out = st_out.get("publishAt", "")
        yuklenenler[kod] = {
            "vid": vid,
            "dil": dil,
            "baslik": baslik,
            "durum": gz_out,
            "publishAt": pub_out or it["publishAt"],
            "zaman": datetime.now(TZ).isoformat(timespec="seconds"),
        }
        with open(kayit_yol, "w", encoding="utf-8") as kf:
            json.dump(yuklenenler, kf, ensure_ascii=False, indent=1)
        os.chmod(kayit_yol, 0o600)
        print(f"NOT: YUKLENDI {kod} | vid={vid} | durum={gz_out} | plan={pub_out or 'ozel'}")
    except urllib.error.HTTPError as e:
        err_txt = e.read().decode("utf-8", errors="replace")[:220].replace("\n", " ")
        print(f"NOT: HATA {kod} HTTP {e.code}: {err_txt}")
        if "quota" in err_txt.lower():
            break
    except Exception as e:
        print(f"NOT: HATA {kod}: {str(e)[:180]}")
PY
