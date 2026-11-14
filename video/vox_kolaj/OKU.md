# Vox Kolaj — ortak kalıp (STORYBOARD T4)

Kaynak: @storyboard.co.th — Tuk-Tuk (136K), Thai Rice (91K), Thai Ghosts (14 Kas 2026 incelendi).
İlk ürün: `video/vecihi/` (Vecihi Hürkuş). O klasöre dokunulmaz; yeni videolar bu kalıptan kopyalanır.

## İki tür

| Tür | Ne zaman | Zemin | Görseller | Yazı dili |
|---|---|---|---|---|
| **Belgesel** (Vecihi) | Gerçek kişi/olay, arşiv fotoğrafı var | Kâğıt, gazete dokusu | Wikimedia arşiv fotoğrafları (sepya/siyah-beyaz), karttan çıkan renkli kesit | Kırmızı el yazısı, damga, etiket, hayat çizgisi |
| **Gece / Efsane** (Thai Ghosts) | Efsane, mitoloji, gizem, fotoğrafı olmayan konu | Bölüme göre değişen tema (gece, kahve, sis, orman, mürekkep) | AI ile üretilmiş tam boy karakter (dekupe PNG) + eski fotoğraf görünümlü destek görselleri | Kimlik etiketi, beyaz tebeşir el yazısı, kırmızı karalama halka |

## Thai Ghosts'tan çıkan akış (35 sn)
1. **Kıyas kancası (0–3 sn):** Herkesin bildiği batı karşılığı (Drakula) mürekkep çizim, kırmızı karalama halka + el yazısı.
2. **Karartma geçişi:** Ekran kararır, karakterlerin gölgeleri belirir, başlık: küçük üst satır + büyük kırmızı kelime ("MEET THAILAND'S / GHOSTS").
3. **Her karaktere 5–6 sn ve kendi renk dünyası:** gece mavisi, sıcak kahve-ahşap, gri sis, yeşil orman + dev dolunay.
4. **Karakter sahnesi düzeni:** sol üstte kimlik (● kırmızı nokta + İSİM + sarı fosforlu alt satır), ortada tam boy figür, yanlarda bantlı eski fotoğraflar (gerçek dünya bağı), bir fotoğrafta kırmızı karalama halka, beyaz el yazısı not.
5. **Efekt katmanı:** karakterin özelliğine göre içten ışıma (Krasue'nun organları), duman/kıvılcım (Pret), dolunay yaklaşması (Nang Tani).
6. **Kapanış:** kâğıt üstünde ülke haritası, bütün karakterler yuvarlak madalyonlarda sırayla belirir, son söz: küçük daktilo satırı + büyük kırmızı vurucu cümle ("They teach you a lesson.").

## Motor: `sahne.html`
Kayıt: `video/arac/kayit.js` (değişmedi). `?ar=169` yatay, `?ar=916` dikey kart.
`sahneler.js` başında `window.AYAR={kanal:'ANTİK STÜDYO', yillar:[...]}` — `yillar` boşsa dikeyde hayat çizgisi çıkmaz.

**Sahne ayarları:** `tema` (kagit · gece · kahve · sis · orman · murekkep), `kam` (kamera yaklaşma hızı, varsayılan .025), `bolum`.

**Yeni öğeler** (eskiler aynen duruyor: foto, etiket, el, kutu, daire, damga, dev, cizgi, alinti, ucak, sayac, kesit):

| Öğe | Alanlar | İş |
|---|---|---|
| `kimlik` | ad, alt, x, y, boy | ● kırmızı nabız noktası + daktilo isim + sarı fosforlu alt satır |
| `figur` | img, x, y (merkez), h, ayna, murekkep | Tam boy dekupe karakter, aşağıdan yükselir, hafif nefes alır, yere gölge düşer |
| `golge` | img, x, y, h, alfa | Karakterin siyah silüeti (karartma girişi) |
| `karalama` | x, y, rx, ry, tur, renk | Elle çizilmiş titrek, 2–3 turlu kırmızı halka |
| `isik` | x, y, r, renk, renk2, hiz | Nabız gibi atan iç ışıma (organ, fener, büyü) |
| `ay` | x, y, r, hilal | Kraterli dolunay + hale, ya da küçük hilal |
| `sis` | y, h, yog, hiz | Yatay akan sis bandı |
| `kivilcim` | x, w, y, h, sayi | Yükselen kor/kıvılcım |
| `madalyon` | img, x, y, r, ad, sepia | Yuvarlak portre, zıplayarak belirir (kapanış kadrosu) |
| `baslik` | ust, metin, hiza, renk | Küçük daktilo üst satır + büyük kırmızı vurucu satır |
| `perde` | alfa, renk, bitis | Ekranı karartma/açma |
| `foto` + `murekkep:1` | — | Görseli mürekkep çizim gibi (gri, sert kontrast) gösterir |

Görsel yoksa yer tutucu çizilir, kayıt durmaz. Örnek: `sahneler.js` + `ornek_kurgu.json` (Al Karısı · Karakoncolos · Şahmeran · Tepegöz).

## Görsel üretim (gece/efsane)
- Figür: tek karakter, tam boy, **düz/şeffaf arka plan** (sonra arka plan silinir → `img/ad.png`), resimli masal/yağlıboya dokusu, karakter kartıyla tutarlı.
- Destek görselleri: "1950'ler köy fotoğrafı" gibi eski fotoğraf görünümü; gerçek kişi fotoğrafı gibi sunulmaz.
- Telifli karakter yok; kendi yerel efsanelerimiz. YZ beyanı açık.
- Ses: Ümit Doğan (Antik Stüdyo TR). Müzik: kodla üretilen telifsiz.

## Uyarlama
TR: Anadolu/Türk mitolojisi (Al Karısı, Karakoncolos, Şahmeran, Tepegöz, Albastı, Umay). EN/ES: hedef ülkenin kendi efsaneleri (ör. ES: La Llorona, El Cucuy) — kanal kuralı: yerel konu, çeviri değil.
