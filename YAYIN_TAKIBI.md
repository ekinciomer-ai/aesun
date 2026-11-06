# Yayın Takibi — Claude ve Antigravity için kurallar

Portal → Özel Alan → **Yayın Takibi** (https://portal.aksarayenerji.net/yayin/) tek bir dosyadan beslenir:
`docs/yayin/yayin.json`. `main`'e push edilince portal otomatik yayınlanır (cpanel_yukle.yml).

## Ne zaman güncellenir
- Bir içerik **yüklendiğinde, planlandığında, yayına çıktığında, gizlendiğinde veya silindiğinde** — hemen.
- Her gün bir kez tüm kanallar taranır (YouTube Studio: Antik Stüdyo + Ancient Studio, TikTok Studio: @antikstudyo); durum ve izlenme sayıları yenilenir.

## Nasıl
1. `git pull` (başkası da yazıyor olabilir).
2. `kayitlar` dizisine ekle / mevcut kaydı güncelle. Kayıt anahtarı: YouTube'da `vid` (video kimliği), TikTok'ta `platform+tarih+saat+baslik`.
3. `guncelleme` alanını şimdiki zamanla (+03:00) yaz.
4. Commit mesajı: `Yayın takibi: <kısa not>`; push.

## Kayıt alanları
| alan | değer |
|---|---|
| platform | `YouTube` / `TikTok` / `Instagram` |
| kanal | `Antik Stüdyo`, `Ancient Studio`, `Antik Stüdyo (@antikstudyo)` … |
| dil | `TR` / `EN` |
| tur | `Short` / `Video` |
| seri | `Tablo Serisi`, `Tarihin Patileri`, `Gündem + Tarih` … |
| baslik | yayındaki başlık |
| durum | `Yayında` / `Planlı` / `Gizli` / `Taslak` / `Kaldırıldı` |
| tarih, saat | `YYYY-MM-DD`, `HH:MM` (İstanbul) |
| izlenme | sayı; bilinmiyorsa `null` |
| link, vid | YouTube: `https://youtube.com/shorts/<vid>` veya `https://youtu.be/<vid>` |
| ureten | **`Claude`** veya **`Antigravity`** — içeriği kim yükledi/planladıysa. Bilinmiyorsa `?` |
| not | isteğe bağlı kısa not |

Antigravity: kendi yüklediğin her içeriği `"ureten": "Antigravity"` ile ekle; listede `?` görünen ve senin yüklediğin kayıtları düzelt.
Şifre, token, oturum bilgisi bu dosyaya asla yazılmaz.

## Taslak Planlar ve Hazır Stok Kuralları
- Bilgisayarda render'ı tamamlanmış ancak henüz YouTube/TikTok'a yüklenmemiş videolar `"durum": "Taslak"`, hedef `tarih`/`saat` ve `"not": "HAZIR · Dosya: <dosya_adi.mp4>"` olarak tabloya eklenir.
- Henüz üretilmemiş sıradaki bölüm fikirleri (`Taslak Planlar`) `"durum": "Taslak"` ve `"not": "TASLAK PLAN · ..."` olarak tabloda tutulur; video üretildiğinde `"HAZIR"`, kanala yüklendiğinde `"Planlı"` veya `"Yayında"` olarak güncellenir.
- **KESİN KURAL:** Video dosya isimlerinde ve yayındaki başlıklarda `TR`, `EN`, `yt_TR`, `yt_EN` gibi dil/platform ekleri **kullanılmaz**.

## Yorumlar (otomatik, bilgisayar gerekmez)
- `yayin/guncelle.py`, GitHub Actions'ta 10 dakikada bir (saatlik başlatılan iş kendi içinde döner), `YT_API_KEY` ile kanalın BÜTÜN videolarındaki yorumları kanal bazında okur (tablodaki durumdan bağımsız) ve `yayin.json` → `yorumlar` dizisine yazar (`yanitlandi`: kanal yanıt verdi mi). Yorumlara başkalarının yazdığı cevaplar da `ust_id` ile gelir. KANALLAR listesinde olmayan kanallar (yeni kanal) tablodaki videolar üzerinden tek tek taranır; yeni kanalın kimliği bilinince KANALLAR'a eklenmeli. Şu an KANALLAR: Antik Stüdyo (TR), Ancient Studio (EN), Estudio Antiguo (ES, `UCTC_yS0lwl-owMuo5b4bNtQ`).
- Portal → Yayın Takibi üstünde "💬 Yorumlar" kutusu yanıt bekleyenleri gösterir. Yanıt GÖNDERİLMEZ; yanıt Ömer'in onayıyla verilir.
- `yorumlar` dizisini elle düzenleme; betik her çalışmada yeniden yazar.

## Yol haritası (BAĞLAYICI) — `docs/yayin/analiz.json`
Analiz ve karar işi otomatiktir; Ömer'e öneri listesi sunulmaz, takip işi verilmez.
- `yayin/analiz.py` her 30 dakikada (yayin_takip.yml) videoların ilk 48 saat izlenmesinden ve YouTube Analytics izlenme yüzdesinden
  kanal × seri kararı üretir: **ARTIR / SÜRDÜR / DENE / DEĞİŞTİR / DURDUR**, günlük Short kotası ve seri dağılımı (`plan`).
- `.github/workflows/yayin_yonet.yml` günde 2 kez (09:41, 21:41) sunucudaki resmi YouTube bağlantısıyla iki kanalın gerçek durumunu ve
  analitiğini `docs/yayin/analitik.json`'a yazar ve `GİZLE` eylemlerini uygular (yalnız tekrar eden kopya; asıl video herkese açık ve aynı
  süredeyse). Yapılan her işlem `docs/yayin/yonetim_kaydi.json`'a yazılır; işlem öncesi durum sunucuda yedeklenir.

