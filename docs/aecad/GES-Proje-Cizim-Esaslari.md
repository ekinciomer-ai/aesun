
# GES Proje Çizim Esasları (Aksaray Enerji)

Kural: Kullanıcı bu esasları bir daha anlatmaz. Her şey burada ya da proje parametre dosyasında (JSON) durur. Sohbette yeni bir kural söylerse onu JSON'a ya da bu skill'e işle.

## 0. Araç
- Script: `ges_ciz.py` (GES-ÇİZ). **Tek kaynak: artifact "GES-ÇİZ Kaynak" — https://claude.ai/artifact/6BPsDmVm3Ps1WDGvfu9Cqs** (hangi projeye bağlı olursa olsun her oturum erişir).
  - Al: Artifact aracı `action: "read"`, `url` = yukarıdaki adres, `paths: ["ges_ciz.py", "ornek_shams1.json"]`, `out_dir` = çalışma klasörü. Esaslar aynı yerde: `GES-Proje-Cizim-Esaslari.md`.
  - Yedek: "Mensis Projeler" projesine bağlı oturumda `project_read claude/ges-ciz/ges_ciz.py`.
  - İkisi de olmazsa kullanıcıdan `GES-CIZ.zip` ya da `ges_ciz.py.txt` eklemesini iste ve bekle.
  - **Scripti esaslardan sıfırdan YAZMA, "beklemeden kendi scriptimi yazıp başlıyorum" deme.** İki ayrı araç, tutarsız çizim demektir.
  - Script değiştirildiğinde aynı artifact'a (`url` ile) yeniden yayınla ve proje kopyasını da güncelle; ikisi aynı sürüm kalır.
- Kurulum: `pip install --break-system-packages ezdxf shapely matplotlib`
- Çalıştırma: `python3 ges_ciz.py proje.json [--seviye teklif|uygulama] [--cikti klasör]`
- Çıktılar:
  - Paftalar: `01 GENEL`, `02-1` DM ve OG dağıtım tek hattı, `02-2…` her TM için ayrı tek hat paftası, `03 TOPRAKLAMA`, `04 KABLO`, `05 KANAL_DETAY` (EKAT md.58 kesitleri). Her biri DXF (R2013, katmanlı, gerçek koordinatlı).
  - PDF'te ayrıca "Proje Dosyası İçindekiler" sayfası: idari belgeler, hesaplar (araç / AYRI HAZIRLANIR), paftalar, ek paftalar, POB.
  - Tüm paftalar tek PDF'te, son sayfası metraj ve kontrol.
  - Etkileşimli HTML: sekmeli, katman aç/kapa, yakınlaştırma, masa/inverter bilgisi.
  - `METRAJ.csv`, `RAPOR.json`. Uygulama seviyesinde ek olarak `APLIKASYON.csv` (kolon koordinatları).
- DWG:
  - Esas teslim DWG'dir. DWG'yi ODA File Converter üretir; script onu Windows, Mac ve Linux'ta otomatik bulur.
  - ODA yoksa DXF teslim edilir, kullanıcı AutoCAD'de "Farklı kaydet → DWG" yapar.
  - LibreDWG'nin DWG yazıcısını KULLANMA: bozuk dosya üretiyor (26.09.2026 testi).
