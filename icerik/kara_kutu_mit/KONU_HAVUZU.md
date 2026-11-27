# Konu Havuzu — "Mit mi Gerçek mi?"

Her satır: toplumda yaygın inanç · Lexara arama ipucu. Kullanılan konu "Yapıldı" bölümüne taşınır. Havuz 10'un altına düşerse yeni mitler eklenir (kalıp: insanların yanlış bildiği, merak ettiği, sonu kesin kararlı trafik olayları).

## Üretim kuralı (Kasım 2026)
- 1 konu = 1 video. Aynı konu birden fazla formatta üretilmez.
- Format her konu için rastgele seçilir: F13 sinematik maket, F5 maket, KK2D çerçeveli maket, F9 eskiz.
- Art arda iki konu aynı formatta olmaz. Seçim: `python3 video/kk2d_kavsak/format_sec.py` (son formatı `format_son.txt`'ye yazar).

## Yapıldı
1. Arkadan çarpan her zaman %100 kusurludur (ani fren) — KK_MIT_01
2. Yaya her zaman haklıdır — KK_MIT_02
3. Polisin tuttuğu tutanak kesindir — KK_MIT_03
4. Kemer takmamak sadece trafik cezasıdır — KK_MIT_04
5. Alkollüysen kaza otomatik senin suçundur — KK_MIT_05
6. Çukura düştüysen kimse ödemez — KK_MIT_06
7. Yeşilde geçiyorsan suçlu sen olmazsın — KK_MIT_07
8. Hız sınırının altındaysan kusurlu olmazsın — KK_MIT_08
9. Yola hayvan çıktıysa kaza kaderdir — KK_MIT_09
10. Sigortan varsa cebinden para çıkmaz — KK_MIT_10
11. Telefonla konuşmak sadece idari para cezasıdır — KK_MIT_11
12. Trafik ışığı arızalıysa kimse kusurlu değildir — KK_MIT_12
13. Kask takmayan motorcu da tam tazminat alır — KK_MIT_13
14. Ehliyetsiz birine aracını verirsen sorumlu olmazsın — KK_MIT_14
15. Kavşağa önce giren geçer — KK2D_KAVSAK (Format 1: 2D çizgi film, TR/EN/ES; Yargıtay 12. CD düzelterek onama; DUR'da durmayan asli, yavaşlamayan motosikletli tali kusurlu)
16. Kazadan sonra kaçmak kurtarır — KK3_KACMAK (F13; Yargıtay 12. CD E.2023/5977 K.2023/4156, onama: devamlı çizgi, kaçtı, 3 saat sonra 1,96 promil, 9 yıl hapis) https://lexara.com.tr/karar/293059
17. Yol buzluysa devlet öder — KK3_BUZ (F5; Danıştay 15. D E.2014/435 K.2017/70, onama: sürücü %100, idare kusursuz, 20.020 TL ret) https://lexara.com.tr/karar/18747925
18. Geçit dışı yayaya çarpan kusursuz — KK3_YAYA (KK2D; Yargıtay 12. CD E.2020/3714 K.2022/1730, onama: fren izi yok, sürücü tali kusurlu, mahkûm) https://lexara.com.tr/karar/1670280
19. Duran araca çarpan hep tam kusurlu — KK3_SERIT (F13; Yargıtay 12. CD E.2014/11896 K.2015/4066, onama: işaretsiz duran araç sürücüsü mahkûm) https://lexara.com.tr/karar/4928038
20. Ölümlü kazada sürücü mutlaka hapse girer — KK_MIT_15 (Yargıtay 12. CD E.2020/11191 K.2024/4113, onama: kendi şeridindeki sürücü kusursuz, beraat) https://lexara.com.tr/karar/1333360
21. Bedava bindiysen tazminat isteyemezsin (hatır taşıması) — KK_MIT_16 (Yargıtay 4. HD E.2022/6578 K.2024/1013, onama: %20 indirim) https://lexara.com.tr/karar/382473
22. Virajı alamadıysan suç tamamen sende — KK_MIT_17 (Danıştay 15. D E.2016/87 K.2017/2097, onama: sürücü %75, idare %25) https://lexara.com.tr/karar/18748639

23. Kaçan/plakasız araç yüzünden zarar: kimse ödemez — KK_MIT_18 · teslim 26.11 (Yargıtay 4. HD E.2021/25417 K.2023/3802, onama: 82.818 TL) https://lexara.com.tr/karar/21247411

24. Ehliyetsiz sürücü kazada otomatik suçludur — KK_MIT_19 · teslim 27.11 (Yargıtay 12. CD E.2012/22236 K.2013/15336, onama: yaya soldan aniden girdi, sürücü kusursuz, beraat) https://lexara.com.tr/karar/10003318
25. Alkollü sürücünün yolcusu tam tazminat alır — KK_MIT_20 · teslim 27.11 (Yargıtay 4. HD E.2022/1080 K.2023/6785, onama: %20 müterafik kusur, 44.326 TL) https://lexara.com.tr/karar/779170
26. Yoldaki mıcıra kaydıysan suç tamamen senin — KK_MIT_21 · teslim 27.11 (Danıştay 15. D E.2014/1980 K.2017/1205, onama: idare %40, 7.140 TL) https://lexara.com.tr/karar/18748332

## Bekleyen (öncelik sırası)
6. Park halindeki araca çarpıp gitmek önemsizdir — park halindeki araca çarpıp kaçma, tazminat/ceza
7. Ambulansa yol verirken kırmızıda geçen cezalandırılır — geçiş üstünlüğü olan araç, kusur
8. Kış lastiği yoksa sadece para cezası yersin — yazlık lastikle karlı yolda kaza, kusur
12. Çocuk kucakta önde güvendedir — çocuk yolcu, müterafik kusur, tazminat indirimi
13. Kazayı polis tutmadıysa sigorta ödemez — anlaşmalı tutanak, sigorta ödemesi
14. Aracı kazadan sonra kenara çekersen haksız duruma düşersin — maddi hasarlı kaza, aracı kaldırma yükümlülüğü
15. Sollama yaparken hız sınırını aşmak serbesttir — sollama, hız, kusur
16. Karşıdan gelen far yaktı, kör oldum: kusur bende değil — gece uzun far, kamaşma, kusur
19. Otobüste ayakta giderken düştüysen şoför sorumlu değildir — ani fren, yolcu yaralanması, taşıyanın sorumluluğu
20. Kırmızıda karşıya geçen yayaya çarpan sürücü her zaman masumdur — yaya kırmızıda, sürücü kusur payı
21. Emniyet şeridine park etmek, çarpanı tek suçlu yapar — emniyet şeridinde park, tali kusur
