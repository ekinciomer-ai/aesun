#!/usr/bin/env python3
"""Format Raporu (Portal → Yayın Takibi → 🎬 Format Raporu).

Hangi video formatı, video skill'i, ses ve araç ne kadar izlenmiş/beğenilmiş gösterir.
Kaynaklar:
  1) YouTube Data API (YT_API_KEY): bütün kanalların herkese açık videoları + izlenme/beğeni/yorum/süre.
     Anahtar yoksa docs/yayin/yayin.json'daki yayındaki kayıtlar kullanılır.
  2) sunucu/havuz/teslim/*.json (Yükleme Yöneticisi teslim kayıtları): GERÇEK seri, ses, görsel, müzik, üreten.
  3) docs/yayin/yayin.json: seri, üreten, izleme yüzdesi.
  Kayıt bulunamayan videolarda format/ses/araç kanal kararlarından TAHMİN edilir ve "tahmin" diye işaretlenir.
Çıktı: docs/yayin/format_rapor.json. Saatte en çok bir kez çalışır (ZORLA=1 ile her zaman).
Bu betik yalnız okur; YouTube'da hiçbir şeyi değiştirmez.
"""
import glob, json, os, re, sys, urllib.parse
from datetime import datetime, timedelta, timezone

KOK = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from guncelle import KANALLAR, YORUM_EK_KANALLAR, getir  # noqa: E402

CIKTI = os.path.join(KOK, "docs", "yayin", "format_rapor.json")
TZ = timezone(timedelta(hours=3))
RENK = {"Antik Stüdyo": "#c8963e", "Ancient Studio": "#b07d2b", "Estudio Antiguo": "#9a6a20",
        "Kozmos Lab TR": "#e8762c", "Kozmos Lab": "#d0601a", "Kara Kutu Mayday": "#f08a24",
        "Black Box Files Mayday": "#3d7be0", "Caja Negra": "#e0b400", "Nasıl Yapıldı": "#d9a800",
        "Yolu Seç !": "#1fb5b0", "Ömür Dediğin": "#8a6bd1", "LVL MAX": "#d23c6c"}
HAVUZ_KANAL = {"TR": "Antik Stüdyo", "EN": "Ancient Studio", "ES": "Estudio Antiguo", "KZ_TR": "Kozmos Lab TR",
               "KZ_EN": "Kozmos Lab", "OD": "Ömür Dediğin", "NY": "Nasıl Yapıldı", "YR": "Yolu Seç !",
               "LM": "LVL MAX", "KK_TR": "Kara Kutu Mayday"}


def norm(t):
    t = re.sub(r"#\S+", " ", (t or "").lower())
    return re.sub(r"[^0-9a-zçğıöşüâîûñéáíóú]+", "", t)


def has(t, *ks):
    t = (t or "").lower()
    return any(k in t for k in ks)


# ---------- kayıttan çıkarım ----------
def ses_adi(s):
    s = s or ""
    gem = [n for n in ("Charon", "Puck", "Kore", "Zephyr", "Fenrir", "Aoede", "Leda", "Orus") if n.lower() in s.lower()]
    if gem: return "Gemini " + " + ".join(gem)
    if has(s, "gtts"): return "gTTS (Google Translate)"
    if has(s, "gemini"): return "Gemini TTS"
    if has(s, "uğur", "ugur"): return "ElevenLabs “Uğur”"
    if has(s, "umit dogan", "ümit doğan"): return "ElevenLabs “Umit Dogan”"
    if has(s, "seyfullah"): return "ElevenLabs “Seyfullah Kartal”"
    if has(s, "benim_denemem2"): return "Klon ses “benim_denemem2”"
    if has(s, "benim2", "ömer klon", "kendi sesi"): return "Klon ses “benim2”"
    if has(s, "kanal kendi klon", "klon_ses"): return "Kanal klon sesi (ElevenLabs v3)"
    if has(s, "higgsfield"): return "Higgsfield text2speech"
    if has(s, "elevenlabs"): return "ElevenLabs (ad yazılmamış)"
    return s[:40] or "Kayıtlı değil"


def ses_araci(s):
    s = (s or "").lower()
    if "higgsfield" in s: return "Higgsfield text2speech"
    if "gtts" in s: return "gTTS"
    if "gemini" in s: return "Gemini TTS"
    if "elevenlabs" in s or "klon" in s: return "ElevenLabs"
    return "Kayıtlı değil"


