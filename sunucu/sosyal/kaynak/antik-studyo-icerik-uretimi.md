---
name: antik-studyo-icerik-uretimi
description: Antik Stüdyo / Ancient Studio / Estudio Antiguo için her video (gündem+tarih, tarihi magazin, Tarihin Patileri, spor/inanç+tarih): konu, metin, ses, görsel, kurgu, yayın. Tamamı sunucuda yapılır.
---

# Antik Stüdyo içerik üretimi

Antik Stüdyo bağımsız bir sosyal medya içerik üreticisidir. CutkodA ve Aksaray Enerji ile karıştırılmaz: sunucuyu paylaşır, hesapları paylaşmaz.

Kullanıcı yazılımcı değil. İşi uçtan uca Claude yapar, kullanıcı yalnız onay verir. Uzun işlerde kısa ara durum mesajı verilir.

Kanal analizi, konu seçimi ve iyileştirme Claude'un işidir. Kullanıcıya yapılacaklar listesi verilmez, takip ettirilmez.

## Kalıcı kurallar

1. **Her şey sunucuda yapılır.** Kullanıcının bilgisayarına program kurulmaz, orada iş yaptırılmaz. "Bilgisayarı aç", "tarayıcıyı aç", "dosya sürükle", "bağla" denmez. Yerel klasör (AntikStudyo_Claude) yalnız eski arşivdir.
2. **Hesaplar ayrıdır.** Kanallar arabas400.mrc@gmail.com hesabındadır. ekinci.omer'e ya da CutkodA hesaplarına hiçbir şey bağlanmaz. Bir kanalın sorunu o kanalın kendi hesabından çözülür.
3. **Önce güvenlik.**
   - Telif riski olan hiçbir şey kullanılmaz: kulüp arması ya da logosu, maç görüntüsü, basın veya yayıncı fotoğrafı, başka hesapların logosu.
   - Müzik yalnız lisansı açık kaynaktan alınır ve atıf yapılır.
   - Veri kaybı olmaz: her video, üretim paketiyle birlikte arşivlenir.
4. **Maliyet en düşük tutulur.** Önce ücretsiz havuz ve kampanyalar kullanılır. Anthropic API kredisi alınmaz. Sunucu ve GitHub Actions'ın ücretsiz çalıştırıcıları kullanılır.
5. **Oturumlar kalıcıdır.** Sunucu tarayıcısındaki (ck-tarayici) YouTube girişi bir kez yapılır, kullanıcıdan tekrar istenmez.
6. **Bağlantı sorulmaz.** Kullanıcı "yap" dediyse yapılır; nasıl bağlanılacağı sohbette sorulmaz.

## Kanallar

- **Antik Stüdyo (TR):** youtube.com/@antikstudyo, kanal kimliği UC77LyY3gqWmBNAKp2lbsGBg.
  - TikTok hesabı da @antikstudyo.
  - Hesap kısıtlı göründüğü için TikTok'taki otomatik işlemler durduruldu. TikTok paylaşımını kullanıcı telefondan yapar.
- **Ancient Studio (EN):** Aynı Google hesabında ikinci kanal. Konular Türkiye ölçeğiyle değil, dünya ya da hedef ülke gündemine göre seçilir.
- **Estudio Antiguo (ES):** @estudioantiguo, aynı hesapta marka kanalı. İçerik İspanya'ya özgü açı ve örneklerle hazırlanır; tasarım "pro" seviyede olmalı, standart görünmemeli.
- **Gelir modeli:** Hedef ülkeler YouTube gelirinin en yüksek olduğu yerlere göre seçilir. Konular ülkeler arasında taşınabilir olmalı (İspanya, İtalya, Fransa neye değer veriyor).

## Formatlar

- **Gündem + Tarih:** Gündemdeki olayla aynı yerden ya da aynı konudan tarihî karşılık anlatılır. Siyasi ayrıntıya girilmez.
- **Tarihi Magazin / Bizarre History:** Dünya tarihinden az bilinen, şaşırtıcı bilgiler. Örnekler: fareli peruk, tenya diyeti, kurşunlu makyaj, gladyatör teri. Geniş kitleye hitap eder.
- **Tarihin Patileri:**
  - Modern, düz 2D illüstrasyon; seslendirme "destek_teengirl" sesiyle.
  - Gerçekçilik için gerçek dönem gazete kupürleri ve arşiv öğeleri eklenir.
  - EN kanalında da 17:00'de yayınlanır.
  - Her bölüm bir sonrakinin sorusuyla biter, soru sonraki bölümde cevaplanır.
  - Yayın zamanını kullanıcı söyler.
