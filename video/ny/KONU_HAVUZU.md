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
- [x] NY_EN_05_NUFUS · En kalabalık 5 il (TÜİK ADNKS 2025) — kanca: "Türkiye'nin üçte birinden fazlası sadece 5 ilde"
- [x] NY_BL_03_PLAKA · Plaka kodlarının sırrı: Zonguldak 67, Düzce 81, Kahramanmaraş 46, Mersin 33 (İçel) — kanca: "Mersin M ile başlıyor, neden 33?"
- [x] NY_SQ_03_GOL · Bilgi şıklı soru "Bu göl hangi ilde?": Uzungöl (Trabzon), Salda (Burdur), Nemrut Krater Gölü (Bitlis) — tuzak: Adıyaman
- Not: EN_05 (~43 sn) ve BL_03 (~41 sn) hedefin (45-60 sn) biraz altında; sonraki partilerde metni biraz uzat.

## Parti 9 — Karışık formatlar (2026-11-22)
- [x] NY_YM_05_LEZZET · Bu lezzet hangi ilin: Tokat kebabı (Tokat), Edirne tava ciğeri (Edirne), Kayseri mantısı (Kayseri) — kanca: "Bir kaşığa 40 tanesi sığmalı"
- [x] NY_HF_04_RENK · Görsel hafıza "Renkli iller testi": Diyarbakır, Çanakkale, Sinop (+Eskişehir, Adana)
- [x] NY_BL_04_UNESCO · UNESCO'nun ilk 3 Türk mirası (1985): İstanbul, Göreme-Kapadokya, Divriği — kanca: "Üçüncüsünde 800 yıllık hastane var"
- Not: Gemini YM_05 için ilk denemede 8 sn kısa ses döndürdü (hizalama hatası); metin hafif değiştirilip yeniden okutuldu. Süreler 64/73/79 sn — hedefin üstünde; sonraki partilerde metni kısalt.

## Parti 10 — Karışık formatlar (2026-11-23)
- [x] NY_EN_06_BARAJ · En büyük 3 baraj gölü: Ilısu 313, Keban 675, Atatürk 817 km² — kanca: "Türkiye'nin 3. büyük gölünü insanlar yaptı". Karakaya (268/298) ve Hirfanlı (263–280) kaynaklarda çelişkili olduğu için liste 3'le sınırlandı.
- [x] NY_SQ_04_SELALE · Bilgi şıklı soru "Bu şelale hangi ilde?": Muradiye (Van), Tortum (Erzurum), Kapuzbaşı (Kayseri) — tuzak: Niğde/Adana
- [x] NY_HF_05_OYUN · Görsel hafıza "Haritada hafıza oyunu": Hatay, Afyonkarahisar, Muş (+Sivas, Balıkesir) — turuncu/mor/mavi soruldu
- Not: Süreler 55/62/65 sn; havuza teslim, plan 17-19.12 13:00 (onay bekliyor). SQ_04 hedefin biraz üstünde.

## Parti 11 — Karışık formatlar (2026-11-24)
- [x] NY_YM_06_TAT · Bu tat hangi ilin: Leblebi (Çorum), Pastırma (Kayseri), Maraş dondurması (Kahramanmaraş) — kanca: "Sadece 3 malzeme". Cezerye: serbest lisanslı uygun fotoğraf yok, pastırmayla değiştirildi.
- [x] NY_SQ_05_ANTIK · Bilgi şıklı soru "Bu antik kent hangi ilde?": Efes (İzmir), Afrodisias (Aydın), Ani (Kars) — tuzak: Denizli
- [x] NY_BL_05_UNVAN · Unvanını Meclis'ten alan iller: Gazi (1921), Kahraman (1973), Şanlı (1984) — kanca: "En yenisi hangisi?"
- Not: Süreler 82/81/63 sn; havuza teslim, plan 20-22.12 13:00 (onay bekliyor). Gemini Puck yavaş okudu; YM/SQ hedefin çok üstünde — sonraki şıklı/yemek videolarında metni ~%30 kısalt. BL_05 ilk denemede 13 sn kısa ses (kanca metni değiştirilip yeniden okutuldu).

## Parti 12 — Karışık formatlar (2026-11-25)
- [x] NY_EN_07_TENHA · En az nüfuslu 5 il (TÜİK ADNKS 2025): Kilis, Gümüşhane, Ardahan, Tunceli, Bayburt — kanca: "Bir İstanbul ilçesine bu ilden 12 tane sığar" (Esenyurt 1.003.905 / Bayburt 82.836)
- [x] NY_HF_06_ILLER · Görsel hafıza "5 saniye bak, hatırla": Yalova, Zonguldak, Bilecik (+Tokat, Aydın) — kırmızı/mavi/yeşil soruldu
- [x] NY_BL_06_SINIR · Komşu ülkesi en çok olan il: Edirne, Hakkari, Şırnak, Ardahan (2 ülke) → Iğdır (3 ülke) — kanca: "Bir ilimiz tam 3 ülkeyle komşu"
- Not: Süreler 50/60/44 sn; havuza teslim, plan 23-25.12 13:00 (onay bekliyor). BL_06 ilk denemede Gemini 10,6 sn kısa ses döndürdü (kanca metni değiştirilip yeniden okutuldu); 44 sn ile hedefin biraz altında — 93 kelime ≈ 44 sn, bilgi videolarında ~105 kelime hedefle.