ARAC_KURAL = [
    (("three.js", "threejs"), "Three.js 3D (kod)"), (("remotion",), "Remotion"), (("react",), "React + SVG animasyon"),
    (("canvas",), "HTML canvas animasyon"), (("gpt image", "gpt_image"), "Higgsfield GPT Image"),
    (("minimax",), "MiniMax video"), (("higgsfield",), "Higgsfield"), (("wikimedia", "kamu malı"), "Kamu malı / Wikimedia görsel"),
    (("pixabay",), "Pixabay görüntü"), (("nasa",), "NASA görüntü"), (("foto-canlandirma", "fırça"), "foto-canlandırma"),
    (("wellcome", "cc by"), "CC lisanslı görsel"), (("gazete",), "Gazete manşeti (kod)"), (("svg",), "SVG (kod)"),
]


def araclar_kayit(lis):
    g = " ".join(str(lis.get(k, "")) for k in ("gorsel", "video", "goruntu")).lower()
    t = []
    for ks, ad in ARAC_KURAL:
        if any(k in g for k in ks) and ad not in t: t.append(ad)
    m = str(lis.get("muzik", "")).lower()
    if m:
        t.append("Kodla müzik/ses tasarımı" if any(k in m for k in ("kod", "prosedür", "dsp", "sentez")) else
                 "AI müzik" if any(k in m for k in ("suno", "yapay", "ai ")) else "Müzik (özgün/lisanslı)")
    return t


def skill_kayit(seri, lis, kanal):
    g = json.dumps(lis, ensure_ascii=False).lower()
    s = (seri or "").lower()
    if "tablo" in s: return "foto-canlandirma"
    if "foto-canlandirma" in g: return "foto-canlandirma"
    if "gündem" in s: return "gundem-tarih-video"
    if "three.js" in g or "threejs" in g:
        return "teardown-simulator" if kanal.startswith(("Kara", "Black", "Caja")) else "kodla-film-stilleri (3D)"
    if "remotion" in g or "canvas" in g or "svg" in g: return "kodla-film-stilleri"
    if "higgsfield" in g and kanal == "Ömür Dediğin": return "karakter-video-promptu"
    if kanal in ("Antik Stüdyo", "Ancient Studio", "Estudio Antiguo"): return "antik-studyo-icerik"
    return "kanal-uretim-hatti"


# ---------- tahmin (kayıt yoksa) ----------
def tahmin(kanal, t, tarih):
    d = tarih[5:]
    if kanal in ("Antik Stüdyo", "Ancient Studio", "Estudio Antiguo"):
        tr = kanal == "Antik Stüdyo"
        if has(t, "lao tzu"): return "Söz kartı", "Seslendirme yok (müzik)", "antik-studyo-icerik", ["Tek görsel söz kartı"]
        if has(t, "tablo", "rembrandt", "mona lisa", "gece devriyesi", "venüs gerçekte", "son akşam", "gotiği", "öpücük",
               "kaplumbağa", "tortoise", "scream", "pearl", "van gogh", "prado", "gothic"):
            return "Tablo Serisi", ("ElevenLabs “Uğur”" if tr else "ElevenLabs (dil sürümü)"), "foto-canlandirma", ["Kamu malı / Wikimedia görsel", "Kodla canlandırma"]
        if has(t, "a ligi", "celtic", "france–turquie", "maraton", "marathon"): f = "Spor + Tarih"
        elif has(t, "antalya", "black friday", "10kasım", "10 kasım", "09.05", "vote", "australia", "paseo", "akıncı", "raider", "pürdikkat", "senin kararın"): f = "Gündem + Tarih"
        elif has(t, "zehir", "poison", "veneno", "gladyatör", "gladiator", "fondöten", "makeup", "worms", "mice", "eyebrows", "hapşır", "sneez", "estorn", "brujas"): f = "Tarihi Magazin"
        elif has(t, "gece ", "karabasan", "yapma denen"): f = "Gece Yasakları (inanç–tarih)"
        elif has(t, "râzî", "kuşçu", "cezeri", "sînâ", "akıl hastaları"): f = "Bilim İnsanları"
        elif has(t, "sinan", "ayasofya", "topkapı", "mihrab", "keops"): f = "Mimari Sırlar"
        elif has(t, "mavi göz", "evil eye", "ojo turco", "palabras"): f = "İnanç / Dil–Tarih"
        elif has(t, "emu"): f = "Tarihin Patileri"
        else: f = "Osmanlı Strateji / Boğazlar"
        v = "ElevenLabs (dil sürümü)" if not tr else ("ElevenLabs “Umit Dogan”" if d >= "11-12" else "Klon ses “benim2”")
        sk = "gundem-tarih-video" if f == "Gündem + Tarih" else "antik-studyo-icerik"
        return f, v, sk, ["AI illüstrasyon", "Kodla animasyon", "Harita"]
    if kanal.startswith("Kozmos"):
        if has(t, "instagram", "yüzünü nasıl", "qr kod", "gps", "kulaklık", "shazam", "mp3"):
            return "Merak Lab", "Gemini TTS", "kodla-film-stilleri (3D)", ["Three.js 3D (kod)", "Kodla müzik/ses tasarımı"]
        if has(t, "nükleer", "nuclear", "baraj", "dam", "rüzgâr", "wind", "kum", "sand", "uydu", "satellite", "26 mw"):
            return "Enerji Üretim Kaynakları", "Klon ses “benim2”", "teardown-simulator", ["Three.js 3D (kod)"]
        return "Uzay Shorts", "Klon ses “benim2”", "gercek-goruntulu-belgesel", ["NASA görüntü", "AI müzik"]
    if kanal == "Kara Kutu Mayday":
        if has(t, "mit mi"): return "Mit mi Gerçek mi?", "Gemini Charon", "teardown-simulator", ["Three.js 3D (kod)"]
        return "Kara Kutu Arşiv & Kaza Analizi", "Gemini Puck + Kore + Charon", "foto-canlandirma", ["foto-canlandırma", "Gazete manşeti (kod)"]
    if kanal == "Yolu Seç !":
        return "Yolu Sen Seç", "Higgsfield “Anlatıcı 2” (Harrison)", "karakter-video-promptu", ["AI görsel (Antigravity)", "Higgsfield klip"]
    if kanal == "Nasıl Yapıldı":
        return "Nasıl Yapıldı Shorts", "Gemini TTS", "kanal-uretim-hatti", ["Kodla 3D animasyon"]
    return "Diğer", "Kayıtlı değil", "kanal-uretim-hatti", []