- Gösterim: HTML'i Artifact olarak yayınla, PDF'i ve DXF/DWG'leri SendUserFile ile gönder.
- Yönetmelik referansı: NotebookLM "elektrik proje" not defteri (proje yönetmeliği, EKAT, topraklama, gerilim düşümü, IEC 61439, onay). Yeni bir yönetmelik sorusunda önce oraya sor (notebook_query; cihaz 60 s'de yanıt vermezse sorguları tek tek, kısa gönder).
- Başkasının DWG'sini OKUMA (denetim, metraj, öğrenme):
  - LibreDWG'yi kaynaktan derle (`git clone --depth 1 https://github.com/LibreDWG/libredwg`, `autogen.sh && ./configure --disable-bindings --disable-docs --disable-werror && make`), `programs/dwg2dxf -y` ile DXF'e çevir, `ezdxf.recover` ile oku. Okuma güvenilir; yazma değil (yukarıya bak).
  - Kullanıcı DXF göndermek zorunda değil: DXF, DWG'nin 5–10 katı büyür (Gömce: 18 MB DWG → 158 MB DXF). DWG'yi iste.
  - Yerleşim aynı dosyada birden çok kopya olabilir (Gömce SGYP-1: 4 kopya, 281.528 panel bloğu = 70.356 × 4). Junction-box/panel bloklarını 100 m ızgarada kümeleyip tek kopyayı seç; metrajı o kopyadan al.
  - Masa bloklarının INSERT noktası geometrinin yerinde olmayabilir; konumu `virtual_entities()` sınır kutusundan al.
  - Kablo metraj tabloları çoğu zaman OLE2FRAME içine gömülü Excel'dir (PDF'te metin çıkmaz). `e.binary_data()` → `D0CF11E0` imzasından itibaren `olefile` → `Package` akışı = .xlsx → openpyxl. Gömce'de DC/AC/Kablo Kanal Hesabı buradan çıktı.
  - Gömülü hesap dosyasının başka projeden kopya olup olmadığını kontrol et (Gömce hesap sayfası "PEYNİRCİ GES", 960 kW inverter, 27'li dizi yazıyordu).
  - Pafta sembolünü birebir fiziksel konum sanma: kanal ve geçişler gösterim amaçlı kaydırılmış olabilir (bkz. 8.1). Şüphede kullanıcıya sor.

## 1. Başlarken — tek sefer sor, sonra JSON'dan oku
Önce projenin JSON'u var mı bak (proje dokümanları, önceki revizyon). Varsa sadece değişeni sor.

Yoksa eksik olanları tek AskUserQuestion turunda sor. Kalan her şey varsayılandan gelir.

Zorunlu girdiler:
1. Parsel köşe koordinatları (D, K) ve koordinat sistemi (ör. ITRF96 3° DOM30).
2. Seviye: teklif veya uygulama.
3. Modül: Wp, Voc, Vmp, Imp, Isc, Voc sıcaklık katsayısı, ebat.
4. İnverter: model ve AC kW.
5. Trafo gücü ve TM başına inverter adedi.
6. Enlem.
7. Yasak alanlar ve tamponları: dere/DSİ, ENH irtifakı, yol. Şantiye alanı.
8. EİGM parsel alanı, şebeke gerilimi (TM'den), inverter MPPT sayısı ve MPPT anma akımı, DM/ENH konumu.
9. Tesis tipi (lisanssız / lisanslı / iletim / OSB / yurtdışı → POB), müellif PUS + SMM no, toprak özgül direnci ρ (Wenner), OG faz-toprak arıza akımı, trafo yağ hacmi.

Bilinmeyen değer `null` kalır. Kontrol "VERİ YOK" der. **Sayı uydurma yok.**

Kaynak önceliği:
Bağlayıcı esaslar (bölüm 2) > proje teknik şartnamesi > sözleşme keşif cetveli > statik proje > varsayılanlar. Şartname esastan daha katıysa şartname uygulanır.

## 2. BAĞLAYICI ESASLAR (her projede, her seviyede)

### A. Yerleşim ve kablolama
1. **DC string kriteri gerilim düşümüdür; 80 m yalnız pratik ön sınırdır.**
   - ΔU% = 2 × L_tek yön × Imp × ρ / (S × Umpp,string) × 100. ρ_Cu = 0,0206 Ω·mm²/m, S = kablo kesiti (1×6 → 6 mm²), Umpp,string = Vmp × modül/string.
   - Örnek (570 Wp, Imp 12,76 A, Vmp 44,68 V, 26'lı, 1×6 Cu): %0,0075/m → 80 m ≈ %0,6; %1 ≈ 133 m; %2 ≈ 265 m.
   - **ΔU < %1** → uygun; masa bölünmez, string olduğu gibi bağlanır.
   - **%1 ≤ ΔU < %2** → kullanıcıya SOR: "Bu stringler için masayı ne yapayım?" (böl / inverteri kaydır / olduğu gibi bırak). Kabul edilebilir bir istisna varsa (kullanıcı onayı, şartname izni, az sayıda string) masa bölünmez, string bölünmeden eklenir; rapora istisna olarak yazılır.
   - **ΔU ≥ %2** → kabul edilmez; A.8 sırası uygulanır.
   - Proje şartnamesi daha katıysa (ör. SHAMS DC ≤ %1,5) şartname sınırı geçerlidir.
2. **Hiçbir kablo (DC, AG, OG) masa altından GEÇMEZ; kablolar masa aralarından geçer.** DC kablo masa konstrüksiyonu üzerinde masa başına kadar taşınır, masa başında iner; yerde yalnız sıra açıklığında (ön–arka masa arası) ve sıra içindeki masa arası boşlukta yürür. Bir sırayı keserken masa arası boşluğu ya da sıra ucunu kullanır. Topraklama şeridi de aynı kurala uyar.
3. AG kablo, ön masa ile arka masa arasındaki sıra açıklığından geçer.
4. **İnverter her zaman masanın KUZEYİNDE** (arka sıra açıklığında, masanın kuzey orta noktasında) durur; masa başında/sonunda ya da masa önünde olmaz (kullanıcı kuralı 20.10.2026). AG kablo da bu yüzden masaların kuzeyine yakın yerden (arka açıklık) gider.
5. Uzun sahalarda inverter yol kenarında olur. AG kablo yoldan bağlanır, DC kablolar inverter konumuna göre optimize edilir.
6. Servis yolu ve ana kanal saha ortasından değil, **parsel kenarından** geçer (istisna: A.8).
7. Sahanın en verimli yeri orta sıralardır. Orta sıralar boş bırakılmaz, **masa alanı içinde kablo koridoru açılmaz** (istisna: A.8).
8. **A.6/A.7 istisnası — yalnız A.1 tutmazsa (ΔU ≥ %2 ya da %1–2 bandında kullanıcı bölmeyi seçtiyse), şu sırayla:**
   1. Önce masaları böl ve/veya inverter konumunu değiştir; ΔU %1'in altına iniyorsa koridor açma.
   2. Masa sıraları bundan da uzunsa sıraların arasına (D-B sırayı kesen) **masa arası yol/koridor** aç, inverterleri bu koridora, masa başlarına yerleştir. AG kanal bu koridordan gider.
   3. Sıralar uzun **ve** inverter sayısı çoksa trafoyu (köşk) da bu koridorların uygun bir yerine koy: inverterlerin ağırlık merkezine yakın, koridor düğümünde, servis yolu erişimi olan nokta.
   - Koridor açıldığında raporda gerekçe yazılır: "A.1 gereği iç koridor (adım 2/3)", kaybedilen masa sayısı ve kazanılan DC/AC boy verilir.

**A.11 AG (AC) HAT ALGORİTMASI (kullanıcı kuralı 19–20.10.2026 — kesin, değiştirilmez; eski "kenar halka / ızgara güzergâhı" anlatımının yerine geçer):**
1. **AG hat istikameti:** Trafo (köşk) tarafında, masa sıralarının uç köşelerinin **3 m açığından** geçen, sıralara dik **TEK DÜZ çizgi**. Saha kenarı eğikse çizgi kenara paralel eğik olur, yine kırıksız. Köşkün iki yanı ayrı kol; her kol o yöndeki **en uzak inverterin sırasına kadar** gider, TM hizasından ADP'ye düz bağlanır. Hat sınıra (çit/çekme) çarparsa yalnız ana hatta tek kırıkla sınır içinden devam eder.
2. **Kanal:** Düz; merdiven/zikzak yok; hiçbir masaya değmez, arazi içinde kalır. Ortak güzergâhta tek kanal; kablolar yalnız bu kanallardan, dolandırma yok, yelpaze (her invertere ayrı hat) yok. Kanal BANDI çizilmez (20.10.2026); yalnız ortak kazı metresi bildirilir.
3. **Branşman:** Her inverter çıkışında ≤ 2,5 m iniş, sonra kendi sırasının **kuzey açıklığından (masaların arkasından) sıra doğrultusunda DÜZ** gidip istikamet hattına girer; branşmanda kırık yok. Uzaktaki inverter de aynı: uzun ama düz.
4. **İnverter:** her zaman masanın KUZEYİNDE, masanın kuzey orta noktasında (A.4); AG kablolar bu yüzden masaların kuzeyine yakın yerden gider.
5. **Yeni inverter eklenince** mevcut hattı referans alır, gidebildiği kadar mevcut kanaldan gider. Tasarım bitince "kabloları düzenle" tüm AC'yi tek kanalda toparlar.
6. Uygulama: AeCAD "AC oto / Kabloları düzenle / İnverter ekle". GES-ÇİZ: inverter kuzeyde uygulandı; istikamet hattı scripte taşınması açık iş.

### B. Sıra aralığı ve arazi kullanımı
- Paftadaki "sıra mesafesi" (3,0–4,5 m) sıralar arası **AÇIKLIKTIR**, eksen aralığı değil.
- Eksen aralığı = açıklık + masa izdüşümü (2P, 25° eğimde 4,13 m) → 7,3–8,6 m; arazi kullanımı %59–76. Bu kabul sözleşme öncesi müellifle teyit edilir.
- Çitten çekme 5 m esastır. Masa sayısı sığmazsa 4, 3, 2 m'ye düşülür.

### C. Arazi ve eğim
- Eğim düzlemi K-G ve D-B bileşenlerine ayrılır. Güney bakılı eğim gölgelenme açısından lehtedir.
- Maliyeti belirleyen enine (D-B) eğimdir. Masa ayak boyu farkıyla yaklaşık ±30 cm karşılanır:
  - masa ucu Δh < ~1 m → ayak boyu kademelendirmesi yeterli
  - Δh > ~1,5 m → bant teraslama veya masayı ikiye bölme; gerekirse masa eksenini eş yükselti eğrisine döndürme
- SRTM 30 m yalnız ön analiz içindir. Kesin metraj, halihazır harita veya dron fotogrametrisinden 1 m eş yükselti eğrili sayısal arazi modeliyle (SAM) çıkarılır.

### D. Elektriksel kontroller
- Şebeke gerilimini TM'den doğrula (ör. 31,5 kV / 34,5 kV). Pafta etiketlerine güvenme, trafo kademe aralığıyla kontrol et.
- Dizi gerilimi: Voc'u sahanın mutlak minimum sıcaklığında hesapla, inverterin 1.500 V sınırına marjı kontrol et (%2 altı marj riskli).
- MPPT akımı: MPPT başına dizi sayısı × Isc ≤ inverterin anma MPPT giriş akımı. Dizi dağılımını dengele.
- Trafo yüklenmesi: inverterleri trafolara eşit böl; dengesiz bölünmede yüklenme farkını raporla.
- Trafo değişikliğinde OG hücre, AG pano, köşk ve yağ çukuru sayılarını birlikte revize et. TEDAŞ onaylı projeden farklıysa tadilat projesi gerekir.
- Trafo tipi:
  - büyük güçlü (≥ 2.500 kVA): harici + yağ çukuru + çit
  - küçükler: dahili, köşk içi (yağ toplama havuzu, havalandırma, kilitli bölme)

### E. Parsel ve koordinat
- Parsel sınırları EİGM köşe koordinatlarıyla doğrulanır (sapma ≤ %0,1).
- Koordinat sistemini parsel bazında kontrol et. ED50/UTM 6° ile ITRF/GK TM 3° karışırsa yaklaşık 90 m hata olur.
- Parsel alanı ile tesis (çit içi) alanı farklı olabilir; yerleşim tesis alanına göre yapılır.
- Tel çit uzunluğu tahminle değil, poligonların birleşik dış çevresinden ölçülür.

### F. Metraj
- Pafta ile yerleşim metrajı farklıysa yüksek olan esas alınır; kablo eksik alınmaz.
- Kablo kanalı uzunluğu güzergâh toplamı değildir (ortak hendek); ayrı hesaplanır.
- DC kabloda %3 fire.

### G. Proje yönetmeliği ve EKAT esasları (NotebookLM "elektrik proje" not defterinden)
**Proje dosyası (Elektrik Tesisleri Proje Yönetmeliği, üretim tesisi)**
- Klasör: Form-18 kapak, içindekiler, yetki yazısı + müellif PUS ve SMM/BTB, lisans / çağrı mektubu, bağlantı görüşü ve anlaşması, ÇED, tapu/kira.
- Hesaplar: YG/AG kablo (akım taşıma, gerilim düşümü), kısa devre (IEC 60909; TM/DM'den, 16–25 kA veya TEİAŞ verisi), röle koordinasyonu (eğri + set), topraklama + paratoner (IEEE 80 / yönetmelik; RE, adım-dokunma), iç ihtiyaç trafosu, kompanzasyon, DC iç ihtiyaç (akü), aydınlatma + acil aydınlatma.
- Paftalar: genel yerleşim vaziyet planı, YG ve AG tek hat, YG/AG güç dağıtım (kablo) planı, aydınlatma + acil aydınlatma, topraklama + paratoner, trafo ve YG hücre görünüş/kesit, yangın algılama/söndürme, fider hücre koordinasyon projesi, **elektriksel semboller ve anlamları tablosu**.
- Bu aracın karşılamadığı hesap ve paftalar "Proje Dosyası İçindekiler" sayfasında "AYRI HAZIRLANIR" diye listelenir; eksik bırakılmaz, gizlenmez.

**Pafta düzeni**
- Ebat A0–A4. Büyük paftalar sağdan 190 mm genişlikte katlanır, solda 20 mm cilt payı bırakılır.
- Başlık (antet) sağ altta, A4 genişliğinde, iki bölüm: alt bölüm proje bilgileri (şirket/yüklenici, yatırımcı, imalatçı, iş adı, pafta adı, müellif, çizen, kontrol, ölçek, pafta no, revizyon, tarih), üst bölüm POB kontrol ve onay. Araya revizyon tablosu.
- Ölçek: geniş alan 1/5000–1/25000, YG/AG vaziyet ve dış aydınlatma 1/1000–1/2000, bina/şalt 1/100–1/500, detay 1/10–1/50. Script plan paftalarında 1/500 → 1/1000 → 1/2000 → 1/5000 dener; `pafta: "oto"` ise aynı ölçekte önce A1, sığmazsa A0.
- Semboller TS / IEC / CENELEC; her paftada sembol tablosu.

**Onay**
- POB: lisanssız → TEDAŞ / yetkili EDAŞ; lisanslı → ETKB / yetkili POB (TEİAŞ, TEDAŞ); iletim (> 36 kV) → TEİAŞ; OSB içi → OSB / EDAŞ.
- Eksik bildirimi 15 iş günü, düzeltme 15 iş günü, onay ≤ 15 iş günü. Onay 5 yıl geçerli. Kapsam, güç veya tesisat değişikliğinde tadilat projesi; mevcut, ilave ve toplam güç tablo hâlinde gösterilir.
- Paftaları ve hesapları imzalayan PUS sahibi olmalı; serbest çalışan müellifte SMM + BTB.

**Topraklama (Elektrik Tesislerinde Topraklamalar Yönetmeliği)**
- Hedef: trafo merkezi ≤ 1 Ω; koruma ≤ 10 Ω; paratoner ≤ 10 Ω (TS EN 62305-3). AG dokunma UL ≤ 50 V (şantiye/tarım 25 V).
- EK-A: galvaniz şerit ≥ 90 mm² ve ≥ 3 mm (30×3,5 uygun); derin çubuk Ø ≥ 16 mm; bakır şerit ≥ 50 mm².
- Toprağa döşenen topraklama iletkeni, korumasızsa ≥ 25 mm² Cu / ≥ 50 mm² galvaniz. PE: S ≤ 16 → S; 16–35 → 16; > 35 → S/2. Ana potansiyel dengeleme ≥ 6 mm² Cu.
- Gömme 0,5–1 m. Gözlü topraklayıcı: RE = ρ/2D + ρ/L, D = (A/π)^½ (kaynaktaki tanımla).
- Zorlanma gerilimi UE = IE·RE: tf ≤ 5 s → ≤ 1200 V; tf > 5 s → ≤ 250 V. Dokunma gerilimi eğrisi: 1 s → ≈100 V, 0,5 s → ≈220 V (ölçümle doğrulanır).
- Trafo koruma ve AG işletme topraklaması arası ≥ 20 m veya yalıtılarak birleştirme.
- Toprak özgül direnci Wenner (ρ = 2πaR); yayılma direnci 3 nokta (%62 kuralı); yılda en az 1 ölçüm ve rapor.

**Gerilim düşümü ve kablo (EKAT md.58)**
- OG dağıtım ≤ %7 (TM sekonderinden), ring tek taraflı beslemede ≤ %10. AG genel ≤ %5; özel trafolu aydınlatma %6,5, kuvvet %8. (GES şartnamesi daha katıysa, ör. %1,5, o uygulanır.)
- %e = 100·L·P / (κ·S·U²) trifaze; κ Cu 56, Al 35 (projelerde 50/32 de alınır). Endüktif reaktans gerektiğinde ΔU = √3·I·L·(R cosφ + X sinφ)/1000.
- Gömme derinliği: alan dışı ≥ 0,60 m, sokak/alan ≥ 0,80 m. Altta ve üstte 10 cm elenmiş kum; üstüne ve AG–OG arasına dolu tuğla veya ≥ 6 cm beton plaka; ~30 cm üstüne ≥ 10 cm uyarı şeridi.
- Enerji kabloları arası ≥ kablo çapı, en az 7 cm; telekom/fiber ile ≥ 30 cm; doğalgaz/petrol borusuna paralel ≥ 0,6 m, kesişme ≥ 0,4 m. Yol/kanal geçişi boru içinde, boru üstü yüzeyden ≥ 1 m aşağıda.

**OG tesis (EKAT md.36–37)**
- Açık hava tesisi çiti ≥ 1,8 m, uyarı levhalı, dilli/güvenli anahtarlı kilit. 36 kV için a₀ = 320 mm, çit–aygıt A = a₀ + 1800 = 2120 mm, zemindeki aygıt–çit C = 1570 mm.
- Yağ hacmi > 1500 L trafoda sızdırmaz yağ toplama çukuru zorunlu (hacim ≥ yağ hacmi, ızgara üstü ≥ 5 cm çakıl). Bitişik trafolar arasında yangın duvarı.
- Tesise tek hat şeması, ilk yardım ve işletme talimatı levhaları asılır.

**AG pano (IEC 61439)**
- Tip testli (tasarım doğrulamalı) pano; tek hatta anma gerilimi, In, Icu/Icw, bara, IP ve form yazılır. GES ana dağıtım panosu (ADP): Form 4b (en az 3b); saha kutuları IP65, iç mekân IP54.

### Script bu esasları nasıl uyguluyor
| Esas | Uygulama | Parametre |
|---|---|---|
| A.1 | Tek yön DC her string için gerçek (masa arası) güzergâhla hesaplanır; blok bölme de bu boya göre yapılır. Script 80 m boy sınırıyla çalışır; ΔU sınıflaması (<%1 / %1–2 / ≥%2) raporda elle yapılır, %1–2 bandı kullanıcıya sorulur. | `elektrik.dc_tek_yon_max_m` |
| A.2–A.3 | DC masa başından iner; sıra açıklığında yürür, sıraları yalnız masa arası boşluktan (`serbest_x`) keser. AG kablo inverterden (masa başı) sıra açıklığına iner, açıklıktan kenar yola çıkar. DC ve AG aynı açıklıkta ayrı hendekte (eksenden ∓0,6 m). Topraklama şeritleri de açıklık ve masa arası boşluktan. Kontrol satırı "Masa altından geçen kablo/şerit yok" DC/AG/OG/topraklama için masa izdüşümüyle kesişimi metre olarak ölçer; 0 değilse ✖. | — |
| A.4–A.5 | İnverter yalnız masa başında durur. Blok, yol tarafına bakan uçtan en çok K masa derinlikte kurulur. | `elektrik.inverter_derinlik_masa` (3) |
| A.6 | Servis yolu ve ana kanal çit ile masa alanı arasındaki kenar bandındadır. TM'ler kenarda, DM parametreyle. | `elektrik.tm_taraf`, `dm_konum` |
| A.7 | İç koridor yok; `koridor_her_n_sira` verilse de yok sayılır. | — |
| A.8 | A.1 tutmazsa önce blok bölme/inverter kaydırma; olmazsa masa arası koridor + inverter; sıra uzun ve inverter çoksa köşk de koridora. Script bunu henüz otomatik yapmıyor (A.7 gereği koridoru yok sayıyor); bu durumda koridor tasarımı elle yapılır ve rapora gerekçe yazılır. | — |
| B | `sira_acikligi_m` verilirse eksen = açıklık + izdüşüm. Çekme 5 m'den başlar, `hedef_masa` tutmazsa 4, 3, 2 m'ye iner. | `masa.sira_acikligi_m`, `parsel.hedef_masa` |
| C | Scriptte yok, düz arazi varsayar. Eğimli arazide ayrı SAM analizi yapılır. | — |
| D | Voc marjı, MPPT akımı, trafo dengesi ve marjı, şebeke gerilimi, harici/köşk trafo, yağ çukuru metrajı. | `sebeke_gerilim_kv`, `mppt_sayisi`, `mppt_akim_a`, `voc_marj_min_pct` |
| E | EİGM alan sapması, koordinat sistemi, çok parselde birleşik poligon ve çit. | `parsel.eigm_alan_m2`, `koordinat` = poligon listesi |
| F | DC fire, ortak hendek ayrı, pafta metrajı yüksekse o esas alınır. | `elektrik.dc_fire_pct`, `metraj_pafta` |
| G | İki bölümlü antet + revizyon + POB onay alanı, 20 mm cilt / 190 mm katlama, yönetmelik ölçekleri ve otomatik A1/A0, sembol tablosu, 05 kanal detay paftası, içindekiler sayfası; OG düşüm %7, şerit EK-A, çubuk Ø16, RE ve UE hesabı, EKAT derinlik/kum/plaka, yağ çukuru, PUS/SMM kontrolleri; tek hatta pano Form/IP/Icw; topraklama paftasına yönetmelik notları. | `proje.tesis_tipi`, `muellif`, `pus_no`, `smm_no`, `revizyonlar`, `topraklama.toprak_ozdirenc_ohm_m`, `ik_toprak_a`, `hendek.*`, `elektrik.trafo_yag_l`, `ag_pano_*` |

Not: İnverter sayısı A.1'e göre ortaya çıkar, sonra TR'lere eşit dağıtılır (TR başına ≤ `inverter_tr`). SHAMS'taki sabit "19 inverter/TR" A.1 ile çelişirse A.1 kazanır ve rapor edilir.

## 3. Standart parametreler (varsayılan = SHAMS-1 onaylı uygulama)
**Masa (TİP-1, 2V13)**
- 2 sıra dikey × 13 modül = 26 modül = 1 string.
- Modül 2384×1303 mm, modül arası 20 mm, uç payı 2×80 mm → masa boyu 17.339 m.
- Eğim 25°, alt kenar 0,80 m, azimut 0°.
- 7 aks × 2,60 m, kolon sıraları arası 2,65 m, masa arası 0,50 m.
- Eksen (pitch) 8,70 m → açıklık 4,36 m, GCR yaklaşık 0,50. Paftada açıklık verilmişse `sira_acikligi_m` kullan.

**Alternatif masa (Gömce referansı, CA Müh., TEDAŞ onaylı 2024)**
- 2V13, modül 2279×1134 mm, 570 Wp → masa 14,98 m (D-B) × 4,30 m izdüşüm, eğim 20°.
- Eksen (pitch) 7,30 m → sıra açıklığı 3,00 m. Sıra içinde masa arası 0,20 m; koridor 5,0 m (4,0 m dar yerde).

**Masa başı parça çarpanı**

| Parça | Adet/masa |
|---|---|
| Kolon | 14 |
| Kiriş | 7 |
| Aşık | 12 |
| Rüzgarlık | 12 |
| Payanda | 7 |
| Çapraz | 12 |
| Orta klemp | 48 |
| Kenar klemp | 8 |
| M12 cıvata seti | 140 |

Hakediş adetleri bu çarpanlarla birebir tutmalı (SHAMS TR-1: 377 masa → 5.278 kolon).

**Temel:** Ø200 fore. Arka kolon 1,40 m delik / 1,30 m gömme; ön kolon 1,20 m / 1,10 m.
**Çelik:** Kolon S355JR sıcak daldırma galvaniz, diğer elemanlar S350GD-ZM310.

**Elektrik**
- String inverter: inverter başına en çok 20 string, TR başına en çok 19 inverter. Bloklar A.1'e göre kurulur (SHAMS referansı: 16×20 + 3×19 = 377).
- Trafo 5750 kVA, 33/0,8 kV, Dy11, ONAN.
- Her TR'de tek AG pano (ACB1), inverter başına 1 DSYA çıkışı.
- Kablolar:

| Kablo | Tip |
|---|---|
| AC | 3×300/150 NA2XY |
| DC | H1Z2Z2-K 1×6 (modül arası 4 mm²) |
| OG | 3×(1×120/16) NA2XSY 36 kV |
| DM çıkışı | 3×(1×240/25) NA2XSY |

- TM hücreleri: H-01 kesicili giriş-çıkış, H-02 kesicili trafo koruma, H-03 yük ayırıcılı giriş-çıkış.
- DM hücreleri: otoprodüktör giriş, ölçü, kesicili çıkışlar.

**Topraklama**
- Galvaniz şerit 30×3,5 mm, 0,60 m derinlik, ağ gözü ≤ 40 m (20–40 m), hedef direnç ≤ 1 Ω.
- Masa arası köprü 1×16 NYAF (DETAY-H). Konstrüksiyon bağlantısı DETAY-G, şerit-şerit bağlantısı DETAY-A.
- Çit içi 1 m'de çevre halkası; çit bağlantısı her 50 m'de.
- TM/DM çevre halkası, istasyon başına 4 çubuk.
- Paratoner: bina, trafo ve OG şalt.

**Saha**
- Çekme mesafesi 5 m; çit parselin 0,5 m içinde, 2 m yüksek.
- Çit direği her 3 m'de, uyarı levhası her 15 m'de.
- Aydınlatma + CCTV aynı direkte, köşelerde ve en çok 40 m arayla, çitin 1 m içinde. 5 kamerada bir switch panosu.
- Servis yolu 4 m, kenar bandında (A.6). İç koridor yok (A.7); yalnız A.8 gereğinde açılır.

**Şartname sınırları** (SHAMS Ek-5; yeni projede kendi şartnamesiyle güncelle)
- DC gerilim düşümü ≤ %1,5, AC ≤ %1,5, ρ_Cu = 0,0206 zorunlu.
- String Voc (Tmin'de) < 1500 V.
- Trafo marjı ≥ %10.
- Alt kenar, kar yüküne göre: 0–120 kg/m² için 0,60 m · 120–145 için 0,80 m · 145–170 için 1,00 m · >170 için 1,20 m.
- DC kablo AC ile aynı kanala girmez.

## 4. Pafta esasları
**Ortak kurallar**
- Tek model, tek kaynak: tüm paftalar aynı modelden üretilir, elle ayrı ayrı çizilmez.
- Masa, string, inverter ve TR sayıları her paftada aynı olmalı. SHAMS'ta tek hat 1885, yerleşim 1883 string gösteriyordu; bu hata tekrarlanmaz. Kontrol satırı bunu doğrular.
- Antet parametreden otomatik dolar (G: iki bölümlü A4 başlık): işin adı, pafta adı, yatırımcı, yüklenici/imalatçı, il/ilçe/ada/parsel, müellif (unvan, PUS, SMM, oda), kurulu güç, ölçek ve pafta no/toplam, revizyon/tarih/seviye, çizen/kontrol; üstte revizyon tablosu ve POB onay alanı. Kopya antet yok (SHAMS topraklama paftası "TEK HAT PLANI" antetiyle çıkmıştı).
- Ölçek: plan 1/500 → 1/1000 → 1/2000 → 1/5000, detay 1/10–1/50 (G). Tek hat ölçeksizdir.
- Pafta boyutu: `oto` (A1, sığmazsa A0). SHAMS B0 kullanmıştı.
- Birim: m (plan), mm (tek hat).

**Adlandırma**

| Nesne | Kalıp |
|---|---|
| String | `TR{t}-ACB1-INV{i}-STR{s}` |
| İnverter | `TR{t}-ACB1-INV{i}` |
| TM / DM | `TM{t}` / `DM` |
| Trafo | `TR{t}` |

- Numaralandırma: TR'ler kuzeyden güneye. Inverter içinde stringler sıra sıra dizilir.
- Dosya adı: `{KOD}_{paftaNo}_{ad}_{REV}`. Revizyon R00, R01…

**Katmanlar**
`GES-SINIR, GES-CEKME, GES-CIT, GES-YOL, GES-MASA, GES-STRING-NO, GES-INV, GES-TM, GES-DC-KABLO, GES-AC-KABLO, GES-OG-KABLO, GES-HENDEK-DC, GES-HENDEK-AC, GES-TOPRAK-SERIT, GES-TOPRAK-CUBUK, GES-TOPRAK-BAGLANTI, GES-AYD-CCTV, GES-SANTIYE, GES-TEKHAT, GES-TEKHAT-OG, GES-OLCU, GES-NOT, GES-ANTET`

**01 Genel yerleşim**
- İçerik: parsel, çekme, çit, kenar servis yolu, yasak alanlar, şantiye, masalar (TR'ye göre renkli), inverterler, TM ve DM, aydınlatma/CCTV direkleri.
- Özet satırı: masa, modül, string, inverter, TM sayıları; eksen, açıklık, eğim, alt kenar, GCR, azimut; çekme; koordinat sistemi.
- Uygulama seviyesinde ek olarak: masa üstünde string etiketi, parsel köşe numaraları, `APLIKASYON.csv`.

**02 Tek hat** (kullanıcı kuralı, 04.10.2026: hücreler çizgi/sembol kutusu olarak GÖSTERİLMEZ)
- Her OG hücresi gövdesiyle çizilir: hücre çerçevesi, başlık (H-no + hücre adı), bara bağlantısı ve içindeki tüm ekipman IEC 60617 sembolüyle, her birinin yanında anma değeri:
  - Yük ayırıcılı giriş: yük ayırıcı + motor kumandası (24 V DC), toprak ayırıcısı, KGG, kablo başlığı.
  - Kesicili (trafo koruma / giriş-çıkış / fider): 3 konumlu ayırıcı, kesici (SF6, kV-A-kA), AT (oran, VA, sınıf, 2 çekirdek), röle kutusu (ANSI kodları) + AT→röle ve röle→kesici açma kumanda bağlantıları, toprak ayırıcısı, KGG, kablo başlığı.
  - DM giriş (otoprodüktör): yukarıdakiler + hat tarafı sigortalı GT (3 sargı) + parafudr; uzun röle listesi (24, 27, 32P/Q, 37, 46, 49, 50/51, 50N/51N, 59, 59N, 67/67N, 79, 81, 50BF).
  - Ölçü hücresi: bara üzerinde seri geçiş, ölçü AT'leri (3 çekirdek), ayırıcı + sigorta + GT, ana ve yedek sayaç (EKK).
  - İç ihtiyaç hücresi: yük ayırıcı, sigorta 2 A, toprak ayırıcısı, iç ihtiyaç trafosu, iç ihtiyaç panosu/akü-redresör.
- Bara kalın dolu çizgi + etiket (kV, A, kA/1 s, Cu). Köşk ve pano sınırı kesikli; kumanda/ölçü bağlantıları mavi kesikli.
- TM paftası: OG hücreleri → trafo kablosu → güç trafosu (Δ/Y, nötr işletme topraklaması, kVA, gerilim, %uk, harici/köşk içi) → AG ana dağıtım panosu (motorlu çekmeceli ACB, AT, enerji analizörü, koruma rölesi, AG bara, iç ihtiyaç çıkışı izolasyon trafosuyla, parafudr çıkışı, her inverter için DSYA + kablo tipi/uzunluğu + inverter kutusu, string × modül, kW).
- DM paftası: DM hücre dizisi + DM fiderinden TM zincirine OG kablolar (tip, uzunluk); her TM küçük ölçekli hücre dizisi + trafo ile, "detay pafta 02-n" referansı.
- Her tek hat paftasında "Elektriksel semboller ve anlamları" tablosu (sağ üst) ve notlar.
- Hücre seti ve değerleri `elektrik.tm_hucreler` / `elektrik.dm_hucreler` (liste: no, tip = ya_giris | trafo_koruma | kesicili | giris_kesicili | olcu | ic_ihtiyac, ad, kesici, at, gt, role, sigorta…), `og_bara`, `dm_bara`, `dm_yedek_fider`, `og_trafo_kablo`, `trafo_ag_kablo`, `trafo_uk_pct`, `ag_ana_kesici`, `ag_at`, `ag_bara`, `ag_ic_ihtiyac`, `ag_parafudr`, `ag_inv_cikis` ile verilir; yoksa SHAMS-1 onaylı tek hat değerleri kullanılır. DSYA anma akımı inverter kW'ından hesaplanır (≥ 1,25 × In).
- Röle ANSI kodları ve koruma notları şartnameden gelir. Açma zamanı ≤ 0,5 s; dağıtım şirketi belirlemezse 0,3 s.

**03 Topraklama**
- İçerik: ağ (yatay her ⌊göz/pitch⌋ sırada, düşey her göz_max'ta), sıra branşmanları, çevre halkası, TM halkaları, çubuklar, bağlantı noktaları.
- Pafta notları: EK-A boyutları, hedef/hesap RE, trafo koruma–işletme topraklaması 20 m ayrımı, eşpotansiyel, yıllık ölçüm.
- Metraj: şerit m, çubuk, DETAY-G, köprü, çit bağlantısı adetleri.

**04 Kablo güzergâh**
- DC: masa konstrüksiyonu üzerinden masa başına; oradan sıra açıklığındaki DC hendeğine iner; sıra geçişi masa arası boşluktan ya da sıra ucundan, boru içinde (bkz. 8.1). Masa altından geçmez.
- AG: inverter → ön/arka masa arasındaki sıra açıklığı → kenar servis yolu hendeği → TM (A.3, A.6). Masa altından geçmez.
- OG: kenar yol hendeğinde, DM'den TM'lere en kısa yön zinciri.
- Uzunluk formülleri:
  - String tek yön = masa başından invertere gerçek güzergâh (açıklık + masa arası geçişler) + 3 m; toplam = 2 × tek yön + masa boyu; metrajda +%3 fire. Uygunluk A.1'deki ΔU kriteriyle.
  - AC = güzergâh + 10 m.
  - OG = güzergâh + 20 m.

**05 Kanal detay**
- DC sıra geçişi, AG ve AG+OG ortak hendek kesitleri 1/10–1/20: derinlik, kum, tuğla/beton plaka, uyarı şeridi, kablo aralığı ve EKAT md.58 notları. Proje sahibinin kendi kesiti varsa (ör. Gömce kum 0,20/0,40 m, 40×20×5 tuğla) `hendek.*` ona göre girilir.

**Metraj → hakediş eşlemesi.** Her metraj satırında kaynak pafta ve hakediş kalemi yazar:
- Kolon, kiriş, aşık, rüzgarlık, payanda, PV → mekanik ilerleme.
- 1×6 solar kablo, AG-OG kanal+kablo, OG başlık, köşk hücre/pano, inverter+trafo, CCTV-aydınlatma → elektrik ilerleme.

## 5. Seviyeler
**Teklif**
- Hızlı yerleşim, kapasite, ön metraj ve kontrol.
- Etiketler sade (INV no, TM no).
- Açık konular listesi zorunlu: eksik datasheet, çelişkiler, marjlar, B açıklık/eksen teyidi.

**Uygulama**
- Tüm string etiketleri, parsel köşe numaraları, aplikasyon koordinatları.
- Gerçek koordinat sistemi zorunlu; EİGM alan kontrolü ✔ olmalı; müellif PUS/SMM dolu olmalı.
- Tüm kontroller ✔ olmadan "uygulama" diye teslim etme; ✖ varsa listele ve kullanıcıya sor.
- As-built: sahadaki her değişiklik JSON'a işlenir, yeni revizyonla yeniden üretilir. Kablo ek koordinatları da işlenir.

## 6. İş akışı
1. JSON'u hazırla veya güncelle. Proje dokümanına `claude/{kod}-parametre.json` olarak kaydet.
2. Scripti çalıştır. Konsoldaki kontrol ve uyarıları oku.
3. PDF'i `pdftoppm -r 45` ile PNG'ye çevir, her paftaya bak: taşma, üst üste binme, boş alan, TM'nin masa üstüne düşmesi, yolun kenarda olması, masa alanında koridor olmaması, hiçbir kablonun masa altından geçmemesi, antetin çizime binmemesi.
4. ✖ varsa önce kök nedeni düzelt (parametre ya da tasarım), yeniden üret. Belirtiyi yamama.
5. Teslim et: HTML'i Artifact olarak yayınla; PDF, DXF/DWG ve metraj CSV'yi gönder. Sonra kontrol tablosu ve açık konular (kısa).
6. Proje dokümanına özet yaz: sayılar, açık konular, revizyon.
7. Başka bir araçla (ör. eski yerleşim motoru) üretilmiş planları bu esaslara göre denetle; A.6/A.7 ihlali (ortadan geçen kanal, masa alanında koridor) A.8 gerekçesine dayanmıyorsa yeniden üret.

## 7. Bilinen sınırlar (scriptte)
- Sıralar tek azimutta. Topoğrafya (kot, C esasları) yok: eğimli arazide SAM ile ayrı analiz ve statik doğrulama yapılır.
- TR sayısı inverter blok sayısından hesaplanır. Trafo marjı ✖ çıkarsa `inverter_tr` veya `trafo_kva` değiştirilir.
- DM konumu verilmezse otomatik konur ve uyarı verilir; ENH noktasına göre `dm_konum` girilmeli.
- Hendek kesitleri EKAT md.58 varsayılanlarıyla çizilir (05 paftası); şartname/proje sahibi detayı farklıysa `hendek.*` güncellenir.
- Kısa devre, röle koordinasyonu, kompanzasyon, iç ihtiyaç, DC iç ihtiyaç, aydınlatma (lüks) hesapları, paratoner koruma yarıçapı, YG hücre/trafo görünüş-kesit, yangın planı ve SAP2000 statik modeli bu aracın kapsamı dışında; içindekiler sayfasında "AYRI HAZIRLANIR" olarak listelenir.

## 8. Referans tipoloji: iç koridorlu blok (Gömce GES, 40,10 MWp / 37,61 MWe)
Kaynak: Gömce GES onaylı projesi (SGYP-1, Tek Hat, Topraklama DWG + gömülü kablo tabloları), 26.09.2026 analizi ve kullanıcı düzeltmesi. Bu bölüm başka müelliflerin onaylı projelerini okurken, metraj çıkarırken ve teklif fiyatı kurarken referanstır.

**Bağlayıcı esaslarla ilişkisi:** Gömce AG kanalını masa alanının içindeki K-G koridorlarından geçirir. Bu, A.8'deki istisnanın (adım 2–3) uygulanmış hâlidir: uzun sıralarda masa arası koridor, inverter ve köşk koridorda. Kendi tasarımımızda koridora ancak A.8 sırası izlenerek gidilir. Gömce'de DC ΔU en çok %1,24 (%2 altı); koridor aralığı DC açısından kabul edilebilir, sorun AC tarafında (8.2 gerilim düşümü).

### 8.1 DC kablo ve DC kanal yapısı
- String kablosu masa boyunca konstrüksiyonun içinden taşınır ("solar kabloların konstrüksiyon içerisinden taşınımı"). Sıra boyunca yerde kanal yok.
- **Sıra geçişi masa başından yapılır:** kablo masa ucunda iner, masa başının **hemen yanında** açılan kazıda **boru içinde** sıra açıklığını geçer, bir sonraki sıranın masa başına ya da invertere ulaşır.
- **Pafta okuma uyarısı:** Gömce planında DC geçiş kanalı masa ucundan 0,9–1,9 m içeride, masanın içinden geçiyormuş gibi çizilmiş. Gerçekte kanal masa başının yanındadır, masanın altından geçmez. Başka müellif paftalarında da bu gösterimi "masa altı" diye okuma; metraj ve kazıyı masa başı geçişi olarak al.
- Kendi çizimimizde DC geçiş kanalını masa başının dışına, masa ucuna bitişik çiz (`GES-HENDEK-DC`); masa izdüşümüyle çakıştırma.
- Geçiş kanalı ölçüleri: genişlik 0,40 m, boy = sıra açıklığı (3,0 m), kum 0,20 m, kablolar boru içinde.
- Adet: 364 geçiş / 151 inverter ≈ 2,4 (inverter başına 1–10, medyan 2). Kanal hesabında "DC Atl." satırı: 1.500 m.
- İnverter masanın **arka kolonuna monte** edilir (DETAY-E), masa başında, sıra açıklığı tarafında (3,2 × 1,4 m yer). Kablolar spiral boruyla iner.
- String kablo ort. tek yön 57,7 m, medyan 55 m, en çok 165 m. 726 string 80 m'yi aşıyor ama ΔU'ya göre: 2.643 string < %1, 78 string %1–1,24, %2'yi aşan yok. A.1'e göre bölme gerekmez; 78 string %1–2 bandında olduğundan kullanıcıya sorulacak türden.
- Metraj oranları: DC kablo 115 m/string (iki kutup), 7.825 m/MWp.

### 8.2 AG (AC) kablo kanalı yapısı
- Masa blokları K-G doğrultusunda 5,0 m koridorla ayrılır; bir TR'nin inverterleri tek koridor boyunca, koridorun iki yanında masa uçlarında şaşırtmalı dizilir.
- İnverter → ana kanal: 0,5 × 2,6 m kısa bağlantı kanalı (inverter başına 1).
- Ana AG kanalı koridorun içinde; genişlik kablo sayısıyla **kademeli** artar, köşke yaklaştıkça genişler: 0,4 → 0,6 → 0,8 → 1,0 → 1,3 → 1,6 → 2,0 → 2,6 m. Çıkarım: tek sıra düz döşemede ≈ 0,10 m / 3×150 kablo + kenar payı; 24 kablo ≈ 2,6 m.
- Kesit: kum yatak/örtü 0,20 m (AG, tip A), 0,40 m (ortak ve OG kanal, tip B–F). Üst koruma 40×20×5 tuğla, aralık 7×7×14 tuğla. Derinlik projede sayısal yok → "TEDAŞ kablo döşeme usul ve esaslarına göre" notu.
- Kanal tipleri: A = AG inverter kanalı (2.405 m); B/C/D = 1,0–2,6 m ortak ana kanal; E = OG (0,8 m tek fider, 1,8 m çok fider; 1.030 m); F = 1,0 m × 160 m; TM girişinde OG kanal tip K6A.
- Kablo: 0,6/1 kV 3×150 NA2XH (Al), inverter başına ayrı hat. ADP → trafo: 1×240 N2XH, fazda 8–12 damar, 10 m.
- Oranlar: AC kablo ort. 125 m/inverter, en çok 320 m; kanal toplamı 142 m/MWp; kum 0,23 m³/m kanal.
- **Gerilim düşümü sınırı:** 250 kW inverter, 800 V, 180,5 A, 3×150 Al → %1,5 için L ≈ 145 m (90 °C) / 186 m (20 °C). Gömce'de 53 hat > 150 m, en uzunu %2,6–3,3. Uzun hatta kesit 3×240'a çıkar ya da köşkü yük merkezine taşı.

### 8.3 Trafo (köşk) konumlandırma
- 1 TR = 1 koridor bloğu, 13–25 inverter; blok boyu K-G 130–380 m.
- Köşk: Tip 2H/A monoblok beton köşk (OG hücre + ADP), trafo **harici tip** hemen yanında; 6,3/5,0/3,5 MVA, 31,5/0,8 kV, %Uk 8.
- Yer: koridorun ucunda ya da koridor ile ana D-B kanalının kesiştiği düğümde. 7 köşkün 6'sı çitten 6–17 m içeride (servis yolu erişimi), 1'i içte (80 m).
- Köşk yük ağırlık merkezinde **değil**: merkeze 43–149 m → AC ort. 87–156 m, en çok 180–320 m. **Öğreti:** köşkü inverterlerin ağırlık merkezine ≤ 50 m koy; blok 250 m'yi aşıyorsa köşk koridorun ortasına (iki yöne besleme) alınır. Kenarda kalması gerekiyorsa AC kesiti gerilim düşümüne göre büyütülür.
- Yükleme: kVA/kWe ≈ 1,05 (6.300/6.000, 5.000/4.750, 3.500/3.250); DC/AC 1,055–1,077.
- OG: her köşkten TM'ye **radyal ayrı fider**, 3×(1×150/25) NA2XSY, 280–1.355 m; güzergâh/düz mesafe 1,2–1,45. OG ana koridor kanallarını kullanır; TM (154/31,5 kV) sahanın ENH tarafındaki ucunda.
- Metraj kontrolü: tek hat ADP güçlerinin toplamı = tesis AC gücü (Gömce 37.610 kWe); trafo toplamı ≥ 1,05 × AC.

### 8.4 Topraklama oranları (Gömce)
- 30×3,5 galvaniz şerit 257 m/MWp (10.314 m); topraklama çubuğu 65×65×7 köşebent L=1,5 m, 54 adet (köşk ve TM çevresinde).
- Tel çit (panel fens + jiletli tel) 173 m/MWp.

## 9. Birim fiyat referansı (Gömce, 3. tur teklif ortalaması ÷ onaylı metraj, USD, KDV hariç, 2026)
Teklif seviyesinde metrajı fiyatlamak için. Tek proje, tek tur; bölge Denizli. Kaynak: `Gomce_GES_Metraj.xlsx` → "Birim Fiyat"; proje dokümanı `claude/gomce-birim-fiyat-referansi.md` (Micronerji projesi).

| Kalem | Ortalama | En düşük | Birim |
|---|---|---|---|
| Panel 570 Wp | 95,6 (0,168 $/Wp) | 91,0 | $/panel |
| İnverter 250 kW | 6.140 | 5.417 | $/adet |
| AG/OG şalt (köşk+hücre+trafo+ADP) | 22.708 | 13.579 | $/MVA |
| Taşıyıcı 2V13 | 849 | 726 | $/masa |
| Rok (kaya kazısı, zemine bağlı) | 268 | 157 | $/masa |
| AC kablo 3×150 NA2XH (OG dahil olabilir) | 29,4 | 12,2 | $/m |
| DC kablo 1×6 H1Z2Z2-K | 1,18 | 0,78 | $/m |
| İşçilik (mekanik+elektrik) | 27,7 | 17,1 | $/panel |
| Hafriyat (kablo kanalı) | 72,8 | 35,8 | $/m kanal |
| 154 kV şalt sahası | 134.857 | 120.420 | $/MWe |
| 154 kV ENH 1272 MCM | 257.927 | 147.419 | $/km |
| Konaklama/nakliye/kâr + diğer | %7,1 + %7,5 | — | toplamın |

Ölçek: GES 0,458 $/Wp (şalt/ENH hariç), toplam 0,674 $/Wp; elektrik BOS 0,069, mekanik BOS 0,154 $/Wp. En düşük teklifler pazarlık hedefidir; ortalamanın %60'ının altındaki birim fiyat kapsam teyidi ister. Yeni proje referansı eklendikçe bu tabloya sütun olarak ekle, tek projeye dayanma.