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
