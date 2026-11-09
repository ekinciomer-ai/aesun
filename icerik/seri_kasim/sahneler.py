# Kasım serisi: her video × dil için motor.py sahne dosyası üretir. python3 sahneler.py <görsel klasörü> <çıktı klasörü>
import json, os, sys
GD, OUT = sys.argv[1], sys.argv[2]; os.makedirs(OUT, exist_ok=True)
SES = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../sunucu/ses_kuyruk/cikti"))
def G(*adlar):
    for a in adlar:
        for e in (".jpg", ".png"):
            p = os.path.join(GD, a + e)
            if os.path.exists(p): return p
    raise SystemExit(f"görsel yok: {adlar}")
def I(ad, odak=None, odak2=None, bas=None, kunye=""):
    s = {"img": G(*ad) if isinstance(ad, tuple) else G(ad)}
    if odak: s["odak"] = odak
    if odak2: s["odak2"] = odak2
    if bas: s["bas"] = bas
    if kunye: s["kunye"] = kunye
    return s
def HR(merkez, zoom, noktalar, bas=None, yol=None, bz=0.55):
    s = {"harita": {"merkez": merkez, "zoom": zoom, "noktalar": noktalar, "bas_zoom": bz}}
    if yol: s["harita"]["yol"] = yol
    if bas: s["bas"] = bas
    return s
KANAL = {"tr": "ANTİK STÜDYO", "en": "ANCIENT STUDIO", "es": "ESTUDIO ANTIGUO"}
KAP = {"tr": "YORUMLARA YAZ", "en": "TELL ME IN THE COMMENTS", "es": "TE LEO EN COMENTARIOS"}
ALT = {"tr": "Görseller: kamu malı / Wikimedia Commons · Harita: Natural Earth · Ses: yapay zekâ ile klonlanmış ses",
       "en": "Images: public domain / Wikimedia Commons · Map: Natural Earth · Voice: AI-cloned voice",
       "es": "Imágenes: dominio público / Wikimedia Commons · Mapa: Natural Earth · Voz: clonada con IA"}
ALT_UGUR = {"tr": "Görseller: kamu malı / Wikimedia Commons · Ses: yapay zekâ seslendirmesi"}
TUM = [0, 0, 1, 1]