# ---------- veri toplama ----------
def sure_sn(iso):
    m = re.match(r"PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?", iso or "")
    return sum(int(a or 0) * b for a, b in zip(m.groups(), (3600, 60, 1))) if m else 0


def api_videolar(anahtar):
    kan = dict(KANALLAR); kan.update(YORUM_EK_KANALLAR)
    out, eksik = [], []
    for cid, (kanal, dil) in kan.items():
        ids, tok = [], None
        try:
            for _ in range(6):   # en çok 300 video / kanal
                p = {"part": "contentDetails", "playlistId": "UU" + cid[2:], "maxResults": 50, "key": anahtar}
                if tok: p["pageToken"] = tok
                d = json.loads(getir("https://www.googleapis.com/youtube/v3/playlistItems?" + urllib.parse.urlencode(p)))
                ids += [i["contentDetails"]["videoId"] for i in d.get("items", [])]
                tok = d.get("nextPageToken")
                if not tok: break
        except Exception as e:
            eksik.append(f"{kanal}: liste okunamadı ({e})"); continue
        if not ids:
            eksik.append(f"{kanal}: herkese açık video yok"); continue
        for i in range(0, len(ids), 50):
            q = urllib.parse.urlencode({"part": "snippet,statistics,contentDetails,status", "id": ",".join(ids[i:i + 50]), "key": anahtar})
            for v in json.loads(getir("https://www.googleapis.com/youtube/v3/videos?" + q)).get("items", []):
                if v.get("status", {}).get("privacyStatus") != "public": continue
                sn, st = v["snippet"], v.get("statistics", {})
                yay = datetime.fromisoformat(sn["publishedAt"].replace("Z", "+00:00")).astimezone(TZ)
                s = sure_sn(v["contentDetails"].get("duration"))
                out.append(dict(ch=kanal, dil=dil, id=v["id"], t=sn.get("title", ""), d=yay.strftime("%Y-%m-%d"),
                                v=int(st.get("viewCount", 0)), l=int(st.get("likeCount", 0)), c=int(st.get("commentCount", 0)),
                                dur=s, typ="Shorts" if s <= 180 else "Uzun"))
    return out, eksik


def yayin_videolar(yj):
    out = []
    for x in yj.get("kayitlar", []):
        if x.get("platform") != "YouTube" or x.get("durum") != "Yayında" or not x.get("vid"): continue
        kanal = re.sub(r"\s*\(@.*\)$", "", x.get("kanal", ""))
        out.append(dict(ch=kanal, dil=x.get("dil"), id=x["vid"], t=x.get("baslik", ""), d=x.get("tarih", ""),
                        v=x.get("izlenme") or 0, l=x.get("begeni") or 0, c=x.get("yorum_sayisi") or 0,
                        dur=int(x.get("ort_sure_sn") or 0), typ="Shorts" if x.get("tur") == "Short" else "Uzun"))
    return out, ["YT_API_KEY yok: yalnız Yayın Takibi tablosundaki videolar (Kara Kutu hariç)"]