- **Spor + Tarih:**
  - Dört büyük kulüp serisi (Beşiktaş, Fenerbahçe, Galatasaray, Trabzonspor): kuruluş, kupalar, az bilinen bilgiler.
  - Paylaşım saati kulübün sembolik sayısına göre seçilir (1903 → 19:03).
  - Maç öncesi Short'lar, o haftanın rakibiyle ortak tarihten kurulur.
  - Ağır yenilgiler ve skorlar vurgulanmaz; "X, Y'yi yendi" denip geçilir.
  - Güncel maç içeriği yalnız YZ uyarlamasıdır; gerçek maç görüntüsü kullanılmaz.
- **İnanç + Tarih:** Nazar bölümüyle başladı.
- **Değerlendirilen formatlar:** magazin–tarih, "biliyor musunuz" tarih bilgileri, POV tarih.
- **Askıda:** "Tarih bugün yaşansaydı" (modern uyarlama mizah) serisi.
- **Çeşitlilik:** Videolar tek seri gibi görünmemeli. Beğenilen formatların üzerine kurularak stil biraz çeşitlendirilir.
- **Denemeler:** Aralarda Claude'un önerdiği konulardan 1–2 video yayınlanır ve sonuçları ölçülür.

## Konu seçimi

- Çok bilinen konular dikkat çekmediği için kullanılmaz (örnek: 1453 fethi POV). Az bilinen, şaşırtıcı açı seçilir.
- Hedef izlenmeyi artırmaktır. Hangi konunun, sesin, görselin ve kanca anının dikkat çektiğine Yayın Takibi verisinden bakılır. En çok izlenenin özellikleri sonraki işte uygulanır.
- Karanlık, kasvetli görsel kullanılmaz; ilk kez izleyeni tutacak canlı görseller seçilir.

## Metin

- **Kanal mottosu:** Doğru bilgi, kısa ve net. İzleyici bilgiye boğulmaz. Düz, açık cümleler ve akıcı geçişler kullanılır; zorlama, sıkıcı ya da kopuk ifade olmaz.
- **Kanca:** İlk 3 saniyede bir rakam ya da şaşırtıcı bir soru gelir.
- **Hikâye:** Uç açık kalmaz: kim, neden, ne oldu, sonuç ne.
- **Doğruluk:**
  - Yalnız doğrulanmış veri kullanılır.
  - Tartışmalı konu "kaynaklar şunu söylüyor" diye anlatılır; efsane anılır ve çürütülür.
  - Yayından önce her tarih ve rakam ikinci kez kontrol edilir.
- **Şiddet:** Gösterilmez, ima edilir.
- **Short uzunluğu:** 30–60 saniye, yaklaşık 25–30 kısa cümle.
- **Short sonu:** "Tamamı kanalda" ya da bir sonraki bölümün sorusu.
- **EN ve ES metinleri:** Çeviri değil uyarlamadır; her biri kendi ülkesinin açısı ve örnekleriyle yazılır.

## Ses (ElevenLabs, sunucudan)

- API anahtarı sunucudadır (`/opt/cutkoda/motor.env`, `ELEVENLABS_API_KEY`) ve asla ekrana yazdırılmaz.
- **Betik:** `sunucu/islem/el_ses.sh` (cutkoda/cutkoda deposu).
  - Metin `sunucu/islem/ses_metin/<ad>_<dil>.txt` dosyasına yazılır; betik sesi mp3 olarak üretir.
  - Yalnız belirli bir önekin seslendirilmesi için `SADECE` dosyasına o önek yazılır.
  - Betik `islem.yml` iş akışıyla çalıştırılır; çıktı `rapor` dalından alınır.
- **Ses D (varsayılan):** Kullanıcının klon sesi.
  - voice_id `u2ZPme1hNaHzZRbw9S82`; model `eleven_v4`, olmazsa `eleven_v3`.
  - stability 0.3, similarity_boost 0.85, speed 1.05.
  - Metnin başına `[dramatic news announcer, punchy]` etiketi eklenir. Tarz: Show Haber dış sesi.
- **Konuya göre ton:**
  - Duygusal konularda `[warm, heartfelt documentary narrator]` etiketi, stability 0.45.
  - Merak konularında `[intrigued documentary narrator, building suspense]` etiketi, stability 0.4.
- **Test:** Short'ları kullanıcının "benim2" klonuyla seslendirmenin izlenmeyi artırıp artırmadığı test ediliyor; sonuç Yayın Takibi'nden okunur.
- Klon ses API'den oluşturulamaz; kullanıcı ElevenLabs sitesinde oluşturur.

