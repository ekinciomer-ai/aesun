# Video formatları kataloğu (Antik Stüdyo ve diğer kanallar)

**Kalıcı kural (Ömer, 12 Kas 2026):** "Video içerik hazırla" dendiğinde önce bu listedeki tüm formatlar gösterilir; Ömer seçer, üretim ondan sonra başlar.
Her format: ne olduğu · örnek · araç · maliyet · süre. Yeni format eklendikçe bu dosyaya yazılır.

| # | Format | Nasıl görünür | Örnek | Araç | Maliyet |
|---|---|---|---|---|---|
| 1 | **2D vektör çizgi film** ("Cevahir tarzı") | Kalın mürekkep çizgi, parşömen renkler, sade sarıklı karakterler; ekranda sayaç, bilgi paneli, el yazısı altyazı. Karakterler kodla çizilip canlandırılır. | Cevahir Minaresi Short'u (5.180 izlenme, kanalın 1 numarası); Gece Sakız 2D (`video/gece_sakiz_2d`) | Kodla çizim (`sahne.html`) + sunucu kaydı | **Ücretsiz** |
| 2 | **Fotogerçekçi sinematik** ("Celtic konsepti") | YZ ile üretilmiş gerçekçi sahneler, 3–4 sn kesim, yavaş yakınlaşma, beyaz-sarı kalın başlık, açık tema | Beşiktaş–Celtic Short'u; Gece Yapma Denen 4 Şey (`icerik/gece`) | Topview görsel + `karma_gece.py` | ~0,2 kredi/görsel |
| 3 | **Gerçek görüntülü belgesel** | Gerçek drone/stok klipler, uydu haritası, klon ses | Tuna Nehri videoları | Pixabay klipleri + uydu (`gercek-goruntulu-belgesel`) | Ücretsiz |
| 4 | **Gündem + tarih illüstrasyon** | Uydu harita açılışı + animasyonlu illüstrasyon, hayat hikâyesi anlatımı | Boğazkesen, Don–Volga Short'ları | `gundem-tarih-video` | Düşük |
| 5 | **3D sahne / nasıl yapıldı** | Kodla kurulan 3D sahne, kamera turu, parça parça montaj | Kumdan panele (`video/kumdan`), atom, rüzgâr türbini | Three.js sahne + `video_render` | Ücretsiz |
| 6 | **Canlanan tablo** (yağlıboya) | Yağlıboya/masal görseli 15–35 sn'de canlanır | Tablo serisi | `yagliboya-ai-kisa-video` | Düşük |
| 7 | **Karanlık doğa / ambiyans** | Puslu orman, yağmur, ay ışığı; uzun müzik/ambiyans | Kozmos Lab, Akşam | `aksam` | Ücretsiz |
| 8 | **Söz kartı** (tek fotoğraf) | Tarihî kişinin sözü, 4:5 ve 9:16 | Lao Tzu kartı | `antik-studyo-icerik` | Düşük |
| 9 | **TikTok referansı: @onun.hikayesi_** | *İnceleme bekliyor* — video dosyası ya da ekran görüntüsü gelince doldurulacak | tiktok.com/@onun.hikayesi_/video/7706961895240125717 | — | — |
| 10 | **TikTok referansı: @gungunhayattakal** | *İnceleme bekliyor* — video dosyası ya da ekran görüntüsü gelince doldurulacak | tiktok.com/@gungunhayattakal/video/7699518032691121429 | — | — |

## Ses seçenekleri (formatla birlikte seçilir)
- **benim2** (Ömer'in klon sesi): ciddi/haber anlatımı. Not: 2D çizgi film anlatımına uymadığı söylendi (12 Kas 2026); çizgi film için daha sıcak, masalcı bir ses denenmeli.
- **Uğur**: Tablo serisi anlatıcısı.
- Yeni ses gerekiyorsa: ElevenLabs ses kütüphanesinden az kullanılan, formatın tonuna uyan ses (popüler hazır sesler kullanılmaz).

## Not
- TikTok videoları sunucudan otomatik indirilemiyor (bot koruması). İnceleme için videoyu uygulamadan kaydedip sohbete eklemek ya da ekran görüntüsü göndermek gerekiyor.
