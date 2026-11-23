# Motor ekleri (kodlaciz/yumurta-stili için)

## clay.js — 3D keçe figür (23.11.2026, Ömer onaylı)
Yumurta adam yerine gerçek 3D, keçe/kil görünümlü karakter. `engine/src/clay.js` olarak kopyalanır; story.js'te
`import { Clay } from '/engine/src/clay.js'` ve `new Clay(LOOK[n], scene)` (Toon ile aynı arayüz: show, hide, place, draw).
- Görünüm: ten renkli kafa, kafaya boyanan büyük parlak gözler, kaş, yanak, ağız; keçe dokulu saç, gövde, kıyafet.
- LOOK alanları: height, child (büyük kafa), skin, cloth, legs, skirt, boots, longHair + hairLen (boy oranı, ör. .3), shortHair,
  hat (helmet | mortar | peak) + hatColor, beard, buttons, trim (yelek bantları), sash, pocket, collar, blush:false.
- draw() alanları: expr (smile, laugh, grin, proud, surprised, worried, neutral), mouth, blink, look, lookY, tilt,
  armL/armR [kol°, dirsek°, ileri°], bob, lean (° öne eğilme), turn (°), propL/propR (karanfil, karne, pen, simit).
- Işık ve gölgeyi sahneden alır; kameraya %75 döner, başını çevirebilir, eğilebilir.
İlk kullanım: `video/ogretmen_vefa/` (Öğretmenler Günü: Vefa).
