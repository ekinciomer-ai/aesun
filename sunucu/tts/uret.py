"""Ücretsiz, tonlu Türkçe seslendirme (edge-tts; yedek: gTTS).
İş dosyası: kuyruk/<kod>.json
  {"kod":"X","ses":"ahmet","oto_ton":true,
   "parcalar":[{"ad":"s1","metin":"[heyecan] Bakın! [fisilti] ama kimse bilmiyordu... [dur 0.8] [ses:emel] Sahi mi?"}]}
Etiketler (metnin içinde, istenen yerde): [normal] [heyecan] [fisilti] [gizem] [gerilim] [soru] [vurgu] [sakin]
  [komik] [hizli] [yavas] [anlatici] — [ses:ahmet|emel|andrew|ava|brian|emma|florian|seraphina|remy|vivienne]
  [dur 0.6] (saniye sessizlik)
oto_ton (varsayılan açık): etiketsiz cümlelerde ? → soru, ! → heyecan, ... → gizem; diğerlerine küçük doğal oynama.
Çıktı: cikti/<kod>__<ad>.mp3
"""
import asyncio, base64, glob, hashlib, json, os, re, subprocess, sys, tempfile, urllib.request

SESLER = {  # Türkçe yerli 2 ses + Türkçe konuşabilen çok dilli sesler (hafif aksanlı, çeşitlilik için)
    "ahmet": "tr-TR-AhmetNeural", "emel": "tr-TR-EmelNeural",
    "andrew": "en-US-AndrewMultilingualNeural", "ava": "en-US-AvaMultilingualNeural",
    "brian": "en-US-BrianMultilingualNeural", "emma": "en-US-EmmaMultilingualNeural",
    "florian": "de-DE-FlorianMultilingualNeural", "seraphina": "de-DE-SeraphinaMultilingualNeural",
    "remy": "fr-FR-RemyMultilingualNeural", "vivienne": "fr-FR-VivienneMultilingualNeural",
}
# Google Chirp 3 HD (doğal, duygulu; varsayılan motor). Anahtar sunucu kasasından ortam değişkeniyle gelir.
GSESLER = {"charon": ("Charon", "erkek"), "fenrir": ("Fenrir", "erkek"), "puck": ("Puck", "erkek"), "orus": ("Orus", "erkek"),
           "enceladus": ("Enceladus", "erkek"), "iapetus": ("Iapetus", "erkek"), "algenib": ("Algenib", "erkek"),
           "aoede": ("Aoede", "kadın"), "kore": ("Kore", "kadın"), "leda": ("Leda", "kadın"), "zephyr": ("Zephyr", "kadın"),
           "despina": ("Despina", "kadın"), "callirrhoe": ("Callirrhoe", "kadın"), "sulafat": ("Sulafat", "kadın")}
GES = {"ahmet": "charon", "emel": "kore"}  # eski adlar
#            hız %, perde Hz, ses %, sonrasında es (sn)
TONLAR = {
    "normal":   (0, 0, 0, 0.28),
    "anlatici": (-4, -2, 0, 0.35),
    "heyecan":  (18, 12, 10, 0.22),
    "fisilti":  (-12, -6, -35, 0.45),
    "gizem":    (-15, -10, -10, 0.60),
    "gerilim":  (-8, -14, 0, 0.50),
    "soru":     (4, 15, 0, 0.45),
    "vurgu":    (-6, 4, 15, 0.40),
    "sakin":    (-10, -4, -5, 0.40),
    "komik":    (12, 20, 5, 0.30),
    "hizli":    (25, 3, 0, 0.18),
    "yavas":    (-20, -3, 0, 0.45),
    "canli":    (8, 4, 5, 0.18),   # Shorts bilim anlatıcısı: tek istekte cümleden cümleye ton değişir (kota dostu)
}
def google_soyle(cumle, ses, ton, oto, yol):
    k = os.environ.get("GOOGLE_TTS_KEY")
    if not k: raise RuntimeError("google anahtarı yok")
    g = GSESLER[GES.get(ses, ses)][0]
    h, _, v, _ = oynama(cumle, ton, oto)
    hiz = max(0.25, min(2.0, 1 + int(h.rstrip("%")) / 100))
    dk = {"tr": "tr-TR", "en": "en-US", "es": "es-ES", "de": "de-DE", "fr": "fr-FR"}.get(globals().get("DIL", "tr"), "tr-TR")   # iş dosyasındaki "dil"
    govde = {"input": {"text": cumle}, "voice": {"languageCode": dk, "name": f"{dk}-Chirp3-HD-{g}"},
             "audioConfig": {"audioEncoding": "MP3", "speakingRate": round(hiz, 2), "volumeGainDb": max(-12, min(8, int(v.rstrip("%")) / 4))}}
    r = urllib.request.Request(f"https://texttospeech.googleapis.com/v1/text:synthesize?key={k}", data=json.dumps(govde).encode(),
                               headers={"Content-Type": "application/json"}, method="POST")
    with urllib.request.urlopen(r, timeout=40) as y:
        open(yol, "wb").write(base64.b64decode(json.load(y)["audioContent"]))

