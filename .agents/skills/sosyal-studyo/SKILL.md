---
name: sosyal-studyo
description: Sosyal Stüdyo (çok yapay zekâlı içerik üretim programı) ile çalışırken: yeni içerik sohbetine hafızayı okuyarak başla, bitince öğrenilenleri kaydet.
---

# Sosyal Stüdyo ile çalışma

Program: `sunucu/sosyal/` (ns1'de `sosyal-studyo` kapsayıcısı, 127.0.0.1:5090). Ayrıntı: `sunucu/sosyal/README.md`.

## Her yeni içerik sohbetinin başında
1. Hafızayı oku: sunucuda `docker exec sosyal-studyo python -m sosyal.cli hafiza`
   (ya da arayüzde Hafıza → "Hafızayı MD olarak aç"). Yasak ve tercihler bağlayıcıdır.
2. Kaynak kuralları: `sunucu/sosyal/kaynak/*.md`.
3. "Son içerikler" listesindeki konu ve açıları tekrar etme.

## Claude elle yolu
Programda "Claude paketini kopyala" ile gelen paket tek başına yeterlidir: kurallar, hafıza ve ekip notları içindedir.
Cevap aynı bölüm başlıklarıyla (## Başlık, ## Metin, …) yazılır ve programa geri yapıştırılır.

## Sohbetin sonunda
Öğrenilen kalıcı ders (kullanıcının düzeltmesi, işe yarayan kalıp) programda "Sohbeti bitir ve öğren" ile
ya da Hafıza → "Elle kayıt ekle" ile kaydedilir. Sohbet metni saklanmaz.
