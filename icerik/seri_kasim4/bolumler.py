"""Seri Kasım 4 (17 Kas 2026, Ömer seçimi): 24 Kasım için Başöğretmen (Gündem + Tarih) + Tablo Serisi: Sütçü Kız (Vermeer).
Yayın saatini Yükleme Yöneticisi belirler; publishAt yalnız taslak alanıdır. Her satır: (metin, görsel_adı, [küçük, büyük, büyük2])."""
import importlib.util, os
_s = importlib.util.spec_from_file_location("taslak_bolumler", os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "seri_taslak", "bolumler.py"))
_m = importlib.util.module_from_spec(_s); _s.loader.exec_module(_m)
B, BENIM2, UGUR = _m.B, _m.BENIM2, _m.UGUR

BOLUMLER = [
    B("AS_GT_BASOGRETMEN", "ogretmen", "tr", "TR", "Gündem + Tarih", "2026-11-24T19:00:00+03:00",
      "Atatürk'e neden Başöğretmen denir? 📚 #shorts",
      "24 Kasım Öğretmenler Günü neden bu tarihte? Cevap 1928'de bir kara tahtanın başında başlıyor: yeni harfler, Millet Mektepleri ve Atatürk'ün Başöğretmenliği.",
      ["öğretmenler günü", "24 kasım", "başöğretmen", "atatürk", "harf devrimi", "millet mektepleri", "tarih", "antik stüdyo", "shorts"],
      "Millet Mektepleri Talimatnamesi (24 Kasım 1928, Bakanlar Kurulu kararı 11 Kasım 1928); 1 Kasım 1928 tarihli 1353 sayılı Türk Harflerinin Kabul ve Tatbiki Hakkında Kanun; Öğretmenler Günü'nün 1981'den beri 24 Kasım'da kutlanması (Atatürk'ün doğumunun 100. yılı).",
      [("Atatürk'e neden Başöğretmen denir? Cevap bir kara tahtada saklı.", "ogretmen_tahta", ["24 KASIM", "NEDEN", "BAŞÖĞRETMEN?"]),
       ("Bin dokuz yüz yirmi sekiz yazı. Yeni Türk harfleri halka tanıtılıyor.", "ogretmen_harf", ["1928", "YENİ", "HARFLER"]),
       ("Atatürk şehir şehir dolaştı; kara tahtanın başına geçip harfleri kendisi öğretti.", "ogretmen_tahta", ["ŞEHİR ŞEHİR", "KARA TAHTA", "BAŞINDA"]),
       ("Bir Kasım'da Harf Kanunu çıktı. Sırada herkese okuma yazma öğretmek vardı.", "ogretmen_harf", ["1 KASIM 1928", "HARF", "KANUNU"]),
       ("Genç, yaşlı, kadın, erkek... Millet Mektepleri herkese açılacaktı.", "ogretmen_sinif", ["MİLLET", "MEKTEPLERİ", "HERKESE"]),
       ("Yirmi dört Kasım'da yönetmelik yürürlüğe girdi; Atatürk, Millet Mekteplerinin Başöğretmeni oldu.", "ogretmen_sinif", ["24 KASIM 1928", "BAŞ", "ÖĞRETMEN"]),
       ("Bin dokuz yüz seksen birden beri bu gün Öğretmenler Günü. Seni en çok hangi öğretmenin etkiledi? Yorumlara yaz!", "ogretmen_bugun", ["ÖĞRETMENLER", "GÜNÜ", "KUTLU OLSUN"])],
      ambiyans="merak", voice=BENIM2, kanal_etiket="ANTİK STÜDYO"),
    B("AS_TB_SUTCU_KIZ", "tablo", "tr", "TR", "Tablo Serisi", "2026-11-23T18:00:00+03:00",
      "Vermeer bu tablodan 2 şeyi sildi 🥛🖼️ #shorts",
      "Johannes Vermeer'in Sütçü Kız tablosu (yaklaşık 1657-1658, Rijksmuseum, Amsterdam): 2022'de kızılötesi taramayla boyanın altında bulunan iki gizli nesne.",
      ["sütçü kız", "vermeer", "the milkmaid", "rijksmuseum", "tablo", "sanat", "resim", "antik stüdyo", "shorts"],
      "Rijksmuseum, 8 Eylül 2022 açıklaması: Sütçü Kız'da boyanın altında testi askısı ve söğüt dalından sepet bulundu (kısa dalga kızılötesi yansıma görüntüleme); eser sayfası, Het melkmeisje (yaklaşık 1660).",
      [("Vermeer bu tablodan iki şeyi sildi... ve üç buçuk asır sonra bulundu!", "vermeer_sutcu", ["SÜTÇÜ KIZ", "SİLİNEN", "2 ŞEY!"]),
       ("Johannes Vermeer, Sütçü Kız. Bugün Amsterdam'da, Rijksmuseum'da.", "vermeer_sutcu", ["VERMEER", "≈1657-1658", "AMSTERDAM"]),
       ("Silinen şey bir: kızın başının arkasındaki duvarda, testilerin asıldığı tahta bir askı vardı.", "vermeer_sutcu", ["SİLİNEN 1/2", "TESTİ", "ASKISI"]),
       ("İki bin yirmi ikide müze, kızılötesi taramayla bu askıyı boyanın altında gördü.", "vermeer_sutcu", ["2022", "KIZILÖTESİ", "TARAMA"]),
       ("Silinen şey iki: söğüt dalından örülmüş, çamaşır kurutmaya yarayan bir sepet.", "vermeer_sutcu", ["SİLİNEN 2/2", "SÖĞÜT", "SEPET"]),
       ("Vermeer ikisini de boyayla örttü. Geriye bembeyaz bir duvar ve tek bir kadın kaldı.", "vermeer_sutcu", ["BEYAZ DUVAR", "TEK", "KADIN"]),
       ("Sence tablo böyle mi güzel, eski hâliyle mi? Yorumlara yaz!", "vermeer_sutcu", ["SENCE?", "SADE Mİ", "DOLU MU?"])],
      voice=UGUR, kanal_etiket="ANTİK STÜDYO"),
]

# Sütçü Kız: anlatılan ayrıntıya göre odak (görsel oranı 0-1; motor çıktı oranına genişletir)
_V = {0: ([0.15, 0.0, 0.9, 1.0], [0.3, 0.1, 0.75, 0.75]),
      1: ([0.0, 0.0, 1.0, 1.0], [0.2, 0.0, 0.85, 1.0]),
      2: ([0.45, 0.0, 1.0, 0.75], [0.6, 0.02, 0.98, 0.55]),
      3: ([0.6, 0.02, 0.98, 0.55], [0.5, 0.0, 1.0, 0.7]),
      4: ([0.2, 0.3, 1.0, 1.0], [0.0, 0.0, 1.0, 1.0]),
      5: ([0.5, 0.0, 1.0, 0.8], [0.15, 0.0, 0.9, 1.0]),
      6: ([0.0, 0.0, 1.0, 1.0], [0.25, 0.05, 0.8, 0.8])}
for _b in BOLUMLER:
    if _b["kod"] == "AS_TB_SUTCU_KIZ":
        for _i, _sc in enumerate(_b["sahneler"]):
            _sc["odak"], _sc["odak2"] = _V[_i]