**Üretim/planlama yapan HER ajan (Claude, Antigravity, CutkodA sunucusu) yeni içerik üretmeden ya da planlamadan önce:**
1. `docs/yayin/analiz.json` → `plan[kanal]`: günlük Short kotasını aşma, seri dağılımına uy.
2. `DURDUR` kararındaki seriden yeni içerik üretme/planlama; `ERTELE` eylemindeki planları kaldır, slota dağılımdaki ilk seriyi koy.
3. `DEĞİŞTİR` kararındaki seride kancayı ve konu seçimini değiştir; `en_iyi` listesindeki başlıkları örnek al.
4. `kurallar` listesindeki her maddeye uy. `KONTROL` eylemlerini tarayıcısı/bağlantısı olan ilk ajan çözer ve tabloya işler.
Eşikler kanalın kendi en iyi videolarına göre hesaplanır; elle değiştirilmez, gerekiyorsa `yayin/analiz.py` güncellenir.

## YouTube yükleme kuyruğu (bilgisayar gerekmez)
Video yüklemek için: `sunucu/yt_kuyruk/<KOD>.mp4` + `sunucu/yt_kuyruk/<KOD>.json` ekle ve push et
(json alanları: `kod, kanal (TR|EN), baslik, aciklama, etiketler, kategori, publishAt (+03:00), sentetik, seri`).
`yt_kuyruk.yml` sunucudaki resmi bağlantıyla yükler ve `publishAt` saatine planlar; aynı kod/başlık varsa yüklemez.
İş bitince json `tamam/` altına taşınır, mp4 depodan silinir, kayıt Yayın Takibi'ne "Planlı" yazılır. Planlamadan önce `analiz.json` kotasına uy.

## Telif ve marka kuralı (DEĞİŞMEZ, Ömer 4 Kas 2026)
Kulüp/marka armaları ve logoları, maç/TV görüntüsü, UEFA/FIFA logo ve marşları, hazır (lisanssız) müzik hiçbir videoda kullanılmaz.
Kulüp adları ve takım renkleri serbesttir. Görseller: kendi grafiğimiz, gerçek veri haritası, kamu malı/CC lisanslı ve künyeli görseller.

## Seslendirme (bilgisayar gerekmez)
Asıl ses: ElevenLabs, sunucudaki bağlantı (`/opt/cutkoda/motor.env`). Klon ses `u2ZPme1hNaHzZRbw9S82`, model `eleven_v3`, stability 0.5, similarity 0.9.
Kullanım: `sunucu/ses_kuyruk/<KOD>.json` (`kod, voice_id, model, dil, ayar, parcalar[{ad, metin}]`) push → `ses_kuyruk.yml` mp3'leri
`sunucu/ses_kuyruk/cikti/<KOD>__<ad>.mp3` olarak yazar. Sahne başına ayrı parça üret: sahne süreleri ses süresinden hesaplanır.
Yedek ses (ElevenLabs çalışmazsa): Piper `tr_TR-fahrettin-medium` (CC0), tampon bölgede. Klon seste YouTube "sentetik içerik" = EVET.
Eski sürümün yerine yeni yükleme: kuyruk json'una `"yerine": "<eski vid>"` → eski sürümün planı kaldırılır, Gizli kalır (silme yok).

## Girişler ve bekleyen işler (kural, Ömer 5 Kas 2026)
Sistem hiçbir adımda Ömer'den şifre istemez ve giriş eksikliğinde durmaz: giriş gerektiren iş kuyrukta bekler
(`sunucu/tt_kuyruk/` TikTok, `docs/yayin/yorum_kuyrugu.json` yorum yanıtları), durum `docs/yayin/baglantilar.json`'da (Yol haritası → Bağlantılar).
Ömer hesap bilgileriyle hazır olduğunda girişi kendisi bir kez yapar; şifre hiçbir dosyaya yazılmaz. Tarayıcı bağlandığında kuyruklar sırayla işlenir.
Sunucuya yüklenen her video `/opt/aesun/youtube/medya/<kod>.mp4` olarak saklanır (TikTok ve yeniden kullanım için).

