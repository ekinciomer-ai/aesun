"""Büyüme Paketi (Kasım prime-time boşluklarını dolduran yüksek tutma oranlı Shorts üretim betiği).
Kullanım:
  python3 uret.py ses <ses_json_klasoru>           -> ElevenLabs ses istek JSON dosyalarını üretir
  python3 uret.py sahne <ham_gorsel> <ses_cikti> <render_out> -> Ambiyans + motor.py sahne JSON dosyalarını üretir
  python3 uret.py kuyruk <ham_gorsel> <render_out> <yt_kuyruk_out> -> YouTube yükleme kuyruğu paketini hazırlar
"""
import json, os, shutil, subprocess, sys

KOK = os.path.abspath(os.path.join(os.path.dirname(__file__), "../.."))
sys.path.insert(0, os.path.join(KOK, "icerik", "arac"))
import tr_sayi

VOICE_ID = "u2ZPme1hNaHzZRbw9S82"
TUM = [0.0, 0.0, 1.0, 1.0]

BOLUMLER = [
    {
        "kod": "GT_TR_1111",
        "dil": "tr",
        "kanal_kodu": "TR",
        "kanal_etiket": "ANTİK STÜDYO",
        "kapanis": "YORUMLARA YAZ",
        "seri": "Gündem + Tarih",
        "publishAt": "2026-11-11T19:00:00+03:00",
        "ambiyans": "merak",
        "baslik": "Mimar Sinan Süleymaniye'deki isleri neden mürekkebe çevirdi? 🕌 #shorts",
        "govde": "Süleymaniye Camii'nde binlerce kandil yanarken duvarlar neden hiç kararmadı? Mimar Sinan'ın hava akımı hesabı, cümle kapısı üstündeki gizli İs Odası ve saray hattatlarına giden efsanevi is mürekkebi.",
        "etiketler": ["mimar sinan", "süleymaniye camii", "is odası", "osmanlı tarihi", "antik stüdyo", "shorts"],
        "kaynak_metin": "Gülru Necipoğlu, The Age of Sinan (2005); TDV İslâm Ansiklopedisi (Süleymaniye Camii ve Külliyesi); Evliya Çelebi, Seyahatnâme.",
        "metin": [
            "Süleymaniye'de geceleri binlerce kandil yanardı... peki mermer duvarlar neden hiç simsiyah olmadı?",
            "Çünkü Mimar Sinan caminin içine görünmez bir rüzgâr tüneli kurmuştu!",
            "Bin beş yüz elli yedide açılan camide dev avizeler her gece duman çıkarıyordu.",
            "Normalde bu kara is, birkaç yılda tüm hat yazılarını ve kubbeyi karartırdı.",
            "Sinan pencereleri ve hava girişlerini öyle açılarla yerleştirdi ki...",
            "Yükselen bütün kandil isi, tek bir noktaya, cümle kapısının üstündeki gizli odaya çekildi!",
            "İs Odası denilen bu bölmeye nemli hava verilerek kurum duvarlarda biriktirildi.",
            "Sonra o saf kurum kazındı; su ve zamkla karıştırılıp dünyanın en parlak mürekkebi yapıldı!",
            "Üstelik o mürekkeple yine Kur'an-ı Kerim ve fermanlar yazıldı. Sence Sinan'ın en dahi buluşu hangisiydi?",
        ],
        "sahneler": [
            {"img": "sinan_kubbe", "odak": [0.1, 0.1, 0.9, 0.9], "odak2": TUM, "bas": ["BİNLERCE KANDİL", "SIFIR KARARMA!", "NASIL?"]},
            {"img": "sinan_dis", "odak": TUM, "odak2": [0.15, 0.1, 0.85, 0.8], "bas": ["MİMAR SİNAN", "GÖRÜNMEZ", "RÜZGÂR TÜNELİ"]},
            {"img": "sinan_avlu", "odak": [0.05, 0.1, 0.95, 0.9], "odak2": TUM, "bas": ["1557 · İSTANBUL", "SÜLEYMANİYE", "KÜLLİYESİ"]},
            {"img": "sinan_kubbe", "odak": TUM, "odak2": [0.2, 0.2, 0.8, 0.8], "bas": ["KANDİL DUMANI", "MERMERİ", "KARARTIRDI"]},
            {"img": "sinan_portre", "odak": [0.1, 0.05, 0.9, 0.85], "odak2": TUM, "bas": ["HAVA HESABI", "MİLİMETRİK", "AKIM"]},
            {"img": "sinan_avlu", "odak": TUM, "odak2": [0.2, 0.15, 0.8, 0.75], "bas": ["TEK NOKTAYA", "GİZLİ", "İS ODASI!"]},
            {"img": "sinan_dis", "odak": [0.2, 0.2, 0.85, 0.85], "odak2": TUM, "bas": ["SIFIR ATIK", "SAF KURUM", "TOPLANDI"]},
            {"img": "sinan_hat", "odak": TUM, "odak2": [0.1, 0.1, 0.9, 0.85], "bas": ["KANDİL İSİNDEN", "SARAY", "MÜREKKEBİ!"]},
            {"img": "sinan_hat", "odak": [0.1, 0.1, 0.9, 0.85], "odak2": TUM, "bas": ["SENCE?", "EN DAHİ BULUŞU", "HANGİSİYDİ?"]},
        ],
    },
    {
        "kod": "GT_TR_1112",
        "dil": "tr",
        "kanal_kodu": "TR",
        "kanal_etiket": "ANTİK STÜDYO",
        "kapanis": "YORUMLARA YAZ",
        "seri": "Gündem + Tarih",
        "publishAt": "2026-11-12T19:00:00+03:00",
        "ambiyans": "gerilim",
        "baslik": "Topkapı Sarayı'nda fısıltıları gizleyen çeşmenin sırrı neydi? ⛲ #shorts",
        "govde": "Topkapı Sarayı Kubbealtı'nda devletin en gizli kararları alınırken dış duvardaki çeşme neden sürekli akardı? Osmanlı'nın 500 yıllık akustik istihbarat kalkanı ve Kasr-ı Adl penceresi.",
        "etiketler": ["topkapı sarayı", "kubbealtı", "divanı hümayun", "osmanlı istihbarat", "antik stüdyo", "shorts"],
        "kaynak_metin": "Halil İnalcık, Osmanlı İmparatorluğu Klasik Çağ; Necdet Sakaoğlu, Tarihi, Mekânları, Kitabeleriyle Saray-ı Hümayun (Topkapı Sarayı); TDV İslâm Ansiklopedisi.",
        "metin": [
            "Topkapı Sarayı'nda gizli devlet toplantısı başladığı an... dışarıdaki bu çeşme sonuna kadar açılırdı!",
            "Susuzluktan değil... casusların kulaklarını kör etmek için!",
            "Kubbealtı denilen Divan-ı Hümayun'da savaş, barış ve hazine sırları konuşulurdu.",
            "Fakat avlunun hemen dışında yüzlerce elçi, muhafız ve görevli beklerdi.",
            "Duvara yaklaşan bir casusun içerideki fısıltıları duyması imparatorluğa pahalıya patlayabilirdi.",
            "Osmanlı mimarları çözümü elektronik sinyal bozuculardan beş yüz yıl önce su sesiyle buldu!",
            "Mermer çeşmeden şırıldayarak akan su, insan konuşma frekansını örten doğal bir ses perdesi kuruyordu.",
            "Üstelik vezirler bile padişahın yukarıdaki kafes arkasında dinleyip dinlemediğini asla bilemezdi!",
            "Bugünkü beyaz gürültü tekniğinin saraydaki atası... Sence dahice değil mi?",
        ],
        "sahneler": [
            {"img": "topkapi_cesme", "odak": [0.1, 0.1, 0.9, 0.9], "odak2": TUM, "bas": ["TOPLANTI BAŞLAR", "ÇEŞME", "AÇILIRDI!"]},
            {"img": "topkapi_kapi", "odak": TUM, "odak2": [0.15, 0.15, 0.85, 0.85], "bas": ["NEDEN?", "CASUSLARA", "KARŞI!"]},
            {"img": "topkapi_divan", "odak": [0.05, 0.1, 0.95, 0.9], "odak2": TUM, "bas": ["KUBBEALTI", "DEVLET", "SIRLARI"]},
            {"img": "topkapi_kubbe", "odak": TUM, "odak2": [0.15, 0.1, 0.85, 0.85], "bas": ["AVLUDA", "YÜZLERCE", "YABANCI ELÇİ"]},
            {"img": "topkapi_minyatur", "odak": [0.1, 0.05, 0.9, 0.85], "odak2": TUM, "bas": ["TEK FISILTI", "SAVAŞIN KADERİNİ", "DEĞİŞTİRİR!"]},
            {"img": "topkapi_cesme", "odak": TUM, "odak2": [0.2, 0.2, 0.8, 0.85], "bas": ["500 YIL ÖNCE", "AKUSTİK", "KALKAN"]},
            {"img": "topkapi_kubbe", "odak": [0.1, 0.15, 0.9, 0.85], "odak2": TUM, "bas": ["SU ŞIRILTISI", "KONUŞMAYI", "MASKELEDİ"]},
            {"img": "topkapi_divan", "odak": TUM, "odak2": [0.2, 0.1, 0.8, 0.7], "bas": ["KAFES ARKASI", "PADİŞAH", "DİNLİYOR MU?"]},
            {"img": "topkapi_minyatur", "odak": [0.15, 0.1, 0.85, 0.9], "odak2": TUM, "bas": ["DOĞAL GÜRÜLTÜ", "SENCE", "DAHİCE Mİ?"]},
        ],
    },
    {
        "kod": "GT_TR_1113",
        "dil": "tr",
        "kanal_kodu": "TR",
        "kanal_etiket": "ANTİK STÜDYO",
        "kapanis": "YORUMLARA YAZ",
        "seri": "Gündem + Tarih",
        "publishAt": "2026-11-13T19:00:00+03:00",
        "ambiyans": "epik",
        "baslik": "Ayasofya 1.500 yıldır büyük depremlerde neden yıkılmadı? 🏛️ #shorts",
        "govde": "Modern beton binalar bir asırda yorulurken Ayasofya 537 yılından beri onlarca büyük İstanbul depremini nasıl ayakta atlattı? Kırık tuğla tozlu Horasan harcı ve Mimar Sinan'ın payandaları.",
        "etiketler": ["ayasofya", "horasan harcı", "istanbul depremi", "mimar sinan", "antik stüdyo", "shorts"],
        "kaynak_metin": "Rowland Mainstone, Hagia Sophia: Architecture, Structure and Liturgy (1988); Ahmet Çakmak (Princeton), Hagia Sophia Mortar Studies; TDV İslâm Ansiklopedisi.",
        "metin": [
            "Modern beton yüzyılda yorulurken... Ayasofya bin beş yüz yıldır büyük depremlerde neden yıkılmadı?",
            "Sırrı dev taşlarında değil, tuğlaların arasındaki pembe harçta gizli!",
            "Beş yüz otuz yedide inşa edilen bu dev kubbe, onlarca yıkıcı İstanbul depremini gördü.",
            "Araştırmacılar harcı mikroskopla incelediğinde şaşırtıcı bir detay buldu.",
            "Kirecin içine ezilmiş tuğla tozu katılmış ve harç neredeyse tuğla kalınlığında sürülmüştü!",
            "Bu esnek tabaka sarsıntı anında tıpkı bir amortisör gibi deprem enerjisini emiyordu.",
            "Üstelik nemle temas ettikçe harcın içindeki mikro çatlaklar zamanla kendi kendini onardı!",
            "On altıncı yüzyılda Mimar Sinan da çevresine dev payandalar ekleyerek yapıyı kenetledi.",
            "Bin beş yüz yıllık esnek mühendislik... Sence eski ustalar bizden ileride miydi?",
        ],
        "sahneler": [
            {"img": "ayasofya_ic", "odak": [0.08, 0.08, 0.92, 0.92], "odak2": TUM, "bas": ["1.500 YILDIR", "DEPREMLERDE", "NEDEN YIKILMADI?"]},
            {"img": "ayasofya_dis", "odak": TUM, "odak2": [0.15, 0.15, 0.85, 0.85], "bas": ["GİZLİ SIR", "TUĞLA ARASI", "PEMBE HARÇ!"]},
            {"img": "ayasofya_harita", "odak": [0.1, 0.1, 0.9, 0.9], "odak2": TUM, "bas": ["537 YILINDAN BERİ", "ONLARCA", "BÜYÜK DEPREM"]},
            {"img": "ayasofya_mozaik", "odak": TUM, "odak2": [0.15, 0.1, 0.85, 0.85], "bas": ["MİKROSKOPTA", "ŞAŞIRTAN", "KEŞİF"]},
            {"img": "ayasofya_ic", "odak": [0.15, 0.05, 0.85, 0.75], "odak2": TUM, "bas": ["EZİLMİŞ TUĞLA", "KALIN ESNEK", "TABAKA"]},
            {"img": "ayasofya_dis", "odak": [0.1, 0.2, 0.9, 0.9], "odak2": TUM, "bas": ["TIPKI", "AMORTİSÖR", "GİBİ EMİYOR!"]},
            {"img": "ayasofya_ic", "odak": TUM, "odak2": [0.2, 0.1, 0.8, 0.7], "bas": ["ÇATLAKLAR", "KENDİNİ", "ONARIYOR!"]},
            {"img": "sinan_portre", "odak": [0.1, 0.05, 0.9, 0.85], "odak2": TUM, "bas": ["16. YÜZYIL", "MİMAR SİNAN", "PAYANDALARI"]},
            {"img": "ayasofya_dis", "odak": TUM, "odak2": [0.1, 0.1, 0.9, 0.9], "bas": ["ESKİ USTALAR", "BİZDEN", "İLERİDE MİYDİ?"]},
        ],
    },
    {
        "kod": "IK_ES_1111",
        "dil": "es",
        "kanal_kodu": "ES",
        "kanal_etiket": "ESTUDIO ANTIGUO",
        "kapanis": "TE LEO EN COMENTARIOS",
        "seri": "İnanç & Kültür Tarihi",
        "publishAt": "2026-11-12T01:00:00+03:00",
        "ambiyans": "merak",
        "baslik": "¿Por qué casi 4.000 palabras del español empiezan con \"AL\"? 📜 #historia #shorts",
        "govde": "Almohada, azúcar, ajedrez, alcázar y ojalá: casi cuatro mil palabras del español vienen del árabe andalusí tras ocho siglos de convivencia en la península ibérica.",
        "etiketler": ["origen de las palabras", "al andalus", "historia de españa", "curiosidades historicas", "estudio antiguo", "shorts"],
        "kaynak_metin": "Real Academia Española (Diccionario de la lengua española); Federico Corriente, Diccionario de arabismos y voces afines en iberorromance.",
        "metin": [
            "Dices almohada, azúcar y ojalá todos los días... pero ¿por qué miles de palabras en español empiezan con al?",
            "No es casualidad: es la huella viva de ocho siglos de historia en la península.",
            "En árabe, la sílaba al significa simplemente el o la: el artículo definido.",
            "Cuando los cristianos escuchaban una palabra en Al-Ándalus, adoptaban el nombre pegado a su artículo.",
            "Así, al-muhadda se convirtió en la almohada donde duermes cada noche.",
            "El juego real de estrategia, as-satrany, pasó a llamarse ajedrez en los libros de Alfonso Décimo.",
            "Y de las ciencias de Córdoba y Toledo llegaron algoritmo, álgebra y alquimia al mundo entero.",
            "Incluso ojalá viene de law sha Allah: si Dios quiere.",
            "Casi cuatro mil palabras guardan ese puente cultural. ¿Cuál es tu favorita? Te leo en comentarios.",
        ],
        "sahneler": [
            {"img": "es_mezquita", "odak": [0.1, 0.1, 0.9, 0.9], "odak2": TUM, "bas": ["4.000 PALABRAS", "EMPIEZAN CON", "¡AL!"]},
            {"img": "es_alhambra", "odak": TUM, "odak2": [0.15, 0.15, 0.85, 0.85], "bas": ["OCHO SIGLOS", "LA HUELLA DE", "AL-ÁNDALUS"]},
            {"img": "es_mezquita", "odak": [0.15, 0.1, 0.85, 0.85], "odak2": TUM, "bas": ["¿QUÉ SIGNIFICA?", "“AL” ES", "EL ARTÍCULO"]},
            {"img": "es_toledo", "odak": TUM, "odak2": [0.15, 0.2, 0.85, 0.85], "bas": ["DE CÓRDOBA", "A TOLEDO", "UN PUENTE"]},
            {"img": "es_alhambra", "odak": [0.1, 0.1, 0.9, 0.9], "odak2": TUM, "bas": ["AL-MUHADDA", "TU", "ALMOHADA"]},
            {"img": "es_ajedrez", "odak": TUM, "odak2": [0.1, 0.1, 0.9, 0.85], "bas": ["ALFONSO X", "EL JUEGO DEL", "AJEDREZ"]},
            {"img": "es_astrolabio", "odak": [0.05, 0.05, 0.95, 0.95], "odak2": TUM, "bas": ["CIENCIA", "ÁLGEBRA Y", "ALGORITMO"]},
            {"img": "es_mezquita", "odak": TUM, "odak2": [0.2, 0.15, 0.8, 0.8], "bas": ["¡OJALÁ!", "“SI DIOS", "QUIERE”"]},
            {"img": "es_toledo", "odak": [0.1, 0.15, 0.9, 0.85], "odak2": TUM, "bas": ["4.000 PALABRAS", "¿CUÁL ES TU", "FAVORITA?"]},
        ],
    },
]