## Parti 13 — Karışık formatlar (2026-11-26)
- [x] NY_YM_07_KOFTE · Bu köfte hangi ilin: İnegöl (Bursa), Akçaabat (Trabzon), Tekirdağ (Tekirdağ) — kanca: "Porsiyonu tam 10 tane olmak zorunda" (TÜRKPATENT no 517)
- [x] NY_SQ_06_MAGARA · Bilgi şıklı soru "Bu mağara hangi ilde?": Karaca (Gümüşhane), Ballıca (Tokat), Damlataş (Antalya) — kanca: "Biri taş ocağı açılırken tesadüfen bulundu" (1948)
- [x] NY_HF_07_HAFIZA · Görsel hafıza "Renkleri aklında tut": Rize, Edirne, Gaziantep (+Kastamonu, Van) — turuncu/mavi/mor soruldu
- Not: Derinkuyu kat sayısı (12 / 18) ve Tekirdağ köftesi köken dönemi (≈1920'ler / 1950'ler) kaynaklarda çelişkili, kullanılmadı. HF'de Nevşehir sayaç dairesinin altında kaldığı için Gaziantep'le değiştirildi (sayaç haritanın ortasında; merkezdeki iller sorulmamalı).
- Not: "bin dokuz yüz kırk yedide" gibi ekli yıllar altyazıda "1.940 yedide" çıkıyor; yılı her zaman "... yılında" kalıbıyla yaz. HF_07 ve SQ_06 bu yüzden yeniden okutuldu.
- Not: Süreler 75/60/67 sn; havuza teslim, plan 26-28.12 13:00 (onay bekliyor). YM_07 hedefin üstünde (Puck yavaş); sonraki yemek videosunda metni ~%20 kısalt.

## Parti 14 — Karışık formatlar (2026-11-27)
- [x] NY_EN_08_TUNEL · En uzun 3 kara yolu tüneli: Eğribel 5.900 m, Ovit 14.346 m, Zigana 14.477 m — kanca: "Rekor 2023'te el değişti". Ilgaz tüp uzunlukları çelişkili (5.370–5.488 m), liste 3'le sınırlandı.
- [x] NY_BL_07_KOMSU · Komşu il sayısı: Konya/Erzurum/Erzincan 9, Yalova 2 → Kilis 1 (sadece Gaziantep) — kanca: "Bir ilimizin sadece 1 komşusu var"
- [x] NY_SQ_07_KALE · Bilgi şıklı soru "Bu kale hangi ilde?": Hoşap (Van), Mamure (Mersin), Harput (Elazığ) — kanca: "Birinin harcında süt var" (rivayet)
- Not: Hoşap yapım tarihi (16. yy / 1649) ve Harput fethi (1515/1516) çelişkili, kullanılmadı.
- Not: Süreler 63/44/64 sn; havuza teslim, plan 29-31.12 13:00 (onay bekliyor). BL_07 hedefin biraz altında (96 kelime ≈ 44 sn); bilgi videolarında ~110 kelime hedefle.

## Parti 15 — Karışık formatlar (2026-11-28)
- [x] NY_YM_08_KEBAP · Bu kebap hangi ilin: Adana kebabı (Adana), Urfa tepsi kebabı (Şanlıurfa), Beyti (İstanbul) — kanca: "Biri adını bir ustadan alıyor" (Beyti Güler, 1945)
- [x] NY_HF_08_BAK · Görsel hafıza "Haritaya 5 saniye bak": Bursa, Denizli, Şanlıurfa (+Ordu, Erzurum) — sarı/yeşil/turuncu soruldu; bilgiler UNESCO yılları (2014/1988/2018)
- [x] NY_SQ_08_ADA · Bilgi şıklı soru "Bu ada hangi ilde?": Marmara Adası (Balıkesir), Gökçeada (Çanakkale), Bozcaada (Çanakkale) — kanca: "Bu adada tek bir köy bile yok"
- Not: Kağıt kebabı (Hatay ve Malatya ayrı tescilli) ve büryan (Siirt/Bitlis tartışmalı) çelişkili olduğu için kullanılmadı. "Türkiye'nin en kuzey noktası" (Sinop İnceburun / Kırklareli Kofçaz) kaynaklarda çelişkili, bilgi videosu bu yüzden ada sorusuna çevrildi. Urfa soğan kebabının serbest lisanslı fotoğrafı yok.
- Not: Süreler 64/62/58 sn; havuza teslim, plan 01-03.01 13:00 (onay bekliyor).