## Kalite kapısı (otomatik, Ömer 5 Kas 2026 standardı)
YouTube kuyruğu her videoyu yüklemeden önce `/opt/aesun/kalite_kapisi.py` ile ölçer.
- **Engel (yüklenmez):** kısa kenar 1080 pikselin altında, ses yok, siyah kare oranı %15'in üstünde, ses seviyesi -24 ile -9 LUFS dışında.
- **Uyarı (yüklenir, günlüğe yazılır):** renk doygunluğu 18'in altında (soluk/pastel), kuyruk kaydında `sentetik` alanı yok, `kaynaklar` ya da `muzik_lisans` alanı yok.
Kuyruk kaydına `"kaynaklar": [...]` (görsel/görüntü künyeleri) ve `"muzik_lisans": "..."` eklenmeli.

## Yorum yanıtları (sunucudan)
`docs/yayin/yorum_kuyrugu.json`: takip betiği yanıtsız yorum bulunca `durum: "ONAY BEKLİYOR"` ve taslak `yanit` ile kayıt düşülür (Yol haritası'nda görünür).
Ömer sohbette onaylayınca kayıt `ONAYLANDI` yapılır; `islem_yt_yonet` (günde 2 kez, ya da elle tetiklenince) yanıtı YouTube'a gönderir ve `gönderildi` yazar. Otomatik yanıt yoktur.

## TikTok (sunucudan, 6 Kas 2026)
- Oturum: sunucuda kalıcı tarayıcı (`tt-tarayici`, profil `/opt/aesun/tiktok/chromium`). Giriş yalnız Ömer tarafından, `islem_tt_tarayici` ile 20 dk'lık
  parolalı pencereden yapılır; şifre hiçbir yere yazılmaz. Dış erişim `islem_tt_tarayici_kapat` ile kapanır (20 dk sonra kendiliğinden de kapanır).
- Yükleme: `sunucu/tt_kuyruk/<kod>.json` (+ mp4 ya da `kaynak.git_commit`) → `tt_kuyruk.yml` → `islem_tt_yukle.sh` TikTok Studio'da yükler,
  açıklamayı yazar, AI etiketini açar, `planla` saatine planlar, içerik listesinden doğrular; kayıt Yayın Takibi'ne "Planlı" düşer.
- Kontrol: `islem_tt_kontrol` oturumu ve son gönderileri okur. Hata ayıklama görüntüleri `docs/tampon/tiktok/adim/`.
- Kural: TikTok hiçbir uygulamaya API ile bağlanmaz; yalnız bu tarayıcı oturumu kullanılır. Günde en fazla 2 TikTok gönderisi (12:30 / 21:00), 18:00 tablo.

## TikTok sayıları ve kararı (6 Kas 2026)
- `tt_istatistik.yml` günde 2 kez (09:23, 18:23) sunucudaki TikTok oturumuyla Studio içerik listesini okur; her TikTok kaydına `izlenme/begeni/yorum_sayisi`, `yayin.json → tiktok.hesap_7g`'ye hesap 7 günlük özet yazar. Hiçbir şey yayınlamaz.
- `yayin/analiz.py → tiktok.karar`: hesap 7 günlük izlenme < 200 ve ≥5 yayında video ise **DURDUR (yeni planlama)**; 200'ü geçince DENE (günde 1), 1.000'i geçince normal kota. Mevcut planlılar silinmez.
- Tanı (`islem_tt_tani.sh`, salt okunur): herkese açık profil, Studio uyarıları, video analiz sayfaları. 6 Kas: uyarı/kısıtlama yok, videolar herkese açık, 7 günde 33 izlenme / 1 profil görüntüleme / 0 takipçi → dağıtım yok (yeni hesap, insan etkinliği sıfır).
- Silme: `islem_tt_sil.sh` (`sunucu/tt_hedef.txt` açıklama başı) yalnız Ömer onayıyla; planlı gönderide gizlilik değiştirilemez, tek yol silmek.

## KALICI KURAL — Yerelleştirme (Ömer, 6 Kas 2026)
Her bölüm **kanalının izleyicisine** göre üretilir; tek metnin çevirisi değildir.
- **TR (Antik Stüdyo):** Türkiye'ye hitap — Türkiye'nin değerleri, gündemi/siyaseti, sporu, alışkanlıkları, kültürü, etkileşim biçimi, özel günleri.
- **EN (Ancient Studio):** İngiltere/ABD ya da genel dünya izleyicisi — Türkiye'ye özgü örnek/ayrıntı girmez.
- **ES (Estudio Antiguo):** İspanya + Latin Amerika — İspanyol/Latin örnekler, tarihler, deyimler.
- Bu kural **fotoğraf, video, ses, müzik ve metin** katmanlarının hepsine uygulanır (ör. TR görselinde İstanbul, EN'de çok uluslu pazar, ES'de İspanyol limanı; TR özel günü başka dilde yoktur).
- Üretim kontrol listesi: kanca ülkeye göre mi? örnekler o coğrafyadan mı? görsellerde yabancı bayrak/şehir var mı? seslendirme dili ve deyimler doğal mı? müzik/ses o kültüre uygun mu? özel gün/takvim o ülkeye göre mi?
