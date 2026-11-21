# Nasıl Yapıldı · konu havuzu (merak kancalı, 3'lü partiler)

Durum: [ ] bekliyor · [~] üretimde · [x] yayına teslim
Motorun bugün desteklediği tipler: nehir, dag, gol. Diğerleri için motora tip eklenir (nokta/çizgi/alan).

## Parti 1 — Türkiye'nin En'leri
- [x] NY_EN_01_NEHIR · En uzun 5 nehir — kanca: "Fırat 2.800 km ama en uzun değil"
- [x] NY_EN_02_DAG · En yüksek 5 dağ — kanca: "5 dağın 3'ü yanardağ"
- [x] NY_EN_03_GOL · En büyük 5 göl — kanca: "2. büyük gölün ortasında yürüyebilirsin"

## Parti 2 — Su (nehir/gol tipi)
- [ ] Türkiye'nin en büyük 5 baraj gölü — kanca: "Atatürk Barajı'nın suyu bir şehri ... kez doldurur" (kaynaklı sayı bul)
- [ ] Denize dökülmeyen nehirler (kapalı havza) — kanca: "Bu nehirler hiçbir denize ulaşmıyor"
- [ ] Sınır aşan nehirler — kanca: "Türkiye'de doğup başka ülkelerde biten 5 nehir"

## Parti 3 — Yer şekilleri (dag tipi + yeni tip)
- [ ] Türkiye'nin 5 yanardağı — kanca: "Kapadokya'yı bir yanardağ yaptı"
- [ ] En derin 5 kanyon — kanca: "Grand Canyon'dan derin bir kanyonumuz var mı?" (kaynakla doğrula)
- [ ] En büyük 5 ova — kanca: "Türkiye'nin ekmeği bu 5 düzlükten çıkıyor"

## Parti 4 — Yapılar (yeni tip: nokta/çizgi; kanal adına en uygun seri)
- [x] En uzun 5 köprü → NY_EN_04_KOPRU (2026-11-19)
- [ ] En uzun 5 tünel — kanca: "Dağın altından ... km"
- [ ] En büyük 5 havalimanı / baraj / GES

## Kural
Her parti: 3 konu kartı + 3 TTS metni + 3 önizleme isteği tek commit. Ömer önizlemeyi onaylamadan final yok.

## Parti 5 — Karışık formatlar (2026-11-18)
- [x] NY_SQ_01_MIRAS · Bilgi şıklı soru: Nemrut, Pamukkale, Göbeklitepe — kanca: "Sonuncusu çoğunu yanıltıyor"
- [x] NY_YM_02_ETLI · Bu yemek hangi ilin: Etliekmek, Ali Nazik, Perde Pilavı
- [x] NY_HF_02_RENK · Görsel hafıza: Kars, İzmir, Bolu (+Samsun, Kayseri)

## Parti 6 — Karışık formatlar (2026-11-19)
- [x] NY_EN_04_KOPRU · En uzun açıklıklı 5 asma köprü — kanca: "2.023 m aslında bir tarih"
- [x] NY_BL_02_HAVA · Hava rekorları: Rize yağış, Çaldıran −46,4, Sarıcakaya 49,5, Silopi 50,5 — kanca: "97 derece fark"
- [~] NY_YM_03_UNLU · Bu yemek hangi ilin: İskender (Bursa), Boyoz (İzmir), Künefe (Hatay) — final hazır; havuz 14 gün kuralıyla reddetti (NY_YM_02_ETLI), 02.12 sonrası yeniden teslim

## Parti 7 — Karışık formatlar (2026-11-20)
- [x] NY_SQ_02_YAPI · Bilgi şıklı soru "Bu yapı hangi ilde?": Sümela (Trabzon), Safranbolu (Karabük), İshak Paşa Sarayı (Ağrı)
- [x] NY_HF_03_HARITA · Görsel hafıza "5 saniyelik harita testi": Mardin, Muğla, Artvin (+Ankara, Konya)
- [x] NY_YM_04_TATLI · Bu tatlı hangi ilin: Katmer (Gaziantep), Pişmaniye (Kocaeli), Kemalpaşa (Bursa)
- Not: havuz "aynı konu" kontrolü `baslik_bant` ile yapılıyor; her videoda farklı bant kullan (YM_03 bu yüzden reddedildi).

## Parti 8 — Karışık formatlar (2026-11-21)
- [~] NY_EN_05_NUFUS · En kalabalık 5 il (TÜİK ADNKS 2025) — kanca: "Türkiye'nin üçte birinden fazlası sadece 5 ilde"
- [~] NY_BL_03_PLAKA · Plaka kodlarının sırrı: Zonguldak 67, Düzce 81, Kahramanmaraş 46, Mersin 33 (İçel) — kanca: "Mersin M ile başlıyor, neden 33?"
- [~] NY_SQ_03_GOL · Bilgi şıklı soru "Bu göl hangi ilde?": Uzungöl (Trabzon), Salda (Burdur), Nemrut Krater Gölü (Bitlis) — tuzak: Adıyaman