V = {}
# ---------------- S1 ----------------
AGW, AGM, AGP = [0.03, 0.22, 0.5, 0.62], [0.48, 0.12, 0.92, 0.5], [0.3, 0.0, 0.7, 0.28]
V["S1_TABLO", "tr"] = ("TABLO_GOTIK", "Amerikan Gotiği", [
    I("ag_tablo_2", TUM, AGW, ("AMERİKAN GOTİĞİ", "KARI KOCA?", "DEĞİLLER!")),
    I("ag_tablo_2", [0.1, 0.05, 0.9, 0.7], TUM, ("1930 · IOWA", "GRANT WOOD", "")),
    I("ag_nan", None, None, ("KADIN", "NAN WOOD", "RESSAMIN KIZ KARDEŞİ")),
    I("ag_tablo_2", TUM, AGM, ("ADAM", "DİŞ HEKİMİ", "62 YAŞINDA")),
    I("ag_tablo_2", AGM, AGW, ("", "AYRI AYRI", "POZ VERDİLER")),
    I("ag_tablo_2", AGW, [0.0, 0.0, 1, 1], ("GAZETELER", "“ÇİFTÇİ VE KARISI”", "")),
    I("ag_tablo_2", [0.05, 0.1, 0.95, 0.7], None, ("NAN'E GÖRE", "BABA VE KIZ", "")),
    I(("ag_ev_1",), None, None, ("ELDON · IOWA", "GERÇEK EV", "GOTİK PENCERE"), "Foto: CC BY-SA 2.0"),
    I("ag_tablo_2", AGP, AGW, ("IOWALILAR KIZDI", "KULAĞINI", "ISIRIRIM!")),
    I("ag_tablo_2", AGW, TUM, ("SENCE?", "KARI KOCA MI", "BABA KIZ MI?")),
])
V["S1_TABLO", "en"] = ("TABLO_GOTIK", "American Gothic", [
    I("ag_tablo_2", TUM, AGW, ("AMERICAN GOTHIC", "HUSBAND & WIFE?", "NOPE!")),
    I("ag_tablo_2", [0.1, 0.05, 0.9, 0.7], TUM, ("1930 · IOWA", "GRANT WOOD", "")),
    I("ag_nan", None, None, ("THE WOMAN", "NAN WOOD", "HIS SISTER")),
    I("ag_tablo_2", TUM, AGM, ("THE MAN", "HIS DENTIST", "AGE 62")),
    I("ag_tablo_2", AGM, AGW, ("", "POSED", "SEPARATELY")),
    I("ag_tablo_2", AGW, TUM, ("THE PAPERS SAID", "“FARMER & WIFE”", "")),
    I("ag_tablo_2", [0.05, 0.1, 0.95, 0.7], None, ("NAN SAID", "FATHER", "& DAUGHTER")),
    I(("ag_ev_1",), None, None, ("ELDON · IOWA", "THE REAL HOUSE", "GOTHIC WINDOW"), "Photo: CC BY-SA 2.0"),
    I("ag_tablo_2", AGP, AGW, ("IOWANS WERE MAD", "“I'LL BITE", "YOUR EAR OFF!”")),
    I("ag_tablo_2", AGW, TUM, ("YOUR CALL", "MARRIED", "OR FAMILY?")),
])
GF, GG, GQ, GW = TUM, [0.0, 0.08, 0.2, 0.5], [0.33, 0.12, 0.6, 0.75], [0.1, 0.15, 0.36, 0.55]
V["S1_TABLO", "es"] = ("TABLO_GOTIK", "La familia de Carlos IV", [
    I("goya_familia", TUM, GW, ("MUSEO DEL PRADO", "UNA MUJER", "¡SIN CARA!")),
    I("goya_familia", [0.2, 0.1, 0.8, 0.9], TUM, ("GOYA · 1800", "LA FAMILIA", "DE CARLOS IV")),
    I("goya_familia", TUM, [0.25, 0.1, 0.95, 0.95], ("", "13 REALES", "COMO ESTATUAS")),
    I("goya_familia", [0.0, 0.0, 0.5, 0.8], GG, ("AL FONDO", "GOYA", "SE PINTÓ A SÍ MISMO")),
    I("goya_familia", [0.0, 0.05, 0.5, 0.9], GW, ("A LA IZQUIERDA", "GIRA", "LA CABEZA")),
    I("goya_fernando", None, None, ("FERNANDO", "SU FUTURA", "ESPOSA")),
    I("goya_familia", GW, [0.15, 0.22, 0.32, 0.45], ("¿QUIÉN ERA?", "AÚN NO", "LA HABÍAN ELEGIDO")),
    I("goya_familia", TUM, GQ, ("EN EL CENTRO", "LA REINA", "NO EL REY")),
    I("goya_familia", GQ, TUM, ("T. GAUTIER", "“EL TENDERO", "Y LA LOTERÍA”")),
    I("goya_meninas", None, None, ("¿TÚ QUÉ VES?", "REALEZA", "O LOTERÍA")),
])
# ---------------- S2 ----------------
IST = [28.98, 41.02]
def ist_harita(bas, et):
    return HR([29.0, 40.9], 260, [[28.97, 41.03, et, 1, -60, True]], bas, bz=0.15)
