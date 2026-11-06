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
- **Özel gün takvimi önce gelir.** Her haftalık plan, önümüzdeki 3 haftanın özel günleri taranarak başlar: TR resmî ve anma günleri (Öğretmenler Günü 24 Kasım gibi), hedef ülkelerin bayramları (Şükran Günü, Black Friday), dünya günleri. Özel gün videosu planda öncelikli slota konur ve en az 4 gün önce hazır olur. Anma günlerinde yayın yapılmaz; tablo otomasyonu da o gün durdurulur.
- **Hazır stok kontrolü.** Plan yazılmadan önce Studio'daki planlı videolar ve `KANAL_RAPORU_VE_YAYIN_AKISI.md` stoğu okunur; yeni videolar onlarla çakışmayacak şekilde yerleştirilir. TR kanalına günde en fazla 3 video düşer.

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

## Bağlantılar (nerede ne bağlı, nasıl kullanılır)

Hiçbir şifre, anahtar ya da token sohbete, depoya veya belgeye düz metin yazılmaz. Depoya giden her sır sunucunun açık anahtarıyla şifrelenir; çözmeyi yalnız sunucu yapar.

### Sunucular ve depolar

| Ne | Nerede | Ne için |
|---|---|---|
| CutkodA sunucusu | Namecheap VPS, 159.198.76.80 | Panel (ck-panel), sunucu tarayıcısı (ck-tarayici), ses, kurgu, yayın |
| `cutkoda/cutkoda` deposu | GitHub, özel | Betikler, iş akışları. Dallar: `main` (kod), `medya` (görsel, ses, video, üretim paketleri), `rapor` (betik çıktıları) |
| `ekinciomer-ai/aesun` deposu | GitHub, özel | YouTube resmi API bağlantısı (`sunucu_islem.yml` → `sunucu/islem_<ad>.sh`) |

- Sunucuya doğrudan SSH ile girilmez. Her iş, depodaki bir betiğin GitHub Actions üzerinden çalıştırılmasıyla yapılır:
  - `islem.yml` (girdi `islem`): `sunucu/islem/<ad>.sh` sunucuda root olarak çalışır. Betiğin `/root/rapor/` altına yazdıkları `rapor` dalına `<ad>/` olarak düşer. `NOT:` satırları iş günlüğünde görünür.
  - `tampon.yml` (girdi `deneme`): dış yazılımlar önce `sunucu/tampon/<ad>.sh` ile ayrı kapsayıcıda denenir.
- Panelin içinde kod çalıştırmak: betikte `docker exec -i ck-panel python - <<'PY' ... PY` (örnek `sunucu/islem/oto_durum.sh`).
- **Claude'un bu işleri yapabilmesi için oturuma `cutkoda/cutkoda` deposunun yazma (push) izni eklenmiş olmalı** (YouTube API işleri için `ekinciomer-ai/aesun` da). Yalnız okuma izni varsa betik eklenemez, iş akışı tetiklenemez; bu durumda kullanıcıya bir cümleyle söylenir ve izin istenir.

### İş akışları (cutkoda/cutkoda)

| İş akışı | Girdi | Yaptığı |
|---|---|---|
| `medya_al.yml` | url, ad | Topview görselini/videosunu `medya` dalına alır |
| `hizala.yml` | ad, dil | Sesin kelime zamanlarını çıkarır (`<ad>.mp3.json`) |
| `uydu_al.yml` | ad, kutu, z | Sentinel-2 uydu görüntüsü kırpar |
| `kurgu_om.yml` | is, kompozisyon | OpenMontage (Remotion) ile dikey video üretir |
| `islem.yml` | islem | Sunucuda betik çalıştırır (ses: `el_ses`, yayın: `antik_yayin` vb.) |
| `tampon.yml` | deneme | Tampon bölgede deneme |

Tetikleme: `gh api -X POST repos/cutkoda/cutkoda/actions/workflows/<dosya>/dispatches -f ref=main -f 'inputs[<girdi>]=<değer>'`, ardından çalışma bitene kadar beklenir ve sonuç `rapor` ya da `medya` dalından okunur.

### YouTube

Üç bağlantı var; her birinin işi ayrı.

