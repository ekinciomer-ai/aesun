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
- `yayin/guncelle.py`, GitHub Actions'ta 30 dakikada bir, `YT_API_KEY` sırrı varsa her herkese açık YouTube videosunun yorumlarını okur ve `yayin.json` → `yorumlar` dizisine yazar (`yanitlandi`: kanal yanıt verdi mi).
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