GEMI = ("fatih_gemi2_3", "fatih_minyatur_1")
V["S2_GEMI", "tr"] = ("FATIH_GEMI", "Fatih'in gemileri", [
    I(GEMI, None, None, ("BİR GECEDE", "70 GEMİ", "KARADAN!")),
    ist_harita(("NİSAN 1453", "İSTANBUL", "KUŞATMASI"), "İSTANBUL"),
    I("fatih_zincir", [0.0, 0.3, 0.6, 1.0], [0.3, 0.4, 0.9, 1.0], ("HALİÇ", "DEV ZİNCİR", "")),
    I("fatih_kusatma_1", None, None, ("", "ZİNCİR", "KIRILAMADI")),
    I("fatih_bellini", [0.15, 0.1, 0.85, 0.7], None, ("21 YAŞINDA", "FATİH", "ÇILGIN PLAN")),
    I("fatih_harita_2", [0.2, 0.0, 1.0, 0.6], [0.45, 0.0, 1.0, 0.45], ("GALATA", "YAĞLI", "KALASLAR")),
    I(GEMI, [0.0, 0.0, 0.7, 1.0], [0.3, 0.0, 1.0, 1.0], ("İNSAN VE HAYVAN GÜCÜ", "YELKENLER", "AÇIK!")),
    I("fatih_minyatur_1", [0.0, 0.35, 1.0, 0.85], [0.1, 0.5, 0.9, 1.0], ("22 NİSAN SABAHI", "GEMİLER", "HALİÇ'TE!")),
    I("fatih_harita_1", None, None, ("ZİNCİR", "İŞE", "YARAMADI")),
    I("fatih_gemi2_1", None, None, ("37 GÜN SONRA", "FETİH", "")),
])
V["S2_GEMI", "en"] = ("FATIH_GEMI", "Ships over land", [
    I(GEMI, None, None, ("70 WARSHIPS", "OVER", "A HILL!")),
    ist_harita(("APRIL 1453", "CONSTANTINOPLE", "UNDER SIEGE"), "CONSTANTINOPLE"),
    I("fatih_zincir", [0.0, 0.3, 0.6, 1.0], [0.3, 0.4, 0.9, 1.0], ("THE GOLDEN HORN", "GIANT CHAIN", "")),
    I("fatih_kusatma_1", None, None, ("", "CHAIN", "HOLDS")),
    I("fatih_bellini", [0.15, 0.1, 0.85, 0.7], None, ("AGE 21", "SULTAN MEHMED", "A CRAZY PLAN")),
    I("fatih_harita_2", [0.2, 0.0, 1.0, 0.6], [0.45, 0.0, 1.0, 0.45], ("BEHIND GALATA", "GREASED", "LOGS")),
    I(GEMI, [0.0, 0.0, 0.7, 1.0], [0.3, 0.0, 1.0, 1.0], ("MEN & OXEN", "SAILS", "UP!")),
    I("fatih_minyatur_1", [0.0, 0.35, 1.0, 0.85], [0.1, 0.5, 0.9, 1.0], ("APRIL 22", "FLEET", "INSIDE!")),
    I("fatih_harita_1", None, None, ("", "CHAIN", "USELESS")),
    I("fatih_gemi2_1", None, None, ("37 DAYS LATER", "THE CITY", "FALLS")),
])
V["S2_GEMI", "es"] = ("FATIH_GEMI", "Barcos por tierra", [
    I(GEMI, None, None, ("70 BARCOS", "POR ENCIMA", "DE UNA COLINA")),
    ist_harita(("ABRIL 1453", "CONSTANTINOPLA", "ASEDIADA"), "CONSTANTINOPLA"),
    I("fatih_zincir", [0.0, 0.3, 0.6, 1.0], [0.3, 0.4, 0.9, 1.0], ("CUERNO DE ORO", "CADENA", "GIGANTE")),
    I("fatih_kusatma_1", None, None, ("", "NO", "SE ROMPE")),
    I("fatih_bellini", [0.15, 0.1, 0.85, 0.7], None, ("21 AÑOS", "MEHMED", "IDEA DE LOCOS")),
    I("fatih_harita_2", [0.2, 0.0, 1.0, 0.6], [0.45, 0.0, 1.0, 0.45], ("GÁLATA", "TRONCOS", "CON GRASA")),
    I(GEMI, [0.0, 0.0, 0.7, 1.0], [0.3, 0.0, 1.0, 1.0], ("HOMBRES Y BUEYES", "VELAS", "DESPLEGADAS")),
    I("fatih_minyatur_1", [0.0, 0.35, 1.0, 0.85], [0.1, 0.5, 0.9, 1.0], ("22 DE ABRIL", "LA FLOTA", "¡DENTRO!")),
    I(("es_cortes2",), None, None, ("MÉXICO · 1521", "CORTÉS", "13 BERGANTINES")),
    I("fatih_gemi2_3", None, None, ("DOS IMPERIOS", "LA MISMA", "IDEA LOCA")),
])
# ---------------- S3 ----------------
HAP = ("hap_hapsirik_2",); GREG = ("hap_gregory3", "hap_gregory4", "hap_gregory_2"); PROC = ("hap_procesion", "hap_veba_1")
V["S3_HAPSIRIK", "tr"] = ("HAPSIRIK", "Çok yaşa", [
    I("hap_hapsirik_1", [0, 0.1, 1, 0.75], None, ("HAPŞIRINCA", "“ÇOK YAŞA”", "NEDEN?")),
    I(PROC, None, None, ("BİR ZAMANLAR", "HAPŞIRIK", "ÖLÜM HABERİ")),
    I(("hap_roma",), None, None, ("ROMA · 590", "VEBA", "")),
    I("hap_veba_2", None, None, ("", "PAPA BİLE", "ÖLDÜ")),
    I(GREG, None, None, ("PAPA GREGORİUS", "HAPŞIRANA", "DUA EDİN")),
    I("hap_pliny", None, None, ("ROMALILAR", "“SALVE!”", "SAĞLIKLI OL")),
    I("bel_atropos_1", None, None, ("ANTİK YUNAN", "TANRILARDAN", "BİR İŞARET")),
    I("hap_hapsirik_3", None, None, ("1 · 2 · 3", "ÇOK · İYİ", "BİN YAŞA!")),
    I("hap_hapsirik_1", [0, 0.3, 1, 1], None, ("CEVABI", "“SEN DE GÖR!”", "")),
    I("hap_hapsirik_2", None, None, ("SEN NE DERSİN?", "YORUMLARA", "YAZ")),
])
V["S3_HAPSIRIK", "en"] = ("HAPSIRIK", "Bless you", [
    I("hap_hapsirik_1", [0, 0.1, 1, 0.75], None, ("ACHOO!", "“BLESS YOU”", "BUT WHY?")),
    I(PROC, None, None, ("ONCE UPON A TIME", "A SNEEZE", "MEANT DEATH")),
    I(("hap_roma",), None, None, ("ROME · 590", "PLAGUE", "")),
    I("hap_veba_2", None, None, ("", "EVEN THE POPE", "DIED")),
    I(GREG, None, None, ("POPE GREGORY", "BLESS", "EVERY SNEEZE")),
    I("hap_pliny", None, None, ("THE ROMANS", "“SALVE!”", "STAY HEALTHY")),
    I("bel_atropos_1", None, None, ("ANCIENT GREECE", "A SIGN", "FROM THE GODS")),
    I("hap_hapsirik_3", None, None, ("GERMAN FOR HEALTH", "GESUNDHEIT", "")),
    I("hap_hapsirik_1", [0, 0.3, 1, 1], None, ("ONE SNEEZE", "ONE WISH", "")),
    I("hap_hapsirik_2", None, None, ("YOUR CHOICE", "BLESS YOU", "OR GESUNDHEIT?")),
])
V["S3_HAPSIRIK", "es"] = ("HAPSIRIK", "Jesús", [
    I(PROC, None, None, ("ACHÍS", "“¡JESÚS!”", "¿POR QUÉ?")),
    I("hap_veba_1", None, None, ("HUBO UN TIEMPO", "ESTORNUDO", "= MUERTE")),
    I(("hap_roma",), None, None, ("ROMA · 590", "LA PESTE", "")),
    I("hap_veba_2", None, None, ("", "HASTA EL PAPA", "MURIÓ")),
    I(GREG, None, None, ("EL PAPA GREGORIO", "UNA ORACIÓN", "POR ESTORNUDO")),
    I("hap_pliny", None, None, ("LOS ROMANOS", "“¡SALVE!”", "¡SALUD!")),
    I("bel_atropos_1", None, None, ("GRECIA", "SEÑAL", "DE LOS DIOSES")),
    I("goya_familia", [0.3, 0.1, 0.7, 0.6], None, ("EN ESPAÑA", "JESÚS · MARÍA", "¡Y JOSÉ!")),
    I(("es_cortes2", "hap_roma"), None, None, ("LATINOAMÉRICA", "“¡SALUD!”", "")),
    I(GREG, None, None, ("¿TÚ QUÉ DICES?", "JESÚS", "O SALUD")),
])
# ---------------- S4 ----------------
POR = ("bel_portre2_1", "bel_venedik"); POR2 = ("bel_portre3", "bel_portre2_2", "bel_venedik")
def bel(dil):
    t = {"tr": [("RÖNESANS", "GÖZE", "ZEHİR!"), ("BELLADONNA", "“GÜZEL", "KADIN”"), ("BİZDE ADI", "GÜZELAVRAT", "OTU!"), ("BİRKAÇ DAMLA", "KOCAMAN", "GÖZ BEBEĞİ"),
              ("O DÖNEMDE", "BÜYÜLEYİCİ", "BAKIŞ"), ("BEDELİ", "BULANIK GÖRME", "ÇARPINTI"), ("İNGİLİZCE", "DEADLY", "NIGHTSHADE"), ("1753 · LİNNAEUS", "ATROPA", ""),
              ("ATROPOS", "HAYAT İPİNİ", "KESEN"), ("GÜZEL KADIN", "+ ÖLÜM", "")],
         "en": [("RENAISSANCE ITALY", "POISON", "IN THE EYES!"), ("BELLADONNA", "“BEAUTIFUL", "LADY”"), ("ALSO KNOWN AS", "DEADLY", "NIGHTSHADE"), ("A FEW DROPS", "HUGE", "PUPILS"),
              ("BACK THEN", "SEDUCTIVE", "GAZE"), ("THE PRICE", "BLURRED VISION", "RACING HEART"), ("1753", "LINNAEUS", ""), ("ATROPOS", "CUTS THE THREAD", "OF LIFE"),
              ("BEAUTIFUL LADY", "+ DEATH", ""), ("YOUR TURN", "DEADLIEST", "BEAUTY TREND?")],
         "es": [("RENACIMIENTO", "VENENO", "EN LOS OJOS"), ("BELLADONA", "“MUJER", "HERMOSA”"), ("UNAS GOTAS", "PUPILAS", "ENORMES"), ("EN AQUELLA ÉPOCA", "MIRADA", "SEDUCTORA"),
              ("EL PRECIO", "VISIÓN BORROSA", "TAQUICARDIA"), ("1753", "LINNEO", ""), ("ÁTROPOS", "CORTA EL HILO", "DE LA VIDA"), ("ANDALUCÍA", "ATROPA", "BAETICA"),
              ("MUJER HERMOSA", "+ MUERTE", ""), ("¿Y TÚ?", "LA MODA", "MÁS PELIGROSA")]}[dil]
    img = {"tr": [POR, "bel_bitki_1", ("bel_foto_2",), POR2, POR, "bel_bitki_2", ("bel_foto_1",), "bel_linne", "bel_atropos_1", POR],
           "en": [POR, "bel_bitki_1", ("bel_foto_2",), POR2, POR, "bel_bitki_2", "bel_linne", "bel_atropos_1", POR2, POR],
           "es": [POR, "bel_bitki_1", POR2, POR, "bel_bitki_2", "bel_linne", "bel_atropos_1", ("bel_foto_2",), POR2, POR]}[dil]
    goz = [0.3, 0.12, 0.7, 0.35]
    out = []
    for k, (im, b) in enumerate(zip(img, t)):
        od = (TUM, goz) if im in (POR2,) else (None, None)
        out.append(I(im, od[0], od[1], b, "Foto: CC BY-SA" if "foto" in str(im) else ""))
    return out