def main():
    zorla = os.environ.get("ZORLA") == "1"
    simdi = datetime.now(TZ)
    if not zorla and os.path.exists(CIKTI):
        try:
            oj = json.load(open(CIKTI, encoding="utf-8"))
            onceki = datetime.fromisoformat(oj["guncelleme"])
            api_eksik = os.environ.get("YT_API_KEY") and oj.get("kaynak") != "YouTube Data API"
            if simdi - onceki < timedelta(minutes=55) and not api_eksik:
                print("Format raporu güncel, atlandı."); return
        except Exception:
            pass
    yj = json.load(open(os.path.join(KOK, "docs", "yayin", "yayin.json"), encoding="utf-8"))
    anahtar = os.environ.get("YT_API_KEY", "").strip()
    vids, eksik = api_videolar(anahtar) if anahtar else yayin_videolar(yj)
    if not vids:
        print("Video bulunamadı, rapor yazılmadı."); return
    yix = {x.get("vid"): x for x in yj.get("kayitlar", []) if x.get("vid")}
    hav = {}
    for f in glob.glob(os.path.join(KOK, "sunucu", "havuz", "teslim", "*.json")):
        try:
            h = json.load(open(f, encoding="utf-8"))
        except Exception:
            continue
        for b in [h.get("baslik")] + list(h.get("baslik_secenekleri") or []):
            if b: hav[norm(b)] = h
    # yükleme kuyruğu kayıtları (havuzdan önceki yüklemeler): görsel/müzik kaynağı, seri, üreten
    kuy = {}
    for f in glob.glob(os.path.join(KOK, "sunucu", "yt_kuyruk", "tamam", "*.json")):
        try:
            k = json.load(open(f, encoding="utf-8"))
        except Exception:
            continue
        metin = " ".join(str(x) for x in (k.get("kaynaklar") or []))
        ses = k.get("tts_motoru") or " ".join(re.findall(r"[^.;]*(?:seslendir|ses:|elevenlabs|gemini|klon)[^.;]*", metin, re.I))
        k["lisans"] = {"gorsel": metin, "muzik": k.get("muzik_lisans", ""), "ses": ses}
        if k.get("vid"): kuy[k["vid"]] = k
        if k.get("baslik"): kuy.setdefault(norm(k["baslik"]), k)
    kayitli = 0
    for r in vids:
        h = hav.get(norm(r["t"]))
        if not h:
            h = kuy.get(r["id"]) or kuy.get(norm(r["t"]))
        y = yix.get(r["id"], {})
        f_t, v_t, sk_t, ar_t = tahmin(r["ch"], r["t"], r["d"])
        if h:
            lis = h.get("lisans") or {}
            kayitli += 1
            sv = ses_adi(lis.get("ses")) if lis.get("ses") else v_t
            r.update(kaynak="kayıt" if lis.get("ses") else "kayıt (ses tahmin)", f=h.get("seri") or y.get("seri") or f_t, voice=sv,
                     sa=ses_araci(lis.get("ses") or v_t), vs=skill_kayit(h.get("seri"), lis, r["ch"]),
                     tools=araclar_kayit(lis) or ar_t, ureten=h.get("ureten") or y.get("ureten") or "?", kod=h.get("kod"))
        else:
            r.update(kaynak="tahmin", f=(y.get("seri") if y.get("seri") and y.get("seri") != "Gündem + Tarih" else f_t),
                     voice=v_t, sa=ses_araci(v_t) if "Seslendirme yok" not in v_t else "Yalnız müzik",
                     vs=sk_t, tools=ar_t, ureten=y.get("ureten") or "?")
        if y.get("tutma_yuzdesi") is not None: r["tutma"] = y["tutma_yuzdesi"]
        if y.get("izlenme_yuzde") is not None: r["izy"] = y["izlenme_yuzde"]
        r["col"] = RENK.get(r["ch"], "#888")
    vids.sort(key=lambda r: r["d"], reverse=True)
    json.dump({"guncelleme": simdi.isoformat(timespec="seconds"), "kaynak": "YouTube Data API" if anahtar else "yayin.json",
               "kayitli": kayitli, "toplam": len(vids), "eksik": eksik, "videolar": vids},
              open(CIKTI, "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
    print(f"Format raporu: {len(vids)} video, {kayitli} tanesi üretim kaydından.")


if __name__ == "__main__":
    main()