# Gemini TTS: tonlar doğal dil yönergesiyle verilir (gerçek duygulu okuma). Ücretsiz kotalı.
GYON = {"normal": "Say naturally and engagingly", "anlatici": "Narrate like a captivating documentary narrator",
        "heyecan": "Say very excitedly and energetically", "fisilti": "Whisper secretively",
        "gizem": "Say mysteriously, slowly and in a low voice", "gerilim": "Say tensely, full of suspense",
        "soru": "Ask curiously, as if asking the listener", "vurgu": "Say firmly with strong emphasis",
        "sakin": "Say calmly and warmly", "komik": "Say playfully, with a smile", "hizli": "Say quickly", "yavas": "Say slowly",
        "canli": "Read like an energetic, fast-paced science Shorts narrator. Keep a brisk pace with short pauses. Change your tone sentence by sentence: curious and intriguing on questions, punchy emphasis on numbers, playful on everyday comparisons, warm and inviting at the end"}
_GMODELLER = []
_BITEN_MODELLER = set()
_DIL_YOK = set()

def gemini_anahtarlar(tercih_ad=None):
    sira = []
    if tercih_ad:
        sira.append((tercih_ad, os.environ.get(f"KASA_{tercih_ad}") or ""))
    for ad in ("gemini_api_key_716744873763", "gemini_api_anahtar_nasilyapildi", "gemini_api_key", "gemini_api_anahtar", "gemini_api_anahtar_kozmos"):
        sira.append((ad, os.environ.get(f"KASA_{ad}") or ""))
    for ek in sorted(k for k in os.environ if k.startswith("KASA_gemini")):
        sira.append((ek[5:], os.environ.get(ek) or ""))
    sira.append(("varsayilan", os.environ.get("GEMINI_KEY") or ""))
    cikti, gorulen = [], set()
    for ad, val in sira:
        val = val.strip()
        if val and val not in gorulen:
            gorulen.add(val); cikti.append((ad, val))
    return cikti

def gemini_modeller(k, tercih_ust=None, anahtar_ad="varsayilan"):
    if _GMODELLER:
        kalan = [m for m in _GMODELLER if (anahtar_ad, m) not in _BITEN_MODELLER]
        if not kalan:
            return []
        if tercih_ust and tercih_ust in kalan:
            kalan = [tercih_ust] + [m for m in kalan if m != tercih_ust]
        return kalan
    with urllib.request.urlopen(f"https://generativelanguage.googleapis.com/v1beta/models?key={k}&pageSize=200", timeout=40) as y:
        adlar = [m["name"].split("/")[-1] for m in json.load(y).get("models", []) if "tts" in m["name"]]
    tercih = tercih_ust or os.environ.get("GEMINI_TTS_MODEL") or "gemini-3.1-flash-tts-preview"
    adlar.sort(key=lambda a: (a != tercih, "lite" in a, "flash" not in a, "preview" in a, a))
    if not adlar: raise RuntimeError("Gemini TTS modeli bulunamadı")
    print(f"NOT: Gemini TTS modelleri: {', '.join(adlar)}")
    _GMODELLER.extend(adlar); return list(_GMODELLER)

def gemini_model(k):
    return gemini_modeller(k)[0]

DIL = "tr"  # iş dosyasındaki "dil" alanı (tr|en|es); yoksa Türkçe
DILKOD = {"tr": ("tr-TR", "Turkish"), "en": ("en-US", "English"), "es": ("es-ES", "Spanish")}

_KILIT = False  # iş dosyasında "model_kilit": true → yalnız model_tercih kullanılır (Ömer 21.11.2026: model değişince ses değişiyor)
_HARIC = set()  # iş dosyasında "anahtar_haric": [...] → bu kasa anahtarları kullanılmaz