for d in ("tr", "en", "es"): V["S4_BELLADONNA", d] = ("BELLADONNA", "Belladonna", bel(d))
# ---------------- S5 ----------------
LON = [[-0.604, 51.483], [-0.52, 51.49], [-0.42, 51.5], [-0.3, 51.51], [-0.224, 51.513]]
def mar(dil):
    t = {"tr": [("42,195 KM", "NEDEN?", "KRALİYET!"), ("İLK MARATONLAR", "~40 KM", ""), ("LONDRA 1908", "WINDSOR", "SARAYI"), ("BİTİŞ", "KRALİYET", "LOCASI"),
              ("26 MİL 385 YARDA", "42.195 M", ""), ("DORANDO PIETRI", "YANLIŞ", "YÖN!"), ("", "5 KEZ", "YERE YIĞILDI"), ("DİSKALİFİYE", "KRALİÇEDEN", "KUPA"),
              ("1921", "RESMÎ", "MESAFE"), ("SEN?", "MARATON", "KOŞTUN MU?")],
         "en": [("26.2 MILES", "WHY?", "ROYALS!"), ("EARLY MARATHONS", "~40 KM", ""), ("LONDON 1908", "WINDSOR", "CASTLE"), ("FINISH LINE", "ROYAL", "BOX"),
              ("", "26 MI", "385 YD"), ("DORANDO PIETRI", "WRONG", "WAY!"), ("", "COLLAPSED", "5 TIMES"), ("GOLD", "JOHNNY HAYES", "USA"),
              ("QUEEN ALEXANDRA", "A SPECIAL", "CUP"), ("YOU?", "EVER RUN", "ONE?")],
         "es": [("42,195 KM", "¿POR QUÉ?", "¡LA REALEZA!"), ("LOS PRIMEROS", "~40 KM", ""), ("LONDRES 1908", "WINDSOR", ""), ("META", "PALCO", "REAL"),
              ("", "42 KM", "195 M"), ("DORANDO PIETRI", "¡AL REVÉS!", ""), ("", "5 CAÍDAS", ""), ("DESCALIFICADO", "COPA", "DE LA REINA"),
              ("1921", "DISTANCIA", "OFICIAL"), ("¿Y TÚ?", "¿HAS CORRIDO", "UN MARATÓN?")]}[dil]
    harita = HR([-0.42, 51.49], 900, [[-0.604, 51.483, "WINDSOR", -1, -70, True], [-0.224, 51.513, "WHITE CITY", 1, -70, True]], t[4], LON, bz=0.08)
    son = {"tr": ("mar_istanbul", "mar_1896"), "en": ("mar_nyc", "mar_1896"), "es": ("mar_valencia", "mar_1896")}[dil]
    s7 = I("mar_hayes", None, None, t[7]) if dil == "en" else I("mar_alexandra", [0.1, 0.0, 0.9, 0.6], None, t[7])
    s8 = I("mar_alexandra", [0.1, 0.0, 0.9, 0.6], None, t[8]) if dil == "en" else I(son, None, None, t[8])
    return [I("mar_pietri_1", None, None, t[0]), I("mar_1896", None, None, t[1]), I("mar_windsor", None, None, t[2]),
            I("mar_whitecity_1", None, None, t[3]), harita, I("mar_pietri_2", None, None, t[5]), I("mar_pietri_3", None, None, t[6]),
            s7, s8, I("mar_pietri_1", [0.2, 0.0, 0.8, 0.7], None, t[9])]
