# Animasyon format kütüphanesi

Kodla çizilen (SVG + React/Remotion) dikey animasyon videolarının kayıtlı formatları. Yöntem: `Claude_Animasyon_Sistemi.md`.
Görsel üretim modeli kullanılmaz; yalnız ses yapay zekâdır. Örnek videolar ve 24 karelik panolar depoda
`icerik/animasyon_formatlari/<kod>/` altındadır. Kod şablonları `sunucu/sosyal/animasyon/src/` altındadır.

Kural: Bir format seçildiğinde o formatın **kalıbı, çizim dili, yazı biçimi ve kamera** birebir uygulanır; konu, karakter,
mekân ve nesneler konudan çıkar. Aynı format arka arkaya aynı sahne düzeniyle tekrarlanmaz (YouTube tekrarlayan içerik kuralı):
format sabit, görsel dünya her videoda yeni.

## Format seçimi

| Konu türü | Format |
|---|---|
| Ders veren hikâye, masal, nasihat, halk hikâyesi | Kâğıt Masal |
| Gündelik hayattan bir arayış, mahalle, nostalji, şehir hikâyesi | Kâğıt Arayış |
| "Bu nesne/tasarım neden böyle?", bilim, teknik, gündelik nesne | Bu Neden Var? |
| Gerçek olay, rekor, veri, harita, gündem + tarih | Gerçek Olay |
| İkilem, ahlak sorusu, seri bölüm, izleyici oyu | Sen Karar Ver |
| Bir eşyanın/alışkanlığın yüzyıllar içindeki yolculuğu | Nesnenin Hayatı |
| Duygusal, masalsı, sözsüz ya da az sözlü kısa hikâye; yüksek görsel kalite | Masal Bebek 3B (yapay zekâ video) |
| Tek nesneyle anlatılan şiirsel, sade hikâye; döngü sonlu | Sade Masal Resmi (yapay zekâ video) |
| Tarihî yolculuk, sefer, göç, rota, savaş hattı (harita üstünde) | Harita Yolculuğu (türetilmiş) |
| Eskiden ve bugün karşılaştırması | Eskiden / Şimdi (türetilmiş) |
| İki taraf, iki yöntem, kim kazandı | Sayaç Yarışı (türetilmiş) |
| "Sen o anda orada olsan" tarih sahnesi | POV Tarih (türetilmiş) |

## Format: Kâğıt Masal
Örnek: `kagit-masal/ornek_keskin_balta.mp4` (Keskin balta). Kod şablonu: `src/bakkal/Video.tsx` (aynı çizim dili).
- **Kalıp (Masal):** iki karakter → iddia → ters köşe → tek cümle ders → izleyiciye soru. 70–100 kelime, 35–45 sn.
- **Çizim dili:** eski kâğıt dokusu, sepya/bej palet (`#eadcbc` kâğıt, `#3b2d22` mürekkep, tepeler `#d3c49f/#c4b38b`),
  güçlü kahverengi vinyet, hafif gren ve leke. Bütün çizgiler el çizimi gibi titrek (SVG turbulence + displacement,
  tohum 4 karede bir değişir: çizgi "kaynar"). Katmanlı tepeler, kabarık ağaçlar, ot öbekleri, çerçeveli bulutlar, "v" kuşlar.
- **Karakterler:** yuvarlak büyük baş, nokta göz, kaş, küçük ağız; ince uzun çubuk bacaklar, küçük dikdörtgen gövde
  (ekose gömlek, yelek), şapka/bere. Karakter yüzü cümleyle değişir; bekleme anında nefes alır, göz kırpar.
- **Yazı:** el yazısı (Patrick Hand, OFL). İlk cümle sol üstte büyük; ders sonda büyük, vurgulu kelime kırmızı, elle çizilmiş
  alt çizgi. El yazısı sayaçlar ("hiç durmayan 36 · oturan 49"), düşünce balonu içinde fikir.
- **Altyazı:** küçük el yazısı, beyaz + koyu kontur, kelime söylenince belirir, söylenen kelime sarı.
- **Kamera ve ışık:** tek dünya, geniş plan, yavaş süzülme. Gün ilerledikçe ışık bejden turuncuya ısınır.

## Format: Kâğıt Arayış
Örnek: `kagit-arayis/ornek_bakkal_pumpkin.mp4` (Bakkal, Pumpkin). Kod: `src/bakkal/Video.tsx`.
- **Kalıp:** yaygın bir durum (kanca) → karakter bir şey arar → art arda engeller (sayaçla) → vazgeçme anı (duraklama)
  → bulur ("!") → küçük mutluluk → ders, ilk cümleyi kapatır → "Senin ...?" sorusu.