| Bağlantı | Nerede | Ne için | Kısıt |
|---|---|---|---|
| **Sunucu tarayıcısı (ck-tarayici)** | Kalıcı profilli Chrome, YouTube girişi yapılmış. Uzaktan ekran: panel.cutkoda.com/tarayici | **Asıl yükleme yolu.** `yt_yukle.py` Studio'dan yükler; başlık, açıklama, kapak, görünürlük, "çocuklara özel değil", "değiştirilmiş/sentetik içerik" işaretlerini doldurur | Kanal adı tutmazsa yüklemeyi reddeder. Google girişi düşerse kullanıcıdan bir kez panel.cutkoda.com/tarayici üzerinden giriş istenir |
| **Resmi API (Kanal Yonetim)** | Google Cloud projesi `ancient-episode-513619-r1`; istemci `/opt/aesun/youtube/istemci.json`, kanal anahtarları `/opt/aesun/youtube/kanallar/<kanal_id>.json` (yalnız root) | İstatistik, Analytics, gelir raporu, kapak | Proje denetimden geçene kadar API ile yüklenen video yalnız **özel** olur. Bu yüzden yayın tarayıcı yolundan yapılır |
| **Panel bağlantısı** | ck-panel, `p_hesap` tablosu (youtube, aktif) | Yayın Takibi (portal Özel Alan, `/api/yayin-takip`): yayında + planlı + gizli videolar, izlenme, beğeni | Bağlantı düşerse durum `yeniden_bagla` olur, RSS'e geçer (yalnız yayındakiler) |

**Kanallar:**

| Kanal | Kimlik | Durum |
|---|---|---|
| Antik Stüdyo (TR) | `UC77LyY3gqWmBNAKp2lbsGBg` | Üç bağlantıda da bağlı |
| Ancient Studio (EN) | `UCFLJUlhUSgjcLbp9ad_t9PQ` | Üç bağlantıda da bağlı |
| Estudio Antiguo (ES) | henüz yazılmadı | Aynı Google hesabında; API ve panel bağlantısı yapılacak; profil resmi ve kapak eksik |

**Yeni kanalı resmi API'ye bağlama (bir kez, kullanıcı telefondan yapabilir):**
1. Claude izin bağlantısını kullanıcıya verir (Kanal Yonetim istemcisi, yönlendirme `http://127.0.0.1:8765`, izinler: youtube, youtube.upload, yt-analytics.readonly, yt-analytics-monetary.readonly).
2. Kullanıcı ilgili kanalı seçer; "Google bu uygulamayı doğrulamadı" uyarısında Gelişmiş → "Kanal Yonetim'e git".
3. Son sayfa "Bu siteye ulaşılamıyor" der; bu normaldir. Kullanıcı adres çubuğunu kopyalayıp gönderir.
4. Claude `code=` değerini sunucunun açık anahtarıyla şifreler, `sunucu/yt/kod.sifreli` olarak `aesun` deposuna koyar, `yt_kur` işlemini çalıştırır, sonra şifreli kodu depodan siler. Kod tek kullanımlıktır, ~10 dakikada geçersiz olur.
5. Yeni kanalın kimliği bu dosyadaki tabloya ve `panel/app/yayin_takip.py` içindeki `KANALLAR` listesine eklenir.

Bağlantıyı geri almak: myaccount.google.com/permissions → "Kanal Yonetim" kaldırılır.

### Yükleme ve zamanlı yayın (YouTube)

1. Video ve kapak sunucuya alınır (`medya` dalından ya da üretim çıktısından).
2. İş dosyası yazılır: `{kanal, kanal_adi, video, baslik, aciklama, kapak, gorunurluk: "public", cocuk: false, sentetik: true, zaman: "2026-11-07T19:00:00+03:00"}`.
3. İş dosyası bir `islem` betiğiyle ck-tarayici içindeki `/is/kuyruk/` klasörüne kopyalanır.
4. `kuyruk.py` dakikada bir bakar; `zaman` gelince videoyu yükler ve **o anda yayınlar**. YouTube'un kendi zamanlama özelliği kullanılmaz; yayın saati kuyruktan gelir.
5. Sonuç `/is/bitti/` ve `/is/sonuc/<ad>.json` (durum, video kimliği, bağlantı) ile ekran görüntülerine yazılır.
6. Yayın Takibi'nde videonun göründüğü doğrulanır, bağlantı kullanıcıya verilir.

Kuyruğa koymadan önce kullanıcı onayı alınır. Zamanı değiştirmek için iş dosyası kuyrukta güncellenir; yayınlanmış video için yeni sürüm yüklenir, eskisi Özel'e alınır, silinmez.

### TikTok

- @antikstudyo hesabı kısıtlı göründüğü için otomatik işlemler durduruldu. **TikTok paylaşımını kullanıcı telefondan yapar.** Claude videoyu, açıklamayı ve etiketleri hazır verir.
- Ancient Studio ve Estudio Antiguo'nun TikTok hesapları henüz açılmadı.
- CutkodA'nın TikTok geliştirici uygulaması (sandbox) CutkodA'ya aittir; Antik Stüdyo hesapları ona bağlanmaz.

### Instagram

- Antik Stüdyo için Instagram bağlantısı yok. Açılırsa yol: hesap Profesyonel'e (Üretici) çevrilir, bir Facebook Sayfasına bağlanır, sonra resmi API ile yetki verilir. Şifreyi kullanıcı girer.

