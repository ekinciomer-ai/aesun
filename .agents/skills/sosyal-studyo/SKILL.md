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

## Animasyon videoları (kodla çizilen)
- Format kütüphanesi: `sunucu/sosyal/kaynak/animasyon_formatlari.md` (kalıp, çizim dili, renk kodları, yazı biçimi, ne zaman seçilir).
  Örnek videolar ve kare panoları: `icerik/animasyon_formatlari/<kod>/`. Yöntem: `sunucu/sosyal/kaynak/Claude_Animasyon_Sistemi.md`.
- İstenen konuya göre tablodan format seç; uymuyorsa mevcut formatlardan yenisini türet ve kütüphaneye "(türetilmiş)" diye ekle.
- Sıra: metin (70–100 kelime) → `sunucu/sosyal/animasyon/public/<ad>/metin.txt` + `SES_ISI` → `sosyal_anim_ses` işlemi (ElevenLabs,
  kelime zamanları) → `src/<ad>/Video.tsx` (şablon: aynı formattaki önceki video) → yarım boy önizleme + 48 karelik pano, en az iki
  düzeltme turu → 300 karelik parçalarla tam boy, ses sonda eklenir → kalite kapısı → kullanıcıya gönder.
- Render bu ortamda: `--browser-executable=/opt/pw-browsers/chromium_headless_shell-*/chrome-headless-shell-linux64/chrome-headless-shell`,
  `--concurrency=2 --timeout=120000`; uzun tek parça işleme takılıyor, parçalı işle.