- **Çizim dili:** Kâğıt Masal ile aynı; mekân şehir: evler, kaldırım taşları, yokuş-merdiven, kedi, martı, kubbe-minare silüeti.
- **Ana karakter:** Pumpkin (uzun sarı saç, mavi gözler, pas rengi çizgili kazak, mavi etek). Seride aynı kalır.
- **Gerçek marka yok:** zincir marketler adsız, renkli "MARKET" tabelası.

## Format: Bu Neden Var?
Örnek: `bu-neden-var/ornek_ucak_cami.mp4` (Uçak camındaki delik).
- **Kalıp:** nesne + soru → yaygın yanlış inanış ("Çoğu insan ... sanır") → "Değil." → katman katman açıklama
  (kesit, oklar, basınç) → ilk kareye dönüş → çağrı ("Bir sonraki uçuşunda bak. Yanındakine de göster.").
- **Çizim dili:** düz vektör (flat), yumuşak gölgeli gerçekçi nesne. Krem/bej (`#efe9dc`) nesne sahnesi ↔ koyu petrol yeşili
  (`#0f3b3d`) diyagram sahnesi. Vurgu rengi neon sarı-yeşil (`#d7f25a`), hata/yük kırmızı (`#e05a3a`).
  Kesit diyagramı: dikey çizgiler katmanlar, oklar basınç, parçacıklar havada süzülür, halka ile hedef gösterme.
- **Sabit öğe:** sol üstte koyu rozet "Bu Neden Var?" (soru işareti neon).
- **Etiketler:** küçük koyu/neon yuvarlatılmış rozetler ("Orta cam", "Dış cam", "Yük burada").
- **Altyazı:** koyu yarı saydam kutu içinde 2 satır, sade sans-serif (Inter), vurgulu kelime neon zeminde.
- **Kamera:** nesneye yaklaşır, içine girer (kesite geçiş), sonda geri çıkar; insan eli sonda deliği gösterir.

## Format: Gerçek Olay
Örnek: `gercek-olay/ornek_99_telefon.mp4` (99 telefonla sahte trafik).
- **Kalıp:** tuhaf sonuç ("Bu adam el arabasıyla trafik yarattı") → kim, nerede, ne zaman ("2020'de Berlin'de ...") →
  "Nasıl mı?" → mekanizma (veri nereden gelir) → tek cümle ders ("Harita yolu görmüyor, telefonları görüyor") → "Bunu bilmeyen arkadaşına gönder."
- **Çizim dili:** düşük poligonlu 3B şehir hissi: gri bloklar, yuvarlak gri ağaçlar, koyu asfalt, beyaz şerit çizgileri;
  trafik renkleri yeşil `#1fa463` / turuncu `#f0a020` / kırmızı `#e8492c`; veri noktaları mavi `#2f6fe4` daireler.
  Üstten harita görünümü ↔ 3B sokak görünümü arasında geçiş.
- **Bilgi öğeleri:** daktilo (monospace) küçük etiket balonları ("Berlin, 2020", "yürüme hızı", "temsili"),
  sağ üstte sayaç kutusu ("92 telefon"), sol altta hız göstergesi ("62 km/s"). Sonda veri noktaları büyük rakamı oluşturur (99).
- **Sabit öğe:** sol üstte küçük rozet (seri adı). Kurgusal/temsilî sahnelerde sağ üstte "temsili" etiketi.
- **Altyazı:** koyu yarı saydam kutu, beyaz kalın sans-serif, vurgulu kelime mavi.

