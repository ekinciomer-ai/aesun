# Kasım serisi: 1080p videoları YouTube yükleme kuyruğuna (sunucu/yt_kuyruk) koyar. python3 kuyruk.py <render klasörü> [kod...]
import json, os, sys, shutil
R = sys.argv[1]; SEC = set(sys.argv[2:])
K = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../sunucu/yt_kuyruk"))
MAN = {}
for m in ("/home/claude/ham/seri_kasim/manifest.json", "/home/claude/ham/seri_kasim2/manifest.json", "/home/claude/ham/seri_kasim3/manifest.json"):
    for d in json.load(open(m))["dosyalar"]:
        if "ad" in d and "lisans" in d: MAN[os.path.splitext(d["ad"])[0]] = d
KAYNAK = {
 "S1_TABLO": {"tr": "Art Institute of Chicago (American Gothic, 1930); Mental Floss; Iowa State Historical Society (American Gothic House).",
              "en": "Art Institute of Chicago (American Gothic, 1930); Mental Floss; State Historical Society of Iowa (American Gothic House).",
              "es": "Museo del Prado (La familia de Carlos IV, 1800); Fundación Goya en Aragón."},
 "S2_GEMI": {"tr": "Steven Runciman, The Fall of Constantinople 1453; Halil İnalcık, Fatih Devri; TDV İslâm Ansiklopedisi.",
             "en": "Steven Runciman, The Fall of Constantinople 1453; Encyclopaedia Britannica.",
             "es": "Steven Runciman, La caída de Constantinopla 1453; Bernal Díaz del Castillo, Historia verdadera de la conquista de la Nueva España."},
 "S3_HAPSIRIK": {"tr": "Wikipedia: Response to sneezing; Askenasy (1990), Medievalists.net.", "en": "Wikipedia: Response to sneezing; Askenasy (1990), Medievalists.net.",
                 "es": "Wikipedia: Response to sneezing; Askenasy (1990), Medievalists.net."},
 "S4_BELLADONNA": {"tr": "Linnaeus, Species Plantarum (1753); Garden Professors; WHO Temel İlaçlar Listesi (atropin).", "en": "Linnaeus, Species Plantarum (1753); Garden Professors; WHO Model List of Essential Medicines.",
                   "es": "Linneo, Species Plantarum (1753); Garden Professors; Lista de Medicamentos Esenciales de la OMS."},
 "S5_MARATON": {"tr": "Olympedia; AIMS (Association of International Marathons); 1908 Londra Olimpiyatları resmî raporu.", "en": "Olympedia; AIMS; Official Report of the 1908 London Olympic Games.",
                "es": "Olympedia; AIMS; Informe oficial de los Juegos Olímpicos de Londres 1908."},
 "L6_BOGAZ": {"tr": "Halil İnalcık, Osmanlı İmparatorluğu Klasik Çağ; Giancarlo Casale, The Ottoman Age of Exploration; TDV İslâm Ansiklopedisi (Piri Reis, Sokullu Mehmed Paşa).",
              "en": "Giancarlo Casale, The Ottoman Age of Exploration; Halil İnalcık, The Ottoman Empire: The Classical Age; Encyclopaedia Britannica.",
              "es": "Giancarlo Casale, The Ottoman Age of Exploration; Fernand Braudel, El Mediterráneo; Real Academia de la Historia (Lepanto)."},
 "L7_TABLO": {"tr": "National Gallery Londra; Musées royaux des Beaux-Arts de Belgique; Château de Malmaison; Wallace Collection; Courtauld; Art Institute of Chicago; Skokloster Slott.",
              "en": "National Gallery London; Royal Museums of Fine Arts of Belgium; Château de Malmaison; Wallace Collection; Courtauld Gallery; Art Institute of Chicago; Skokloster Castle.",
              "es": "National Gallery de Londres; Museos Reales de Bellas Artes de Bélgica; Château de Malmaison; Wallace Collection; Courtauld; Museo del Prado."},
}
# (kod, dil): (başlık, açıklama gövdesi, etiketler, yayın zamanı, seri)
M = {
 ("S1_TABLO", "tr"): ("Amerikan Gotiği'ndeki ikili karı koca mı? 🤔🖼️", "1930'da Grant Wood'un yaptığı Amerikan Gotiği'ndeki kadın ressamın kız kardeşi Nan, adam ise diş hekimiydi. Gazeteler \"çiftçi ve karısı\" yazdı, Nan ise bunun bir baba ve kızı olduğunu söyledi.", ["amerikan gotiği", "grant wood", "ünlü tablolar", "sanat tarihi", "antik stüdyo"], "2026-11-12T18:00:00+03:00", "Tablo Serisi"),
 ("S2_GEMI", "tr"): ("Fatih 70 gemiyi karadan nasıl yürüttü? ⚓⛰️", "Nisan 1453: Bizans Haliç'i dev bir zincirle kapattı. Fatih Sultan Mehmed gemileri yağlanmış kalaslar üzerinde Galata'nın arkasından karadan yürüterek Haliç'e indirdi.", ["fatih sultan mehmed", "istanbul'un fethi", "1453", "haliç", "osmanlı tarihi"], "2026-11-13T18:00:00+03:00", "Gündem + Tarih"),
 ("S3_HAPSIRIK", "tr"): ("Hapşırınca neden \"Çok yaşa\" deriz? 🤧", "Bir zamanlar hapşırık ölüm habercisi sayılırdı. Roma'daki 590 vebası, Romalıların \"Salve!\"si ve bizdeki \"Çok yaşa – Sen de gör\" geleneği.", ["çok yaşa", "hapşırık", "gelenekler", "kültür tarihi", "antik stüdyo"], "2026-11-14T18:00:00+03:00", "İnanç & Kültür Tarihi"),
 ("S4_BELLADONNA", "tr"): ("Kadınlar gözlerine neden zehir damlattı? 👁️☠️", "Rönesans İtalya'sında kadınlar göz bebeklerini büyütmek için belladonna (güzelavrat otu) kullandı. Bitkinin adı hem \"güzel kadın\" hem \"ölüm\" demek.", ["belladonna", "güzelavrat otu", "rönesans", "güzellik tarihi", "antik stüdyo"], "2026-11-15T18:00:00+03:00", "Tarihi Magazin"),
 ("S5_MARATON", "tr"): ("Maraton neden tam 42,195 km? 🏃‍♂️👑", "1908 Londra Olimpiyatları'nda maraton Windsor Sarayı'ndan başlayıp kraliyet locasının önünde bitti. Dorando Pietri'nin unutulmaz yarışı ve bugünkü mesafenin hikâyesi.", ["maraton", "42195", "olimpiyat tarihi", "dorando pietri", "spor tarihi"], "2026-11-16T18:00:00+03:00", "Spor + Tarih"),
 ("L7_TABLO", "tr"): ("7 ünlü tablonun kimsenin fark etmediği ayrıntısı", "Elçiler'deki gizli kafatası, İkarus'un minicik bacakları, Napolyon'un katırı, Salıncak'taki gizli aşık, Manet'nin yanlış aynası, Seurat'nın maymunu ve meyveden bir imparator.", ["ünlü tablolar", "sanat tarihi", "gizli ayrıntılar", "holbein", "antik stüdyo"], "2026-11-13T20:30:00+03:00", "Tablo Serisi"),
 ("L6_BOGAZ", "tr"): ("Osmanlı dünyayı 5 boğazdan nasıl kilitlemeye çalıştı?", "İstanbul Boğazı, Kızıldeniz, Hürmüz, Süveyş ve Don-Volga: Boğazkesen'den Piri Reis'in Hürmüz seferine, Sokollu'nun kanal projelerine kadar Osmanlı'nın deniz yollarını kilitleme planı.", ["osmanlı", "hürmüz boğazı", "piri reis", "sokullu mehmed paşa", "süveyş kanalı"], "2026-11-17T20:30:00+03:00", "Gündem + Tarih"),
 ("S1_TABLO", "en"): ("Is the couple in American Gothic really married? 🤔", "Grant Wood's sister Nan and his 62-year-old dentist posed separately for American Gothic (1930). The papers called them a farmer and his wife. Nan said father and daughter.", ["american gothic", "grant wood", "famous paintings", "art history", "ancient studio"], "2026-11-11T23:00:00+03:00", "Tablo Serisi"),
 ("S2_GEMI", "en"): ("How did 70 warships cross a hill in one night? ⚓", "Constantinople, April 1453: a giant chain sealed the Golden Horn, so Sultan Mehmed II dragged his fleet over land on greased logs.", ["constantinople 1453", "mehmed ii", "golden horn", "medieval history", "ancient studio"], "2026-11-12T23:00:00+03:00", "Gündem + Tarih"),
 ("S3_HAPSIRIK", "en"): ("Why do we say \"Bless you\" when someone sneezes? 🤧", "From the plague of Rome in 590 to the Roman \"Salve!\" and the German \"Gesundheit\": the history of answering a sneeze.", ["bless you", "gesundheit", "sneeze", "history of customs", "ancient studio"], "2026-11-13T23:00:00+03:00", "Gündem + Tarih"),
 ("S4_BELLADONNA", "en"): ("Why did women put poison in their eyes? 👁️☠️", "Renaissance women used belladonna, deadly nightshade, to enlarge their pupils. Its name means both \"beautiful lady\" and death.", ["belladonna", "deadly nightshade", "renaissance", "beauty history", "ancient studio"], "2026-11-14T23:00:00+03:00", "Gündem + Tarih"),
 ("S5_MARATON", "en"): ("Why is a marathon exactly 26.2 miles? 🏃👑", "London 1908: the race started at Windsor Castle and finished in front of the Royal Box. Dorando Pietri collapsed five times, Johnny Hayes won gold, and the distance stuck.", ["marathon", "26.2 miles", "olympic history", "dorando pietri", "johnny hayes"], "2026-11-15T23:00:00+03:00", "Gündem + Tarih"),
 ("L7_TABLO", "en"): ("7 famous paintings and the details almost everyone misses", "The hidden skull in The Ambassadors, Icarus' tiny legs, Napoleon's mule, the lover in The Swing, Manet's impossible mirror, Seurat's monkey and an emperor made of fruit.", ["famous paintings", "art history", "hidden details", "holbein", "ancient studio"], "2026-11-14T22:00:00+03:00", "Tablo Serisi"),
 ("L6_BOGAZ", "en"): ("How the Ottomans tried to lock 5 of the world's sea gates", "The Bosporus, the Red Sea, Hormuz, Suez and the Don–Volga: how the Ottoman Empire tried to control the chokepoints of world trade, and why some of the plans never left the paper.", ["ottoman empire", "strait of hormuz", "piri reis", "suez canal", "chokepoints"], "2026-11-17T22:00:00+03:00", "Gündem + Tarih"),
 ("S1_TABLO", "es"): ("¿Por qué hay una mujer sin cara en este cuadro del Prado? 🤔", "En La familia de Carlos IV (Goya, 1800) una joven gira la cabeza. Muchos historiadores creen que es la futura esposa de Fernando, aún sin elegir.", ["goya", "la familia de carlos iv", "museo del prado", "historia del arte", "estudio antiguo"], "2026-11-11T23:00:00+03:00", "Tablo Serisi"),
 ("S2_GEMI", "es"): ("¿Cómo se pasan 70 barcos por encima de una colina? ⚓", "Constantinopla, 1453: Mehmed II llevó su flota por tierra sobre troncos engrasados. Casi setenta años después, Hernán Cortés hizo algo parecido en el lago de Texcoco.", ["constantinopla 1453", "mehmed ii", "hernán cortés", "bergantines", "estudio antiguo"], "2026-11-12T23:00:00+03:00", "İnanç & Kültür Tarihi"),
 ("S3_HAPSIRIK", "es"): ("¿Por qué decimos \"¡Jesús!\" al estornudar? 🤧", "De la peste de Roma del año 590 al \"Jesús, María y José\" de España y el \"¡Salud!\" de Latinoamérica.", ["jesús", "estornudo", "costumbres", "historia", "estudio antiguo"], "2026-11-13T23:00:00+03:00", "İnanç & Kültür Tarihi"),
 ("S4_BELLADONNA", "es"): ("¿Por qué las mujeres se echaban veneno en los ojos? 👁️☠️", "En el Renacimiento, la belladona dilataba las pupilas. Su nombre significa \"mujer hermosa\"... y muerte.", ["belladona", "renacimiento", "historia de la belleza", "atropa", "estudio antiguo"], "2026-11-14T23:00:00+03:00", "İnanç & Kültür Tarihi"),
 ("S5_MARATON", "es"): ("¿Por qué un maratón mide 42,195 km? 🏃👑", "Londres 1908: salida en el castillo de Windsor, meta frente al palco real. La historia de Dorando Pietri y de la distancia oficial.", ["maratón", "42195", "historia olímpica", "dorando pietri", "estudio antiguo"], "2026-11-15T23:00:00+03:00", "İnanç & Kültür Tarihi"),
 ("L7_TABLO", "es"): ("7 cuadros famosos y el detalle que casi nadie ve", "La calavera oculta de Los embajadores, las piernas de Ícaro, la mula de Napoleón, el amante de El columpio, el espejo imposible de Manet, el mono de Seurat y El perro de Goya.", ["cuadros famosos", "historia del arte", "museo del prado", "goya", "estudio antiguo"], "2026-11-15T22:00:00+03:00", "Tablo Serisi"),
 ("L6_BOGAZ", "es"): ("El imperio que quiso cerrar cinco mares... y Lepanto", "El Bósforo, el mar Rojo, Ormuz, Suez y el Don–Volga: el plan otomano para controlar el comercio mundial, y el choque con España en Préveza y Lepanto.", ["lepanto", "imperio otomano", "cervantes", "don juan de austria", "estudio antiguo"], "2026-11-18T22:00:00+03:00", "İnanç & Kültür Tarihi"),
}
NOT = {"tr": "Not: Görseller kamu malı ya da serbest lisanslı tablo, gravür ve fotoğraflardır; seslendirme yapay zekâ ile yapılmıştır.",
       "en": "Note: Images are public domain or freely licensed paintings, engravings and photographs; the narration is AI-generated.",
       "es": "Nota: las imágenes son cuadros, grabados y fotografías de dominio público o con licencia libre; la narración está generada con IA."}
