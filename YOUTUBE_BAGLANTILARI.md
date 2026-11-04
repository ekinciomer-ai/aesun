# YouTube bağlantıları (sunucu)

Son güncelleme: 3 Kasım 2026

Bu dosya, YouTube kanallarının sunucuya nasıl bağlandığını anlatır. Bir yapay zekâ ajanının (Antigravity, Claude vb.) kanallarla çalışırken izleyeceği kuralları içerir. **Bu dosyada hiçbir şifre, anahtar ya da token yoktur ve eklenmemelidir.**

## Bağlı kanallar

| Kanal | Kullanıcı adı | Google hesabı | Durum |
|---|---|---|---|
| Antik Stüdyo (TR) | @antikstudyo | arabas400.mrc@gmail.com (kişisel kanal) | Bağlı |
| Ancient Studio (global) | @ancientstudiotv | arabas400.mrc@gmail.com altındaki marka hesabı | Bağlı |
| Estudio Antiguo (ES) | henüz açılmadı | aynı hesap, yeni marka hesabı olacak | Bekliyor |

## Google Cloud projesi

- Proje adı: **Kanal Yonetim**, proje ID'si: `ancient-episode-513619-r1`
- Sahibi: ekinci.omer@gmail.com
- Açık servisler: YouTube Data API v3, YouTube Analytics API
- OAuth istemcisi: Masaüstü uygulaması türünde. Yönlendirme adresi `http://127.0.0.1:8765`
- Yayın durumu: **In production**, doğrulanmamış uygulama. Yenileme anahtarlarının süresi dolmaz.
- Gizlilik sayfası: https://aksarayenerji.net/uygulama-gizlilik.html
- Verilen izinler: `youtube`, `youtube.upload`, `yt-analytics.readonly`, `yt-analytics-monetary.readonly`

## Sırlar nerede

| Ne | Nerede | Not |
|---|---|---|
| OAuth istemci kimliği ve gizli anahtarı | Sunucuda `/opt/aesun/youtube/istemci.json` (yalnız root okur) | Depoda yalnız şifreli hali var: `ekinciomer-ai/aesun/sunucu/yt/istemci.sifreli` |
| Kanal yenileme anahtarları | Sunucuda `/opt/aesun/youtube/kanallar/<kanal_id>.json` (yalnız root) | Her kanal için ayrı dosya |
| Şifreleme anahtarı | Sunucuda `/opt/aesun/sir/ozel.pem` | Açık anahtarı `islem_sir_anahtar` işlemi yazdırır |

Kurallar:
- Sırlar sohbete, koda, depoya ya da belgeye **düz metin olarak asla yazılmaz.**
- Depoya giden her sır, sunucunun açık anahtarıyla şifrelenir (RSA-OAEP SHA-256 ile sarılmış AES-256-CBC). Çözme işini yalnız sunucu yapar.

## Sunucuda nasıl çalıştırılır

Sunucuya doğrudan SSH yoktur. Her işlem `ekinciomer-ai/aesun` deposundaki `sunucu/islem_<ad>.sh` betiğiyle yapılır ve GitHub Actions üzerinden tetiklenir:

```
gh api -X POST repos/ekinciomer-ai/aesun/actions/workflows/sunucu_islem.yml/dispatches \
  -f ref=main -f 'inputs[islem]=yt_kur'
```

- `islem_yt_kur`: istemci kimliğini çözer, varsa yeni izin kodunu yenileme anahtarına çevirir ve bağlı kanalları doğrular (kanal adı, abone, video, izlenme). Çıktıda sır yoktur.
- Betikler sunucuda root olarak çalışır. Çıktılar `NOT:` satırlarıyla iş günlüğüne düşer.

## Yeni kanal bağlama

1. Kanal sahibi şu bağlantıyı tarayıcıda açar, ilgili kanalı veya marka hesabını seçer ve izin verir:
   `https://accounts.google.com/o/oauth2/v2/auth?client_id=568448750743-06valh039kui20d73cqkmnnu5okqkvdb.apps.googleusercontent.com&redirect_uri=http%3A%2F%2F127.0.0.1%3A8765&response_type=code&access_type=offline&prompt=consent%20select_account&scope=https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fyoutube%20https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fyoutube.upload%20https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fyt-analytics.readonly%20https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fyt-analytics-monetary.readonly`
2. "Google bu uygulamayı doğrulamadı" uyarısında Gelişmiş'e, sonra "Kanal Yonetim'e git"e basılır.
3. Son sayfa "Bu siteye ulaşılamıyor" hatası verir; bu normaldir. Adres çubuğundaki `code=` değeri alınır.
4. Kod, sunucunun açık anahtarıyla şifrelenir ve `sunucu/yt/kod.sifreli` olarak depoya gönderilir. Ardından `yt_kur` çalıştırılır.
5. İş bitince `sunucu/yt/kod.sifreli` depodan silinir. Kod tek kullanımlıktır ve yaklaşık 10 dakikada geçersiz olur.

## Bilinen kısıtlar

- **Yüklenen videolar özel olarak yüklenir.** Proje YouTube API denetiminden geçene kadar sunucudan yüklenen videolar yalnız "özel" olur; Studio'dan elle herkese açılır. Denetim başvurusu yapılacak.
- **Günlük kota:** YouTube API kotası proje başına günlüktür. Video yükleme kotayı en çok harcayan işlemdir. Toplu işlemden önce Google Cloud'daki kota sayfasına bakılmalıdır.
- **Yapay zekâ etiketi:** Gerçekçi yapay zekâ görüntüsü içeren videolarda YouTube'un yapay zekâ beyanı işaretlenmelidir.

## Güvenlik kuralları (değişmez)

- Önce yedek: kanal ayarlarında ya da toplu video değişikliğinde önce mevcut durum kaydedilir.
- Video silme, kanal ayarı değiştirme ve herkese açma işlemleri kanal sahibinin (Ömer) açık onayı olmadan yapılmaz.
- Telif kontrolü: yüklemeden önce müzik lisansı, görüntü kaynağı ve seri üretim kuralı kontrol edilir.
- İzin geri alma: https://myaccount.google.com/permissions adresinden "Kanal Yonetim" kaldırılırsa bağlantı kesilir.