for d in ("tr", "en", "es"): V["S5_MARATON", d] = ("MARATON", "Maraton", mar(d))

# ---------------- L6 (yatay) ----------------
P = {"bog": [29.06, 41.08], "bab": [43.4, 12.6], "hur": [56.3, 26.6], "suv": [32.55, 29.97], "dv": [44.0, 48.7], "lep": [21.2, 38.3], "pre": [20.75, 38.95]}
def gen(bas, et, vurgu=None):
    n = [[*P["bog"], et[0], 1, -40, vurgu == 0], [*P["bab"], et[1], -1, 30, vurgu == 1], [*P["hur"], et[2], 1, 30, vurgu == 2],
         [*P["suv"], et[3], -1, -40, vurgu == 3], [*P["dv"], et[4], 1, -30, vurgu == 4]]
    return HR([40, 33], 26, n, bas, bz=0.6)
def yak(k, et, bas, zoom=90):
    return HR(P[k], zoom, [[*P[k], et, 1, -50, True]], bas, bz=0.35)
def l6(dil):
    E = {"tr": ["BOĞAZ", "BABÜLMENDEP", "HÜRMÜZ", "SÜVEYŞ", "DON–VOLGA"], "en": ["BOSPORUS", "BAB-EL-MANDEB", "HORMUZ", "SUEZ", "DON–VOLGA"],
         "es": ["BÓSFORO", "BAB EL-MANDEB", "ORMUZ", "SUEZ", "DON–VOLGA"]}[dil]
    K = {"tr": ["1. KİLİT", "2. KİLİT", "3. KİLİT", "4. KİLİT", "5. KİLİT"], "en": ["LOCK 1", "LOCK 2", "LOCK 3", "LOCK 4", "LOCK 5"],
         "es": ["CERRADURA 1", "CERRADURA 2", "CERRADURA 3", "CERRADURA 4", "CERRADURA 5"]}[dil]
    SOK = ("bog_sokollu2_1", "bog_sokollu2_2", "bog_suleyman"); VOL = ("bog_volga2", "bog_volga3")
    ortak1 = [gen(None, E), gen(None, E), I("bog_piri", None, None)]
    blok_bog = [yak("bog", E[0], (K[0], "1452", E[0]), 140), I("bog_rumeli_1", None, None, None, "CC0"), I("bog_rumeli_2", None, None, None, "CC BY-SA 3.0"),
                I(("bog_hisar_minyatur", "bog_rumeli_1"), None, None), I("bog_kadirga_1", None, None), I("fatih_bellini", None, None)]
    blok_kiz = [yak("bab", E[1], (K[1], "1517", E[1]), 45), I(("bog_selim", "bog_suleyman"), None, None), I(("bog_portekiz", "bog_kadirga_2"), None, None),
                I(("bog_aden", "bog_kizildeniz"), None, None), I("bog_kizildeniz", None, None, None, "NASA")]
    blok_hur = [yak("hur", E[2], (K[2], "1552", E[2]), 60), I("bog_piri", [0.2, 0.0, 0.9, 0.5], None), I("bog_hurmuz_1", None, None, None, "CC BY-SA 4.0"),
                I("bog_hurmuz_2", None, None, None, "CC BY-SA 4.0"), I("bog_piri", None, None)]
    blok_suv = [yak("suv", E[3], (K[3], "1568", E[3]), 70), I(SOK, None, None), I("bog_kadirga_2", None, None), I("bog_suveys", None, None, ("", "1869", ""))]
    blok_dv = [yak("dv", E[4], (K[4], "1569", E[4]), 55), yak("dv", "~60 KM", None, 110), I(VOL, None, None), I(("bog_kadirga_2",), None, None), I(VOL, None, None, ("", "1952", ""))]
    if dil in ("tr", "en"):
        return ortak1 + blok_bog + blok_kiz + blok_hur[:4] + [gen(None, E, 2)] + blok_suv + blok_dv + [gen(None, E), gen(None, E, 2), I("bog_piri", None, None)]
    # es
    return [gen(None, E), gen(None, E), I("bog_lepanto_1", None, None), yak("bog", E[0], (K[0], "1452", E[0]), 140), I("bog_rumeli_1", None, None, None, "CC0"),
            I("bog_rumeli_2", None, None, None, "CC BY-SA 3.0"), I("bog_kadirga_1", None, None), I("fatih_bellini", None, None),
            yak("bab", E[1], (K[1], "1517", E[1]), 45), I(("bog_portekiz", "bog_kadirga_2"), None, None), I(("bog_aden", "bog_kizildeniz"), None, None), I("bog_kizildeniz", None, None, None, "NASA"),
            yak("hur", E[2], (K[2], "1552", E[2]), 60), I("bog_piri", [0.2, 0.0, 0.9, 0.5], None), I("bog_hurmuz_1", None, None, None, "CC BY-SA 4.0"), I("bog_piri", None, None),
            yak("suv", E[3], (K[3], "1568", E[3]), 70), I("bog_suveys", None, None, ("", "1869", "")),
            yak("dv", E[4], (K[4], "1569", E[4]), 55), I(VOL, None, None, ("", "1952", "")),
            HR([18, 38], 60, [[*P["lep"], "LEPANTO", 1, 40, True], [*P["pre"], "PRÉVEZA", -1, -40, False], [-3.7, 40.4, "ESPAÑA", 1, -30, True]], ("MEDITERRÁNEO", "ESPAÑA", "VS OTOMANOS"), bz=0.5),
            I("bog_preveze", None, None, ("PRÉVEZA", "1538", "")), I("bog_lepanto_2", None, None, ("7 OCT 1571", "LEPANTO", "")),
            I("bog_donjuan", None, None, ("LA LIGA SANTA", "DON JUAN", "DE AUSTRIA")), I("bog_cervantes", None, None, ("", "CERVANTES", "EL MANCO DE LEPANTO")),
            I("bog_lepanto_1", None, None), I(SOK, None, None, ("SOKOLLU", "“LA BARBA", "VUELVE A CRECER”")), I("bog_kadirga_2", None, None),
            gen(None, E), gen(None, E, 2), I("bog_lepanto_3", None, None)]