## Kelime zamanları

- Ses dosyası `medya` dalına konur. Ardından `hizala.yml` iş akışı çalışır (faster-whisper, av 13.1.0) ve kelime zamanlarını `<ad>.mp3.json` olarak yazar.
- Sahne geçişleri ve altyazı bu zamanlara bağlanır. JSON yoksa zamanlar orantılı dağıtılır; bu kaba bir yöntemdir.

## Görsel

- **YZ illüstrasyonu:** Topview `topview_generate_image`.
  - Önce `topview_get_mcp_free_quota` ile ücretsiz havuz kontrol edilir.
  - Aynı anda en fazla 4 görev gönderilir.
  - Görseller dikey (9:16) üretilir; üst 1/3 başlık için boş bırakılır.
  - İsteme "No text, no letters, no logos, no watermark" yazılır; yazıları kod ekler.
- **Görseli sunucuya alma:** Topview adresi sunucudan açılmaz. `medya_al.yml` iş akışı (girdiler: url, ad) görseli `medya` dalına işler.
- **Stiller:**
  - Vintage poster / gouache (Perde Tarih tarzı)
  - Modern düz 2D (Patiler)
  - Canlı, parlak renkler. Pastel tonlar zayıf kalıyor (GS–Stuttgart örneği).
- **Dönem hatası kontrolü:** Her görsel döneme uygunluk için kontrol edilir. Örnek: 1925 sonrasına ait bir sahnede fes olmamalı.
- **Gerçek veri sahneleri:**
  - Uydu görüntüsü `uydu_al.yml` ile alınır. Girdiler: kutu (lon0,lat0,lon1,lat1) ve yakınlık z (7–9). Kaynak Sentinel-2 cloudless (EOX, CC BY 4.0) ya da NASA Blue Marble.
  - Sınırlar Natural Earth'ten alınır.
  - Harita tarzı Wascemal gibidir: yarı saydam ülke dolgusu, tarafları gösteren bayrak renkli hareketli yuvarlak rozetler, kesik çizgili animasyonlu rotalar.
- **Arşiv görseli:** Wikimedia Commons'tan, kamu malı ya da CC lisanslı.
- **Ekran etiketleri:** Kaynak ve lisans sağ alta yazılır. YZ görsellerine "Temsili illüstrasyon (yapay zekâ)" etiketi konur.

## Kurgu

- **Atmosferli Short motoru:** `medya/arac/stad.py cfg.json` (medya dalında). Çıktı 1080x1920, 30 fps.
  - cfg alanları: `ses`, `ses_mix`, `cikti`, `lang`, `kelimeler`, `sahneler[]`.
  - Her sahnede: `img`, `s`, `e`, `zoom [a,b]`, `pan`, `fx`, `duman_renk`, `parcacik`, `sars`, `baslik[]`.
  - `fx` seçenekleri: `isik`, `flood`, `duman`, `supur`, `parlama`. `parcacik` seçeneği: `kivilcim`.
  - `baslik[]` öğeleri: `t`, `y`, `boy`, `renk`, `d`.
  - Müzik karışımı `medya/arac/mix.py` ile yapılır.
  - Örnek yapılandırma: `medya/om/celtic3/cfg.json`.
- **OpenMontage (Remotion):** `kurgu_om.yml` iş akışı.
  - Girdiler: `is` (`medya/om/<is>` klasörü) ve `kompozisyon` (Explainer).
  - Klasördeki her `<ad>.json` dosyası bir video üretir; videolar `cikti/` altına yazılır.
  - Kullanıcı bu aracı başarılı buldu.
- **Hareket:**
  - Görseldeki öğeler canlandırılır: duman yükselir, ateş titrer, bayrak dalgalanır, su kayar.
  - Yavaş zoom ve pan kullanılır; yönü sahneden sahneye değişir.
- **Altyazı:**
  - Sarı, kalın, siyah konturlu, BÜYÜK HARF; 3 kelimelik gruplar halinde.
  - Türkçe İ/I harfleri doğru büyütülür.
  - Satıra sığmazsa yazı küçültülür.
  - En altta kanal adı yer alır.
- **Başlıklar:** Inter Black yazı tipi; anahtar kelime kırmızı ya da sarı. Tarih sahnelerinde Cinzel ve Alfa Slab kullanılır.
- **Render:**
  - Tam render'dan önce en dolu anlardan 3–4 kare tam boyda çizilip kontrol edilir: yazı taşması, rozet çakışması.
  - Tek render yapılır. Video, ffmpeg çıkış kodu 0 olduktan sonra asıl adına taşınır.
  - Kodlama: H.264 `-preset veryfast`, CRF 20, yuv420p, ses aac.