def gemini_soyle(metin, ses, yol_wav, ton="normal", tercih_ust=None, anahtar_tercih=None):
    import time, urllib.error
    anahtarlar = gemini_anahtarlar(anahtar_tercih)
    if not anahtarlar: raise RuntimeError("gemini anahtarı yok")
    son_hata = None
    for anahtar_ad, k in anahtarlar:
        if anahtar_ad in _HARIC: continue
        ms = gemini_modeller(k, tercih_ust, anahtar_ad)
        if _KILIT and tercih_ust: ms = [m for m in ms if m == tercih_ust]  # tek model: farklı modele geçip sesi değiştirmez
        for m in ms:
            istek_metin = f"{GYON.get(ton, GYON['normal'])} in {DILKOD.get(DIL, DILKOD['tr'])[1]}: {metin}" if "2.5" in m else metin
            sc = {"voiceConfig": {"prebuiltVoiceConfig": {"voiceName": GSESLER[GES.get(ses, ses)][0]}}}
            if m not in _DIL_YOK: sc["languageCode"] = DILKOD.get(DIL, DILKOD["tr"])[0]
            govde = {"contents": [{"parts": [{"text": istek_metin}]}],
                     "generationConfig": {"responseModalities": ["AUDIO"], "speechConfig": sc}}
            for deneme in range(3):
                r = urllib.request.Request(f"https://generativelanguage.googleapis.com/v1beta/models/{m}:generateContent?key={k}",
                                           data=json.dumps(govde).encode(), headers={"Content-Type": "application/json"}, method="POST")
                try:
                    with urllib.request.urlopen(r, timeout=300) as y:
                        d = json.load(y)
                    parca = d["candidates"][0]["content"]["parts"][0]["inlineData"]
                    mime = (parca.get("mimeType") or "").lower()
                    hz = re.search(r"rate=(\d+)", mime); hz = hz.group(1) if hz else "24000"
                    veri = base64.b64decode(parca["data"])
                    ham = yol_wav + ".bin"; open(ham, "wb").write(veri)
                    if veri[:4] in (b"RIFF", b"OggS", b"fLaC") or veri[:3] == b"ID3" or any(x in mime for x in ("wav", "mp3", "mpeg", "ogg")):
                        ff("-i", ham, "-ar", "24000", "-ac", "1", yol_wav)
                    else:
                        ff("-f", "s16le", "-ar", hz, "-ac", "1", "-i", ham, "-ar", "24000", "-ac", "1", yol_wav)
                    os.remove(ham)
                    print(f"NOT: Gemini {m} ({ses}, kasa:{anahtar_ad}) okudu")
                    time.sleep(5); return
                except urllib.error.HTTPError as e:
                    govde_hata = e.read().decode("utf-8", "replace")
                    son_hata = f"Gemini {m} ({anahtar_ad}) HTTP {e.code} {govde_hata[:120]}"
                    if e.code == 400 and "language" in govde_hata.lower() and m not in _DIL_YOK:
                        _DIL_YOK.add(m); print(f"NOT: {m} dil kodunu desteklemiyor, dil kodsuz denenecek")
                        continue
                    if e.code == 429:
                        if "PerDay" in govde_hata:
                            _BITEN_MODELLER.add((anahtar_ad, m))
                            print(f"NOT: {m} ({anahtar_ad}) günlük kota dolu (429 PerDay), sıradakine geçiliyor...")
                            break
                        if deneme < 2:
                            rd = re.search(r'"retryDelay":\s*"(\d+)', govde_hata)
                            bekle = min(65, (int(rd.group(1)) + 3) if rd else 25)
                            print(f"NOT: {m} ({anahtar_ad}) dakikalık sınır (429 RPM), {bekle} sn beklenip tekrar denenecek...")
                            time.sleep(bekle)
                            continue
                        print(f"NOT: {m} ({anahtar_ad}) kota dolu (429), sıradakine geçiliyor...")
                        break
                    print(f"NOT: {son_hata}"); break
                except Exception as e:
                    son_hata = f"Gemini {m} {e}"; print(f"NOT: {son_hata}"); break
    raise RuntimeError(son_hata or "Tüm kasa anahtarlarındaki Gemini TTS modelleri dolu")