for d in ("tr", "en", "es"): V["L6_BOGAZ", d] = ("BOGAZ_UZUN", "Boğazlar", l6(d))

# ---------------- L7 (yatay) ----------------
def l7(dil):
    n = {"tr": ["1 · ELÇİLER", "2 · İKARUS'UN DÜŞÜŞÜ", "3 · ALPLERİ GEÇEN NAPOLYON", "4 · SALINCAK", "5 · FOLIES-BERGÈRE'DE BİR BAR", "6 · GRANDE JATTE", "7 · VERTUMNUS"],
         "en": ["1 · THE AMBASSADORS", "2 · THE FALL OF ICARUS", "3 · NAPOLEON CROSSING THE ALPS", "4 · THE SWING", "5 · A BAR AT THE FOLIES-BERGÈRE", "6 · LA GRANDE JATTE", "7 · VERTUMNUS"],
         "es": ["1 · LOS EMBAJADORES", "2 · LA CAÍDA DE ÍCARO", "3 · NAPOLEÓN CRUZANDO LOS ALPES", "4 · EL COLUMPIO", "5 · UN BAR DEL FOLIES-BERGÈRE", "6 · LA GRANDE JATTE", "7 · EL PERRO"]}[dil]
    ac = {"tr": [("7 TABLO", "7 SIR", ""), ("", "SONUNCUSU", "EN ŞAŞIRTICI")], "en": [("7 PAINTINGS", "7 SECRETS", ""), ("", "THE LAST ONE", "IS THE STRANGEST")],
          "es": [("7 CUADROS", "7 SECRETOS", ""), ("", "EL ÚLTIMO", "ESTÁ EN EL PRADO")]}[dil]
    b = lambda k, alt="": (n[k].split(" · ")[0], n[k].split(" · ")[1], alt)
    el = [I("t_elciler", TUM, [0.0, 0.0, 1, 0.75], b(0, "HOLBEIN · 1533")), I("t_elciler", [0.05, 0.05, 0.95, 0.7], None), I("t_elciler", TUM, [0.25, 0.62, 0.85, 0.98]),
          I("t_elciler", [0.25, 0.62, 0.85, 0.98], [0.42, 0.7, 0.68, 0.9]), I("t_elciler", [0.42, 0.7, 0.68, 0.9], [0.4, 0.5, 0.65, 0.7])]
    ik = [I("t_ikarus", TUM, None, b(1, "BRUEGEL")), I("t_ikarus", [0.4, 0.0, 1.0, 0.6], None), I("t_ikarus", TUM, [0.6, 0.55, 0.95, 0.9]),
          I("t_ikarus", [0.05, 0.3, 0.6, 0.85], None), I("t_ikarus", [0.6, 0.55, 0.95, 0.9], TUM)]
    na = [I("t_napolyon_david", TUM, None, b(2, "DAVID · 1801")), I("t_napolyon_david", [0.2, 0.05, 0.9, 0.6], None), I("t_napolyon_delaroche", None, None),
          I("t_napolyon_david", [0.3, 0.05, 0.8, 0.45], None), I("t_napolyon_delaroche", TUM, [0.2, 0.1, 0.8, 0.6], ("DELAROCHE", "1850", "")), I("t_napolyon_david", TUM, [0.0, 0.82, 0.45, 1.0])]
    sw = [I("t_salincak", TUM, None, b(3, "FRAGONARD · 1767")), I("t_salincak", [0.25, 0.35, 0.75, 0.75], None), I("t_salincak", [0.0, 0.55, 0.5, 0.98], [0.55, 0.45, 0.98, 0.85]), I("t_salincak", TUM, None)]
    fo = [I("t_folies", TUM, None, b(4, "MANET · 1882")), I("t_folies", [0.25, 0.0, 0.75, 0.6], None), I("t_folies", TUM, [0.55, 0.05, 1.0, 0.6]), I("t_folies", TUM, [0.0, 0.0, 0.2, 0.2])]
    ja = [I("t_jatte", TUM, None, b(5, "SEURAT")), I("t_jatte", [0.4, 0.3, 0.7, 0.7], [0.5, 0.4, 0.62, 0.55]), I("t_jatte", TUM, [0.65, 0.55, 0.98, 0.95]), I("t_jatte", [0.65, 0.4, 0.98, 0.95], None)]
    if dil == "es":
        se = [I("t_perro", TUM, None, b(6, "GOYA · PRADO")), I("t_perro", TUM, [0.2, 0.5, 0.7, 0.8]), I("t_perro", TUM, None), I("t_perro", [0.2, 0.5, 0.7, 0.8], TUM)]
    else:
        se = [I("t_vertumnus", TUM, None, b(6, "ARCIMBOLDO")), I("t_vertumnus", [0.1, 0.0, 0.9, 0.6], None), I("t_vertumnus", TUM, [0.25, 0.15, 0.8, 0.55]), I("t_vertumnus", [0.25, 0.15, 0.8, 0.55], TUM)]
    kap = I("t_elciler", TUM, None)
    giris = [I("t_folies", TUM, None, ac[0]), I("t_jatte", TUM, None, ac[1])]
    if dil == "tr":  # 35: 2+5+5+6+4+4+4+4+1
        return giris + [el[0], el[1], el[2], el[3], el[4]] + ik + na + sw + fo + ja + se + [kap]
    if dil == "en":
        return giris + [el[0], el[1], el[2], el[3], el[4]] + ik + na + sw + fo + ja + se + [kap]
    # es 34: Napolyon 5 satır (taşlar, sonra Delaroche)
    return giris + el + ik + [na[0], na[1], na[2], na[5], na[4]] + sw + fo + ja + se + [kap]