- **Arşiv:** Her videonun üretim paketi (görseller, metin, kelimeler.json, cfg) `medya` dalında `medya/<seri>/kod_paketi/<n>.<ad>/` altına yazılır. Hiçbir video yalnız geçici klasörde bırakılmaz.

## Yayın

- **Sunucu tarayıcısı (ck-tarayici):** Kalıcı profilli, YouTube girişi yapılmış Chrome. Uzaktan ekran: panel.cutkoda.com/tarayici (panel girişiyle).
- **Yükleme robotu:** `sunucu/tarayici/yt_yukle.py`.
  - İş dosyasındaki alanlar: `kanal` (kanal kimliği), `kanal_adi`, `video`, `baslik`, `aciklama`, `kapak`, `gorunurluk`, `cocuk: false`, `sentetik: true`.
  - Kanal adı tutmazsa robot yüklemeyi reddeder.
- **Zamanlı yayın:** `kuyruk.py`.
  - İş JSON'u ck-tarayici içindeki `/is/kuyruk/` klasörüne konur. `zaman` alanı ISO biçiminde ve +03:00 dilimiyle yazılır.
  - Kuyruk dakikada bir kontrol edilir.
  - Sonuç `/is/bitti/` ve `/is/sonuc/` klasörlerine ekran görüntüleriyle birlikte yazılır.
- **Onay:** Yayınlama ve planlama kullanıcı onayıyla yapılır. Kullanıcı "zamanını ben söylerim" dediyse beklenir.
- **Saatler (GMT+3):**
  - Gündem + Tarih: 19:00
  - Tarihi Magazin: TR 20:00, EN 21:30
  - Patiler EN: 17:00
  - Kulüp içerikleri: kulübün sembolik saati
- **Platform etiketleri:**
  - YouTube'da "altered or synthetic content" EVET işaretlenir (klon ses ve YZ illüstrasyon kullanıldığı için).
  - Açıklamaya klon ses ve YZ notu, kaynaklar ve müzik atfı eklenir.
  - Özgün metin, araştırma ve kurgu şarttır (tekrarlayan içerik kuralı).
- **Yeni sürüm:** Bir videonun yeni sürümü yayına çıkınca eski sürüm Özel'e alınır, silinmez.

## Takip

- **Yayın Takibi:** Portal Özel Alan'da, `/api/yayin-takip` ucundan beslenir (YouTube API ya da RSS, 2 dakika önbellek).
  - Claude'un ve Antigravity'nin yayınladığı her şeyi gösterir.
  - Her yükleme ya da planlamadan sonra güncel olduğu doğrulanır.
  - Sunucuda Claude token'ı harcamadan çalışır.
- **Ortak durum dosyası:** `medya/tarihi_magazin/kod_paketi/KANAL_RAPORU_VE_YAYIN_AKISI.md`.
- Antigravity'den gelen bilgi YouTube Studio ile karşılaştırılır; eskimiş satırlar düzeltilir.

## Üretim sırası (her video)

1. **Konu:** Formatı seç; gündemi ya da hedef ülkeyi ve dikkat verisini değerlendir; az bilinen bir açı bul.
2. **Araştırma:** En az iki kaynak kullan; tarih ve rakamları ikinci kez kontrol et.
3. **Metin:** Önce TR, ardından EN ve ES uyarlamaları.
4. **Ses:** `el_ses.sh`, ardından `hizala.yml`.
5. **Görseller:** Topview ile üret, `medya_al.yml` ile al. Uydu ya da harita gerekiyorsa `uydu_al.yml`. Dönem kontrolü yap.
6. **Kurgu:** `stad.py` ya da `kurgu_om.yml`; kareleri kontrol et, sonra tam render al.
7. **Arşiv:** Üretim paketini `medya` dalına yaz.
8. **Yayın metni:** Başlık (kanca ve ölçülü emoji), açıklama, etiketler, kaynaklar, YZ notu.
9. **Yayın:** Videoyu kullanıcıya gönder ve onay al. Yükleme kuyruğuna koy; Yayın Takibi'nde doğrula.

## Eksik ya da öğrenilen bilgi

Yeni bir kısıt ya da çözüm öğrenildiğinde bu dosyanın güncellenmesi önerilir. Bu yetenek belirli bir Claude projesinin adına bağlı değildir.
