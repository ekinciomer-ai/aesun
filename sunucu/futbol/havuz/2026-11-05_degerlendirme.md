# 5 Kasım 2026 · Avrupa Ligi 4. hafta · gün sonu değerlendirmesi

Model: oranlardan gol beklentisi + 5 senaryo × 20.000 dakika dakika simülasyon + form/tempo sapması (v2).

## Sonuç
- Sonuç isabeti: 8/17 (%47). 20:45 seansı 5/8, 23:00 seansı 3/9.
- Tam skor: 2/17 (Levski 1-0, Lillestrøm–Plzeň 0-1).
- Olasılık hata puanı (Brier, düşük iyi): model 0,678 · piyasa 0,693. Model piyasadan çok az iyi; 17 maçla anlamlı değil.
- Piyasa favorisi de aynı 8 maçta tuttu.

## Güvene göre isabet
- %50 altı: 4/7 · %50–60: 2/4 · %60 üstü: 2/6. Yüksek güvenli favoriler (Milan, Leverkusen, Sunderland, Sturm Graz) çöktü.

## Kaçırdıklarımız
- Deplasman günü: 17 maçın 9'unu deplasman kazandı (model ve piyasa ev sahibine fazla güveniyor olabilir; tek gün, izlenecek).
- Beraberlik hiç tahmin edilmedi: 2 beraberlik (Palace–Hoffenheim, Sociedad–Lyon).
- Favori kaybı: Milan 0-2, Leverkusen 0-1, Sunderland 0-2, Sturm 2-3 — hepsinde zayıf tarafa %13–18 verildi.
- Sürpriz uyarısı (8 maç): favori 4'ünde kazanamadı, zayıf taraf 3'ünde kazandı (Celtic, Union SG, OFI). Uyarı işe yarıyor; uyarısız 9 maçın 4'ü tuttu.
- Gol: ortalama gerçek 2,82, model 3,00; 2,5 üst gerçek 8/17, model ort. %56 — gol beklentisi makul.

## Düzeltmeler (v3)
1. Beraberlik kuralı: 1 ve 2 farkı ≤8 puan ve X ≥ %27 ise tahmin "X / çifte şans".
2. Haber katmanı: rotasyon (lig maçı öncesi), sakat/cezalı, teknik direktör değişimi, moral serisi → gol beklentisine çarpan.
3. Ev sahibi avantajını Avrupa kupalarında %5 azaltıp 3 maç günü izlemek.
4. Sürpriz uyarılı maçlarda tek sonuç yerine çifte şans önermek.
5. Yorumcu karnesi (X/Twitter, Apify ile) — onay bekliyor.