for d in ("tr", "en", "es"): V["L7_TABLO", d] = ("TABLO_UZUN", "Tablolar", l7(d))

# ---------------- yaz ----------------
for (klas, dil), (kod, ad, sahne) in V.items():
    M = [l.strip() for l in open(os.path.join(os.path.dirname(os.path.abspath(__file__)), klas, f"metin_{dil}.txt"), encoding="utf-8") if l.strip()]
    if len(M) != len(sahne): print("UYARI satır/sahne", klas, dil, len(M), len(sahne)); continue
    ugur = dil == "tr" and klas in ("S1_TABLO", "L7_TABLO")
    J = {"kod": f"{klas}_{dil.upper()}", "dil": dil, "format": "yatay" if klas.startswith("L") else "dikey", "metin": M,
         "ses": [f"{SES}/K_{kod}_{dil.upper()}_SES__s{i + 1}.mp3" for i in range(len(M))], "sahneler": sahne,
         "kanal": KANAL[dil], "kapanis": KAP[dil], "alt": (ALT_UGUR[dil] if ugur else ALT[dil]),
         "cikti": os.path.abspath(os.path.join(OUT, f"{klas}_{dil.upper()}.mp4"))}
    json.dump(J, open(os.path.join(OUT, f"{klas}_{dil}.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print("tamam", len(V))