def gemini_uret(is_, parca, tmp):
    global _KILIT, _HARIC
    _KILIT = bool(is_.get("model_kilit")); _HARIC = set(is_.get("anahtar_haric") or [])
    anahtar_tercih = parca.get("anahtar") or is_.get("anahtar")
    if parca.get("tek_istek"):
        w = f"{tmp}/g000.wav"
        gemini_soyle(parca["metin"], parca.get("ses", is_.get("ses", "charon")), w, parca.get("ton", "anlatici"), is_.get("model_tercih"), anahtar_tercih)
        return [w], 1, 0
    adimlar = ayristir(parca["metin"], parca.get("ses", is_.get("ses", "charon")), False)
    obek = []  # [ses, ton, [cümleler]] veya ["dur", sn]
    for a in adimlar:
        if a[0] == "dur": obek.append(["dur", a[1]]); continue
        _, ses, ton, c = a
        if obek and obek[-1][0] == ses and obek[-1][1] == ton: obek[-1][2].append(c)
        else: obek.append([ses, ton, [c]])
    wavlar, uyari = [], 0
    for i, o in enumerate(obek):
        w = f"{tmp}/g{i:03d}.wav"
        if o[0] == "dur":
            ff("-f", "lavfi", "-i", "anullsrc=r=24000:cl=mono", "-t", f"{o[1]:.2f}", w); wavlar.append(w); continue
        ses, ton, cs = o; metin = " ".join(cs)
        gemini_soyle(metin, ses, w, ton, is_.get("model_tercih"), anahtar_tercih)
        sure = float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", w],
                                    capture_output=True, text=True).stdout or 0)
        if sure > len(metin) / 9 + 3:
            uyari += 1; print(f"NOT: uyarı {is_['kod']}/{parca['ad']} parça {i} beklenenden uzun ({sure:.0f} sn), fazladan okuma olabilir")
        w2 = f"{tmp}/g{i:03d}p.wav"; ff("-i", w, "-af", f"apad=pad_dur={TONLAR[ton][3]}", w2); wavlar.append(w2)
    return wavlar, len(obek), uyari

ETIKET = re.compile(r"\[\s*([a-zçğıöşü]+)\s*(?::\s*([a-z]+)|\s+([0-9.]+))?\s*\]", re.I)

def cumleler(metin):
    return [c.strip() for c in re.findall(r"[^.!?…]+(?:\.\.\.|[.!?…]+)?", metin) if c.strip(" \n\t")]

def ayristir(metin, ses, oto):
    """Metni (tür, değer) adımlarına böler: ('soz', ses, ton, cümle) | ('dur', sn)."""
    adimlar, ton, etiketli, konum = [], "normal", False, 0
    parcalar = []
    for m in ETIKET.finditer(metin):
        parcalar.append(("metin", metin[konum:m.start()])); konum = m.end()
        ad, deger, sayi = m.group(1).lower(), m.group(2), m.group(3)
        parcalar.append(("etiket", (ad, (deger or "").lower(), sayi)))
    parcalar.append(("metin", metin[konum:]))
    for tur, v in parcalar:
        if tur == "etiket":
            ad, deger, sayi = v
            if ad == "ses" and (deger in SESLER or deger in GSESLER): ses = deger
            elif ad in ("dur", "es") and sayi: adimlar.append(("dur", min(float(sayi), 5.0)))
            elif ad in TONLAR: ton, etiketli = ad, True
            continue
        for c in cumleler(v):
            t = ton
            if oto and (not etiketli or ton == "normal"):
                if c.endswith("?"): t = "soru"
                elif c.endswith("!"): t = "heyecan"
                elif c.endswith("...") or c.endswith("…"): t = "gizem"
            adimlar.append(("soz", ses, t, c))
    return adimlar

def oynama(cumle, ton, oto):
    h, p, v, es = TONLAR[ton]
    if oto:  # aynı metin hep aynı sonucu verir; ama cümleler birbirinden hafif farklı → tekdüzelik kırılır
        d = hashlib.md5(cumle.encode()).digest()
        h += d[0] % 9 - 4; p += d[1] % 7 - 3
    f = lambda x, b: f"{'+' if x >= 0 else ''}{int(x)}{b}"
    return f(h, "%"), f(p, "Hz"), f(v, "%"), es

async def edge_soyle(cumle, ses, ton, oto, yol):
    import edge_tts
    h, p, v, _ = oynama(cumle, ton, oto)
    await asyncio.wait_for(edge_tts.Communicate(cumle, SESLER[ses], rate=h, pitch=p, volume=v).save(yol), timeout=40)

def gtts_soyle(cumle, yol):
    from gtts import gTTS
    gTTS(cumle, lang="tr", timeout=40).save(yol)

def ff(*a):
    subprocess.run(["ffmpeg", "-loglevel", "error", "-y", *a], check=True)