SORU = {"tr": "Sen ne düşünüyorsun? Yorumlara yaz 👇", "en": "What do you think? Tell me in the comments 👇", "es": "¿Tú qué opinas? Te leo en comentarios 👇"}
KB = {"tr": "Kaynaklar", "en": "Sources", "es": "Fuentes"}; GK = {"tr": "Görsel künyeleri", "en": "Image credits", "es": "Créditos de imágenes"}
KAN = {"tr": "#antikstüdyo", "en": "#ancientstudio", "es": "#estudioantiguo"}
for (kl, dl), (bas, govde, et, zaman, seri) in M.items():
    kod = f"KS_{kl}_{dl.upper()}"
    if SEC and kod not in SEC and kl not in SEC: continue
    mp4 = os.path.join(R, f"{kl}_{dl.upper()}.mp4"); sj = json.load(open(os.path.join(R, f"{kl}_{dl}.json")))
    if not os.path.exists(mp4): print("yok", mp4); continue
    kun = []; seen = set()
    for s in sj["sahneler"]:
        if "img" not in s: continue
        a = os.path.splitext(os.path.basename(s["img"]))[0]
        if a in seen or a not in MAN: continue
        seen.add(a); d = MAN[a]
        ad = d["baslik"].replace("File:", "").rsplit(".", 1)[0][:70]
        kun.append(f"- {ad} ({d['lisans']}{', ' + d['sanatci'][:50] if d.get('sanatci') and 'CC' in d['lisans'] else ''}) {d['sayfa']}")
    uzun = kl.startswith("L")
    aciklama = f"{govde}\n\n{SORU[dl]}\n\n{KB[dl]}: {KAYNAK[kl][dl]}\n\n{GK[dl]}:\n" + "\n".join(kun) + f"\n\n{NOT[dl]}\n\n#tarih {KAN[dl]}" + ("" if uzun else " #shorts")
    if dl != "tr": aciklama = aciklama.replace("#tarih", "#history" if dl == "en" else "#historia")
    j = {"kod": kod, "kanal": dl.upper(), "seri": seri, "kategori": "27", "sentetik": True, "ust_bant_izinli": True, "ureten": "Claude", "publishAt": zaman,
         "baslik": bas + ("" if uzun else " #shorts"), "aciklama": aciklama[:4900], "etiketler": et + (["shorts"] if not uzun else []),
         "kaynaklar": [x[2:] for x in kun], "muzik_lisans": "Müzik yok (yalnız seslendirme)"}
    json.dump(j, open(os.path.join(K, kod + ".json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    shutil.copy(mp4, os.path.join(K, kod + ".mp4"))
    kapak = mp4[:-4] + ".jpg"
    if os.path.exists(kapak):
        shutil.copy(kapak, os.path.join(K, kod + ".jpg"))
    print("kuyruğa", kod, os.path.getsize(mp4) // 1048576, "MB", zaman)