NOTLAR = {
    "tr": "Not: Görseller kamu malı ya da serbest lisanslı fotoğraf/eserlerdir; seslendirme yapay zekâ ile yapılmıştır.",
    "es": "Nota: las imágenes son obras y fotografías de dominio público o con licencia libre; la narración está generada con IA.",
}
SORULAR = {
    "tr": "Sen ne düşünüyorsun? Yorumlara yaz 👇",
    "es": "¿Cuál de estas palabras usas más? Te leo en comentarios 👇",
}
ALT_BANT = {
    "tr": "Görseller: kamu malı / Wikimedia Commons · Ses: yapay zekâ ile klonlanmış ses",
    "es": "Imágenes: dominio público / Wikimedia Commons · Voz: clonada con IA",
}


def gorsel_bul(ham_dizin, ad):
    for ext in (".jpg", ".png", ".JPG", ".jpeg"):
        p = os.path.join(ham_dizin, ad + ext)
        if os.path.exists(p):
            return p
    raise SystemExit(f"Görsel bulunamadı: {ad} ({ham_dizin})")


def ana():
    komut = sys.argv[1]

    if komut == "ses":
        hedef = sys.argv[2]
        os.makedirs(hedef, exist_ok=True)
        for b in BOLUMLER:
            kod_ses = f"{b['kod']}_SES"
            parcalar = []
            for i, satir in enumerate(b["metin"]):
                okunacak = tr_sayi.seslendir(satir) if b["dil"] == "tr" else satir
                parcalar.append({"ad": f"s{i + 1}", "metin": okunacak})
            istek = {
                "kod": kod_ses,
                "voice_id": VOICE_ID,
                "model": "eleven_v3",
                "dil": b["dil"],
                "ayar": {"stability": 0.45, "similarity_boost": 0.9},
                "parcalar": parcalar,
            }
            with open(os.path.join(hedef, f"{kod_ses}.json"), "w", encoding="utf-8") as f:
                json.dump(istek, f, ensure_ascii=False, indent=1)
            print("ses istegi hazir:", kod_ses, len(parcalar), "parca")

    elif komut == "sahne":
        ham, ses_cikti, render_out = sys.argv[2], sys.argv[3], sys.argv[4]
        os.makedirs(render_out, exist_ok=True)
        amb_betik = os.path.join(KOK, "icerik", "arac", "ambiyans_uret.py")
        for b in BOLUMLER:
            amb_wav = os.path.abspath(os.path.join(render_out, f"amb_{b['ambiyans']}.wav"))
            if not os.path.exists(amb_wav):
                subprocess.run([sys.executable, amb_betik, amb_wav, "70", b["ambiyans"]], check=True)
            sahneler = []
            for sc in b["sahneler"]:
                yeni = dict(sc)
                yeni["img"] = os.path.abspath(gorsel_bul(ham, sc["img"]))
                sahneler.append(yeni)
            ses_dosyalari = [os.path.abspath(os.path.join(ses_cikti, f"{b['kod']}_SES__s{i + 1}.mp3")) for i in range(len(b["metin"]))]
            sj = {
                "kod": b["kod"],
                "dil": b["dil"],
                "format": "dikey",
                "metin": b["metin"],
                "ses": ses_dosyalari,
                "sahneler": sahneler,
                "muzik": amb_wav,
                "muzik_seviye": 0.09,
                "kanal": b["kanal_etiket"],
                "kapanis": b["kapanis"],
                "alt": ALT_BANT[b["dil"]],
                "cikti": os.path.abspath(os.path.join(render_out, f"{b['kod']}.mp4")),
            }
            sj_yol = os.path.join(render_out, f"{b['kod']}_sahne.json")
            with open(sj_yol, "w", encoding="utf-8") as f:
                json.dump(sj, f, ensure_ascii=False, indent=1)
            print("sahne hazir:", sj_yol)

    elif komut == "kuyruk":
        ham, render_out, kuyruk_out = sys.argv[2], sys.argv[3], sys.argv[4]
        os.makedirs(kuyruk_out, exist_ok=True)
        man = {}
        man_yol = os.path.join(ham, "manifest.json")
        if os.path.exists(man_yol):
            for d in json.load(open(man_yol, encoding="utf-8")).get("dosyalar", []):
                if "ad" in d and "lisans" in d:
                    man[os.path.splitext(d["ad"])[0]] = d
        for b in BOLUMLER:
            mp4 = os.path.join(render_out, f"{b['kod']}.mp4")
            if not os.path.exists(mp4):
                print("UYARI render yok:", mp4)
                continue
            kun, goruldu = [], set()
            for sc in b["sahneler"]:
                ad = sc["img"]
                if ad in goruldu or ad not in man:
                    continue
                goruldu.add(ad)
                d = man[ad]
                bas = d["baslik"].replace("File:", "").rsplit(".", 1)[0][:70]
                sanatci = f", {d['sanatci'][:50]}" if d.get("sanatci") and "CC" in d["lisans"] else ""
                kun.append(f"- {bas} ({d['lisans']}{sanatci}) {d.get('sayfa', '')}")
            dl = b["dil"]
            kb = "Kaynaklar" if dl == "tr" else "Fuentes"
            gk = "Görsel künyeleri" if dl == "tr" else "Créditos de imágenes"
            kan_tag = "#antikstüdyo #tarih #shorts" if dl == "tr" else "#estudioantiguo #historia #shorts"
            aciklama = (
                f"{b['govde']}\n\n{SORULAR[dl]}\n\n{kb}: {b['kaynak_metin']}\n\n{gk}:\n"
                + "\n".join(kun)
                + f"\n\n{NOTLAR[dl]}\n\n{kan_tag}"
            )
            kj = {
                "kod": b["kod"],
                "kanal": b["kanal_kodu"],
                "tur": "Short",
                "seri": b["seri"],
                "kategori": "27",
                "sentetik": True,
                "ust_bant_izinli": True,
                "ureten": "Antigravity",
                "publishAt": b["publishAt"],
                "baslik": b["baslik"],
                "aciklama": aciklama[:4900],
                "etiketler": b["etiketler"],
                "kaynaklar": [x[2:] for x in kun],
                "muzik_lisans": "Kanal üretimi özgün atmosferik ambiyans (telifsiz, matematiksel sentez - ambiyans_uret.py)",
            }
            with open(os.path.join(kuyruk_out, f"{b['kod']}.json"), "w", encoding="utf-8") as f:
                json.dump(kj, f, ensure_ascii=False, indent=1)
            shutil.copy(mp4, os.path.join(kuyruk_out, f"{b['kod']}.mp4"))
            kapak = mp4[:-4] + ".jpg"
            if os.path.exists(kapak):
                shutil.copy(kapak, os.path.join(kuyruk_out, f"{b['kod']}.jpg"))
            print("kuyruga hazir:", b["kod"], os.path.getsize(mp4) // 1024, "KB", b["publishAt"])


if __name__ == "__main__":
    ana()
