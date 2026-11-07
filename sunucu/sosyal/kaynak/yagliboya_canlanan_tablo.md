---
name: yagliboya-ai-kisa-video
description: Yağlıboya/masal tarzı AI görselini 15–35 sn'lik "canlanan tablo" dikey videoya çevirme (TikTok/Reels/Shorts) — SHOOF (@shoof14) hesabının üretim formülü, viral kural ve kontrol listesi.
---

# Yağlıboya AI Kısa Video — "Canlanan Tablo" Formülü

Kaynak: TikTok @shoof14 (SHOOF) incelemesi, 7 Kasım 2026. ~61 video, 8.037 takipçi, 47,3K beğeni.

## 1. Format (sabit)
- Dikey 9:16, 720×1280, **15–35 sn** (viral video 32 sn).
- Tek sahne, tek karakter, tek duygu. Yazı yok ya da çok az (bazen 3–4 kelimelik İngilizce satır).
- Ses: "orijinal ses" — sakin enstrümantal/piyano, konuşma yok. Dil bağımsız → global kitle.
- Platformda "AI ile oluşturulmuş" etiketi açık (zorunlu, kapatma).

## 2. Görsel stil havuzu (hesabın kullandıkları)
| Stil | Örnek konu | Performans |
|---|---|---|
| Kalın fırça yağlıboya (impasto), pastel mavi-krem | Pencerede kitap okuyan kadın, iskelede şapkalı kadın | En iyi (9–10K ort., 519K viral) |
| Romantik/klasik dönem kadın portresi | Gül bahçesi, kedi, buket | 9–10K |
| Sonbahar/yağmur/şemsiye, ıslak sokak ışıkları | Kırmızı şemsiyeli kız, fener | 1,5–2,6K |
| Masalsı prenses/gelinlik, parıltılı | Balo salonu, gelin-damat | 1,8–3,2K |
| Sevimli 3D/kil karakter | Yaşlı çift, örgü atkılı kız, ördek | 3,6–5,5K |
| Takvim/özel gün | #Halloween, #Hello_November, #Morning, #goodnight | 3,3–4,6K |

Sonuç: **İmpasto yağlıboya + nostaljik kadın + sakin an** en güçlü damar. Disney-vari prenses ve gece/siluet videoları zayıf.

## 3. Viral kural (519,6K izlenme, 36,8K beğeni, 884 yorum, 5.449 kayıt)
Ortalama videolar sadece "hafif kıpırdayan tablo". Viral olan bir **hikâye ve kırılma** içeriyor:
1. Açılış: tablodaki kadın pencerede kitap okuyor (tanıdık, sakin).
2. Kamera geri çekilir → evin tamamı görünür, **dev bir fırça** sahneye kar boyamaya başlar.
3. Karakter fırçayı fark eder, **sinirlenip ressama bakar** (dördüncü duvar kırılır).
4. Kapanış: kar yağmış, kadın kalın bir şala sarınmış okumaya devam ediyor.
5. Etiket: mevsimsel (#winter_is_coming), yayın zamanı mevsim geçişi.

Formül: **Tablo + görünmez ressamın müdahalesi + karakterin tepkisi + mevsim/gün bağlantısı.**
Her 5–10 videodan en az biri bu yapıda olmalı.

## 4. Üretim akışı (ücretsiz, sunucuda)
1. **Konu seç** → takvim (gün/mevsim/özel gün) + Bölüm 2'deki güçlü stil.
2. **Ana görsel** (9:16): açık kaynak görsel modeli (Flux/SDXL) sunucuda.
   Prompt iskeleti:
   `thick impasto oil painting, visible palette-knife strokes, [karakter] [eylem] at [mekân], soft pastel blue and cream palette, warm window light, nostalgic, vertical 9:16, highly detailed brushwork`
3. **Hikâye kareleri** (viral yapı için 3–4 kare): aynı karakter tutarlılığı için ana görseli referans ver; kare 2 "zoom out + giant paintbrush painting snow onto the scene", kare 3 "woman looks up annoyed at the brush", kare 4 "wrapped in thick wool shawl, snow on windowsill".
4. **Görüntüden videoya**: açık kaynak image-to-video (Wan vb.) kendi GPU'da; her kare 5–8 sn, yavaş kamera hareketi (push-in / pull-out).
5. **Kurgu**: kareleri birleştir, yumuşak geçiş, telifsiz sakin müzik, 15–35 sn'ye kes. (ffmpeg, sunucuda.)
6. **Açıklama**: 1 kısa duygusal cümle + 1–2 etiket. Hedef dile göre (SHOOF Arapça yazıyor).

## 5. Yayın ritmi
- Günde 2–3 video (SHOOF ritmi). Sabah (#Morning) ve gece (#goodnight) seri slotları.
- Özel günleri önceden üret (Yılbaşı, Sevgililer Günü, mevsim ilk günleri).

## 6. Ölçüm (her hafta)
- İzlenme/beğeni oranı: ortalama ~%7 (658/9,8K), viral ~%7 ama kayıt oranı %1 → **kayıt ve yorum** asıl sinyal.
- 10K'yı geçen her videonun stili + yapısı → yeni 3 varyasyon.
- 2K altında kalan stil 2 hafta üst üste kalırsa havuzdan çıkar.

## 7. Güvenlik / telif
- Tanınmış karakter (Sindirella, Disney prensesleri vb.) ve tanınmış tabloların birebir kopyası yok → telif ihtarı riski.
- Film repliği/afişi kullanma (SHOOF'un Shawshank alıntılı videosu 1,4K'da kaldı; risk + düşük getiri).
- Telifsiz/kendi üretimi müzik. Trend şarkı kullanılacaksa sadece platformun ticari kütüphanesinden.
- Gerçek kişi yüzü yok.

## 8. Kontrol listesi (yayından önce)
- [ ] 9:16, 15–35 sn, ilk 1 sn'de net ve güzel kare
- [ ] Stil güçlü havuzdan mı?
- [ ] Hikâye/kırılma var mı (en azından seride)?
- [ ] Telifli karakter/eser/müzik yok
- [ ] AI etiketi açık
- [ ] 1 cümle açıklama + 1–2 etiket