## Format: Sen Karar Ver
Örnek: `sen-karar-ver/ornek_gece_3.mp4` (Gece 3'te gelen telefon).
- **Kalıp:** "Sen" dili ("Gece 3. Telefonun çalıyor. Arayan, ortağın.") → gerilim adım adım yükselir (sayaçlar) →
  ters köşe → iki seçenek (A / B kartları) → "Yoruma A ya da B yaz. Çoğunluk ne derse 2. bölüm öyle devam edecek."
- **Çizim dili:** gece, koyu lacivert-mor zemin, yağmur, sokak lambası spot ışığı, kırmızı/yeşil bokeh ışıklar.
  Karakterler: kalın siyah konturlu, büyük yuvarlak beyaz kafa, iri ifadeli göz-kaş, takım elbise (yeşil `#2fa98c`).
  Yakın plan nesneler: telefon ekranı (arayan, bakiye düşüşü, grafik), uçak bileti, kapı, para destesi.
- **HUD (sol üst):** "1. BÖLÜM" kırmızı etiket + saat (03:00 → 05:14 ilerler), STRES çubuğu dolar, KASA rakamı düşer.
- **Yazı:** dev BÜYÜK HARF kalın altyazı (sarı, vurgu kırmızı/beyaz), ses efekti yazıları eğik ("TAK! TAK!"),
  konuşma kutusu ("KİMSEYE SÖYLEME.").
- **Son:** "SENİN KARARIN." başlığı, A ve B kartları sırayla yanar, karakterin düşünce balonunda seçenek simgesi.

## Format: Nesnenin Hayatı
Örnek: `nesnenin-hayati/ornek_tisort_kot.mp4` (Tişört ve kot; ilk deneme). Kod: `src/kombin/Video.tsx`.
- **Kalıp (Bu neden var? + Gerçek olay):** bugünkü sıradan nesne → "aslında ..." → nesnenin içine girilir (zoom) →
  her yüzyıl ayrı mekân, tek dünyada yan yana → dönüm noktası ("Nasıl mı değişti?") → ilk kareye dönüş → ders → soru.
- **Çizim dili:** düz, canlı renkli vektör (kalın siyah kontur), Inter Black başlıklar, büyük harf 3'er kelimelik altyazı.
- **Not:** ilk denemedir; dilenirse Kâğıt Masal diliyle de yapılır.

## Format: Masal Bebek 3B
Referans: `masal-bebek-3b/referans_shoof14_semsiyeli_kiz.mp4` (başka üreticinin videosu; yalnız üslup referansı, yayınlanmaz).
**Bu format kodla çizilmez; yapay zekâ görsel + video üretimiyle yapılır (ücretli kredi).**
- **Görünüm:** keçe/kil bebek (stop-motion hissi): büyük yuvarlak baş, pembe yanak, ince bacak, kumaş dokulu kıyafet, el yapımı
  doku. Mekân: yağmurlu, Arnavut kaldırımlı, sıcak renkli taş evler, ıslak zeminde yansıma, sokak feneri; uçuşan yapraklar
  (kırmızı gelincik) ve tek bir renkli nesne (puantiyeli kırmızı şemsiye) atmosferi taşır. Mavi-gri gökyüzü, sıcak ışık.
- **Anlatım:** az söz ya da hiç; duygu yüz ifadesi, beden dili ve müzikle. Yavaş, masalsı kamera (hafif takip, yumuşak yaklaşma).
- **Üretim:** (1) karakter kartı görseli (aynı karakter her sahnede: saç, göz, kıyafet sabit), (2) her sahne için 9:16 ana kare
  (karakter kartı referans), (3) her ana kareden 4–6 sn görselden-video, (4) kurgu + ses + altyazı + kodla üretilen müzik.
  Topview: görsel Nano Banana Pro 2K ≈0,8 kredi; video Seedance 2.0 Fast / Kling 3.0 Turbo 720p 5 sn ≈4 kredi,
  Seedance 2.5 ≈7,5 kredi. 8 sahnelik 40 sn video ≈40 kredi (+ yeniden üretimler). Önce ücretsiz havuz kontrol edilir,
  harcama önce sunulur. Görsellerde "Temsili illüstrasyon (yapay zekâ)", platformda "sentetik içerik" işaretlenir.

## Format: Sade Masal Resmi
Referans: `sade-masal-resmi/referans_shoof14_karahindiba.mp4` (başka üreticinin videosu; yalnız üslup referansı).
**Yapay zekâ görsel + video üretimi (ücretli).**
- **Görünüm:** guaj/pastel boya hissinde 2B resimli kitap çizimi; düz gri-bej fon, tek renk zemin şeridi (hardal), tek karakter
  (abartılı saç, tek renk palto, çizgili çorap), tek nesne (karahindiba). Boşluk bol, ayrıntı az.
- **Kalıp:** tek nesne → küçük eylem → beklenmedik büyüme/dönüşüm (tohum → tarla) → coşku → başa dönüş (döngü). Yazısız.
- **Ne zaman:** sevgi, umut, sabır gibi tek duygulu kısa hikâyeler; Pumpkin serisinin "sessiz bölümleri".
- **Üretim:** Masal Bebek 3B ile aynı adımlar; fon sade olduğu için ana kare tutarlılığı daha kolay.

## Format: Harita Yolculuğu (türetilmiş)
Gerçek Olay + Antik Stüdyo harita kuralı (Wascemal tarzı) birleşimi.
- **Kalıp:** şaşırtıcı ölçü ("40 günde 1.200 km yürüdüler") → başlangıç noktası, yıl → rota adım adım çizilir →
  engel (dağ, nehir, kış) → varış ve sonuç → bugünle bağ → soru.
- **Çizim dili:** üstten harita; parşömen zemin (`#efe2c4`), yarı saydam ülke dolguları, kesik çizgili animasyonlu rota,
  tarafları gösteren bayrak renkli yuvarlak rozetler, gün/km sayacı (sağ üst, Gerçek Olay sayaç kutusu gibi),
  yıl etiketi daktilo yazısı. Önemli anda haritadan sahneye iner (Kâğıt Masal çubuk karakterleriyle küçük sahne).
- **Kaynak:** sınırlar Natural Earth (kamu malı), uydu gerekirse Sentinel-2 (CC BY 4.0, atıf sağ altta).

## Format: Eskiden / Şimdi (türetilmiş)
- **Kalıp:** "Eskiden X böyleydi" → ekran ikiye bölünür → satır satır karşılaştırma (aynı nesne iki dönemde) →
  ters köşe (bir şey hiç değişmemiş) → iki yarı birleşir → soru.
- **Çizim dili:** sol yarı Kâğıt Masal (sepya, titrek mürekkep), sağ yarı düz canlı vektör; ortada titrek dikey çizgi.
  Aynı karakter iki yarıda farklı kıyafetle. Sayaçlar iki yarının üstünde (fiyat, süre, sayı).

## Format: Sayaç Yarışı (türetilmiş)
Keskin balta'daki sayaç anının tüm videoya yayılmış hâli.
- **Kalıp:** iki taraf, tek iddia → kural → iki sayaç yan yana ilerler (biri hızla, biri yavaş) → beklenmedik sonuç →
  sırrın açıklanması (düşünce balonu) → tek cümle ders → "Sen hangisisin?".
- **Çizim dili:** Kâğıt Masal; sayaçlar büyük el yazısı rakam, kazananın rakamı kırmızıya döner, "!" ve "?" el yazısı.

## Format: POV Tarih (türetilmiş)
Sen Karar Ver dili + Antik Stüdyo tarih içeriği.
- **Kalıp:** "Yıl 1683. Viyana önlerindesin." → saat saat gerilim (HUD: yıl/saat, moral, erzak) → tarihî gerçek bilgi
  (kaynaklı) → karar anı (A/B) → gerçekte ne olduğu bir sonraki bölümde ya da sonda açıklanır.
- **Çizim dili:** Sen Karar Ver (koyu zemin, kalın konturlu yuvarlak kafalar, HUD, dev büyük harf yazı); renkler döneme göre
  (toprak, kırmızı, altın). Şiddet gösterilmez, ima edilir. Dönem kıyafeti ve silahları doğru çizilir.

## Müzik ve duygu geçişleri (bütün formatlar)
Örnek: `kagit-arayis/ornek_pumpkin_2_dedikodu.mp4`, üreteç `sunucu/sosyal/animasyon/muzik/dedikodu.py`.
- Müzik kodla sentezlenir (sample/kayıt yok): telif ve lisans sorunu olmaz, para kazanmaya uygundur.
- Zamanlar kelime zamanlarından gelir; metin değişince müzik kendiliğinden hizalanır.
- Duygu haritası satır satır çıkarılır: merak/sinsilik → pizzicato; sakinlik → sıcak katman; dönüm cümlesi → tek vuruş ve
  sessizlik; gerilim → alçak uğultu, saat tiki, hızlanan kalp atışı, yükselen çello; itiraf/duygusal an → müzik kutusu,
  minörden majöre; çözülme → sıcak majör; mizah → zıplayan notalar ve komik iniş; son soru → çözülmeyen akor.
- Konuşurken müzik ~%45'e iner (ducking); son karışım -16 LUFS, tepe -1.5 dB.
- Görüntü tonu müzikle birlikte değişir: gerilimde soğuk ve koyu katman, çözülmede sıcak ve aydınlık katman; dönüm cümlesinde
  müzikteki vuruşla kısa kamera itişi.

## Üretim paketi (her animasyon için)
Yazar şunları verir: (1) `metin.txt` satırları: her satır bir cümle grubu, ton yalnız değişeceği yerde `[...]` İngilizce,
ekranda farklı okunan sözcük `gösterim|okunuş` (sayılar yazıyla okunur), 70–100 kelime; (2) sahne planı tablosu:
satır → ekranda ne var (tek fikir, görüntü konudan çıkar, sahneler nesneyle bağlanır); (3) karakter ve mekân listesi;
(4) kaynaklar; (5) ses: ElevenLabs Ses D (klon) ya da konuya uygun ses; müzik yalnız lisanslı.
Kodlama ve kare kontrolü Claude Code ile yapılır (rehberdeki "Kontrol" listesi), 300 karelik parçalarla işlenir.