def uret(is_, parca, tmp):
    if is_.get("motor") == "gemini":
        wavlar, n, uyari = gemini_uret(is_, parca, tmp)
        liste = f"{tmp}/liste.txt"; open(liste, "w").write("".join(f"file '{w}'\n" for w in wavlar))
        cikis = f"cikti/{is_['kod']}__{parca['ad']}.mp3"
        ff("-f", "concat", "-safe", "0", "-i", liste, "-af", "loudnorm=I=-16:TP=-1.5:LRA=11", "-ar", "44100", "-b:a", "128k", cikis)
        return cikis, n, uyari
    oto = is_.get("oto_ton", True)
    adimlar = ayristir(parca["metin"], parca.get("ses", is_.get("ses", "ahmet")), oto)
    wavlar, yedek = [], 0
    for i, a in enumerate(adimlar):
        w = f"{tmp}/{i:04d}.wav"
        if a[0] == "dur":
            ff("-f", "lavfi", "-i", "anullsrc=r=24000:cl=mono", "-t", f"{a[1]:.2f}", w); wavlar.append(w); continue
        _, ses, ton, c = a; m = f"{tmp}/{i:04d}.mp3"
        try:
            if is_.get("motor", "google") == "google" and (GES.get(ses, ses) in GSESLER):
                try:
                    google_soyle(c, ses, ton, oto, m)
                except Exception as e:
                    if ses not in SESLER: ses = "ahmet"
                    print(f"NOT: uyarı Google olmadı ({str(e)[:60]}), edge-tts ile devam")
                    asyncio.run(edge_soyle(c, ses, ton, oto, m))
            else:
                asyncio.run(edge_soyle(c, ses if ses in SESLER else "ahmet", ton, oto, m))
        except Exception as e:
            yedek += 1; print(f"NOT: uyarı edge-tts olmadı ({str(e)[:80]}), Google gTTS ile (tonsuz) devam"); gtts_soyle(c, m)
        es = TONLAR[ton][3]
        ff("-i", m, "-af", f"apad=pad_dur={es}", "-ar", "24000", "-ac", "1", w); wavlar.append(w)
    liste = f"{tmp}/liste.txt"
    open(liste, "w").write("".join(f"file '{w}'\n" for w in wavlar))
    cikis = f"cikti/{is_['kod']}__{parca['ad']}.mp3"
    ff("-f", "concat", "-safe", "0", "-i", liste, "-af", "loudnorm=I=-16:TP=-1.5:LRA=11", "-ar", "44100", "-b:a", "128k", cikis)
    return cikis, len([a for a in adimlar if a[0] == "soz"]), yedek

def kutuphane():
    for yol in ("kutuphane/SES_KUTUPHANESI.json", os.path.join(os.path.dirname(os.path.abspath(__file__)), "kutuphane/SES_KUTUPHANESI.json")):
        if os.path.exists(yol): return json.load(open(yol, encoding="utf-8"))
    return {"varsayilan_motor": "gemini", "varsayilan_ses": "charon"}

def main():
    os.makedirs("cikti", exist_ok=True)
    k = kutuphane()
    isler = sorted(glob.glob("kuyruk/*.json"))
    if not isler: print("NOT: kuyruk boş"); return
    import socket; socket.setdefaulttimeout(300)
    for jf in isler:
        is_ = json.load(open(jf, encoding="utf-8"))
        global DIL; DIL = is_.get("dil", "tr")
        is_.setdefault("motor", k.get("varsayilan_motor", "gemini")); is_.setdefault("ses", k.get("varsayilan_ses", "charon"))
        hata = isle(is_)
        # "yedek_motor": "google" (isteğe bağlı): Gemini'de bir parça bile okunamazsa (ör. günlük kota) BÜTÜN iş
        # Google Cloud (Chirp 3 HD, aynı ses adı) ile baştan okunur; böylece videoda iki farklı ses karışmaz.
        if hata and is_.get("motor") == "gemini" and is_.get("yedek_motor") == "google" and os.environ.get("GOOGLE_TTS_KEY"):
            print(f"NOT: {is_['kod']} Gemini ile tamamlanamadı, bütün parçalar Google Cloud ile yeniden okunuyor")
            is_["motor"] = "google"; is_["oto_ton"] = False
            isle(is_)

def isle(is_):
    hata = 0
    for parca in is_["parcalar"]:
        with tempfile.TemporaryDirectory() as tmp:
            try:
                yol, n, yedek = uret(is_, parca, tmp)
                print(f"NOT: {is_['kod']}/{parca['ad']} tamam ({n} cümle{', ' + str(yedek) + ' yedek' if yedek else ''})")
            except Exception as e:
                hata += 1
                print(f"NOT: HATA {is_['kod']}/{parca['ad']}: {str(e)[:160]}")
    return hata

if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "--dene":  # ağsız ayrıştırma denemesi
        for a in ayristir(sys.argv[2], "ahmet", True): print(a, oynama(a[3], a[2], True) if a[0] == "soz" else "")
    else:
        main()