### Ses ve görsel bağlantıları

- **ElevenLabs:** anahtar sunucuda (`/opt/cutkoda/motor.env`). Ses `el_ses.sh` ile `islem.yml` üzerinden üretilir (ayrıntı: Ses bölümü). Bilgisayardaki ElevenLabs bağlantısı kullanılmaz.
- **Topview:** sohbetteki Topview araçlarıyla üretilir; adres sunucudan açılmadığı için `medya_al.yml` ile alınır.
- **Wikimedia Commons:** tablo ve arşiv görselleri, kamu malı ya da CC lisanslı.

## Kararlaştırılmış işler (her seferinde böyle yapılır)

1. **Onay:** Konu ve metin Claude'un işidir. Yayınlama, planlama, video silme, Özel'e alma ve kanal ayarı kullanıcı onayıyla yapılır. Kullanıcı "zamanını ben söylerim" dediyse beklenir.
2. **Haftalık plan:** Her plan şu sırayla yazılır: (1) önümüzdeki 3 haftanın özel günleri, (2) Studio'daki planlı videolar ve kuyruktaki işler, (3) `KANAL_RAPORU_VE_YAYIN_AKISI.md` stoğu, (4) Yayın Takibi verisi, (5) yeni senaryolar. TR kanalına günde en fazla 3 video.
3. **Anma günleri:** 10 Kasım gibi günlerde hiçbir kanalda yayın yapılmaz, tablo otomasyonu da durur.
4. **Ölçüm:** Shorts için "izlendi / kaydırıldı" oranı ve ortalama izlenme yüzdesi, yayından 48 saat sonra. Karar yalnız en az 2 videosu olan formata verilir. Ses testi aynı format içinde çiftle yapılır.
5. **Derleme:** Her pazar haftanın en iyi Short'larından 8–10 dakikalık uzun video (izlenme saati için).
6. **Tablo serisi:** Her gün 18:00, Uğur sesi, telifi düşmüş tablolar (ayrıntı: `Tablo_Short_Uretim_Yetenegi.md`). Mevcut günlük görev bilgisayara bağlı; bu dosyadaki sunucu yoluna taşınır, yenisi çalıştığı doğrulanmadan eskisi kapatılmaz.
7. **Antigravity ile ortak çalışma:** Ortak durum dosyası `medya/tarihi_magazin/kod_paketi/KANAL_RAPORU_VE_YAYIN_AKISI.md`. Her yayından sonra güncellenir. Antigravity'ye verilen belgelerde sır olmaz.
8. **Gelir:** Para EN kanalından ve uzun videodan gelir; TR Shorts büyüme içindir. Konular gelirin yüksek olduğu ülkelere göre seçilir ve ülkeler arasında taşınabilir.
9. **Bilgisayar kullanılmaz:** Kullanıcının bilgisayarındaki klasör ve bağlantılar (AntikStudyo_Claude, elevensesdosyalari, bilgisayardaki ElevenLabs) yalnız eski arşivdir; yeni iş orada yapılmaz.

## Üretim sırası (her video)

1. **Konu:** Formatı seç; gündemi ya da hedef ülkeyi ve dikkat verisini değerlendir; az bilinen bir açı bul.
2. **Araştırma:** En az iki kaynak kullan; tarih ve rakamları ikinci kez kontrol et.
3. **Metin:** Önce TR, ardından EN ve ES uyarlamaları.
4. **Ses:** `el_ses.sh`, ardından `hizala.yml`.
5. **Görseller:** Topview ile üret, `medya_al.yml` ile al. Uydu ya da harita gerekiyorsa `uydu_al.yml`. Dönem kontrolü yap.
6. **Kurgu:** `stad.py` ya da `kurgu_om.yml`; kareleri kontrol et, sonra tam render al.
7. **Arşiv:** Üretim paketini `medya` dalına yaz.
8. **Yayın metni:** Başlık (kanca ve ölçülü emoji), açıklama, etiketler, kaynaklar, YZ notu.
9. **Yayın:** Videoyu kullanıcıya gönder ve onay al. ck-tarayici kuyruğuna koy (Yükleme ve zamanlı yayın bölümü); Yayın Takibi'nde doğrula.
10. **TikTok:** Videoyu ve açıklamayı kullanıcıya telefondan paylaşması için hazır ver.
11. **Kayıt:** `KANAL_RAPORU_VE_YAYIN_AKISI.md` dosyasını güncelle.

## Eksik ya da öğrenilen bilgi

Yeni bir kısıt ya da çözüm öğrenildiğinde bu dosyanın güncellenmesi önerilir. Bu yetenek belirli bir Claude projesinin adına bağlı değildir.
