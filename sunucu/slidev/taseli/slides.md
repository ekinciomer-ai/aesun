---
theme: default
title: Taşeli GES – İş Planı
info: Aksaray Enerji · Taşeli GES mekanik ve elektrik montaj iş planı
colorSchema: light
transition: fade
aspectRatio: 16/9
canvasWidth: 1000
routerMode: hash
download: false
fonts:
  provider: none
  sans: Inter
---

<div class="kapak">
  <img class="kapak-bg" src="/saha.svg" />
  <Logo class="kapak-logo" />
  <div class="kapak-ic">
    <div class="ust-etiket">İŞ PLANI VE ÇALIŞMA YÖNTEMİ</div>
    <h1 class="dev">Taşeli GES</h1>
    <div class="kapak-alt">1.130 MWp · mekanik ve elektrik montaj</div>
    <div class="kapak-cizgi"></div>
    <div class="kapak-not">10 blok · her biri 113 MWp · her biri kendi başına üretime geçer</div>
  </div>
</div>

---
class: koyu dikey
---

<div class="ust-etiket">TEK CÜMLEDE</div>

<h2 class="manifest">1.130 MWp'yi <em>10 bağımsız blokta</em> kuruyoruz.<br/>Her blok <em>17 haftada</em> üretime geçer.</h2>

<div class="dev-sayilar">
  <div v-click><b>1.130</b><span>MWp DC<br/>≈ 1.000 MWe AC</span></div>
  <div v-click><b>10</b><span>blok<br/>× 113 MWp</span></div>
  <div v-click><b>17</b><span>hafta<br/>her blok</span></div>
  <div v-click><b>≈12</b><span>ay<br/>4 cepheyle tüm saha</span></div>
</div>

---
class: koyu
---

<div class="ust-etiket">YÖNTEM</div>

# Saha 10 bloğa bölünür, her blok tek başına bir santraldir

<div class="bloklar">
  <div v-for="n in 10" :key="n" class="blok" :style="{ animationDelay: (n * 70) + 'ms' }">
    <span class="blok-no">{{ String(n).padStart(2, '0') }}</span>
    <span class="blok-mw">113 MWp</span>
    <span class="blok-alt">≈ 2.168 tracker · ≈ 6.406 dizi</span>
  </div>
</div>

<div class="uc-kural">
  <div v-click><i>01</i>Bloklar istasyon sınırlarına göre ayrılır</div>
  <div v-click><i>02</i>Her bloğun kendi şantiye ekibi ve makine parkı vardır</div>
  <div v-click><i>03</i>İstasyonları ve dizileri biten blok ayrı devreye alınır</div>
</div>

---
layout: center
class: bolum
---

<div class="bolum-no">01</div>
<h1 class="bolum-ad">Kapsam</h1>
<p class="bolum-alt">Montaj işçiliği ve gereken iş makineleri bizden, malzemenin tamamı işverenden.</p>

---
class: koyu
---

<div class="ust-etiket">KAPSAMA DAHİL</div>

# Kazıktan devreye almaya kadar her montaj işi tek elden

<div class="kapsam">
  <div><b>Mekanik</b><span>Kazık ön delgisi (kayada Ø230 mm), kazık çakma ve delik betonu, tracker ve panel montajı, DC toplama kutuları</span></div>
  <div><b>Elektrik</b><span>Solar kablo ve MC4, 1,8/3 kV DC ana kablo, 0,6/1 kV ve 33 kV kablolar, başlık ve ekler, fiber / CAT-6 / RS485</span></div>
  <div><b>Kablo kanalları</b><span>OG, DC, topraklama ve aydınlatma kanalları: kazı, kum, geri dolgu, ikaz bandı, koruma plakası</span></div>
  <div><b>İstasyonlar</b><span>İnverterli trafo istasyonlarının yerine konması, OG/AG ve DC bağlantıları, haberleşme cihazları</span></div>
  <div><b>Topraklama</b><span>Yatay ağ, termit kaynak, topraklama kazıkları, panel ve konstrüksiyon iletkenleri</span></div>
  <div><b>CCTV · aydınlatma</b><span>530 kamera (5 m direk), 4.900 adet 10 m aydınlatma direği ve armatürü</span></div>
  <div><b>İzleme ve kontrol</b><span>PV SCADA, santral güç kontrolü (PPC), güç tahmini, 9 meteoroloji istasyonu</span></div>
  <div><b>Robot · yangın</b><span>2.200 takım panel temizlik robotu, yangın algılama (FAS), yangın yalıtımı</span></div>
  <div><b>Test · taşıma</b><span>Dizi ve OG kablo testleri, istasyon ve santral devreye alma, saha içi malzeme taşıma</span></div>
</div>

---
class: koyu
---

<div class="iki-kolon">
<div>
<div class="ust-etiket">KAPSAM DIŞI</div>
<h1>Bizim işimiz değil</h1>
<ul class="cizgili">
  <li>Tüm malzemeler: panel, konstrüksiyon, kazık, kablo, istasyon, pano, beton, kum, boru, demir</li>
  <li>İnşaat işleri: tesviye, kazı-dolgu, istasyon ve direk temelleri, yollar, çit, drenaj, geçici tesisler</li>
  <li>Kazık çekme ve yükleme testleri; mühendislik ve şebeke model çalışmaları</li>
  <li>Sahaya gelen malzemenin araçtan indirilmesi ve yüklenmesi</li>
</ul>
</div>
<div class="kutu-kirmizi">
<div class="ust-etiket acik">BAŞLAMAK İÇİN İŞVERENDEN</div>
<h1>Beş şart, sonra sahadayız</h1>
<ol class="numarali">
  <li v-click>Tesviyesi bitmiş, aplikasyon noktaları verilmiş alan</li>
  <li v-click>Malzeme teslim programı ve saha indirme alanı</li>
  <li v-click>Montajdan önce hazır istasyon ve direk temelleri</li>
  <li v-click>Şantiye için elektrik ve su bağlantı noktası</li>
  <li v-click>Onaylı uygulama projeleri ve kazık testi sonuçları</li>
</ol>
</div>
</div>

---
layout: center
class: bolum
---

<div class="bolum-no">02</div>
<h1 class="bolum-ad">Ekip ve makine</h1>
<p class="bolum-alt">Her 113 MWp blok kendi şantiye ekibiyle yürür; mekanik ve elektrik aynı blokta ardışık çalışır.</p>

---
class: koyu
---

<div class="ust-etiket">ŞANTİYE ORGANİZASYONU · BLOK BAŞINA</div>

# Her blokta net bir sorumlu zinciri

<div class="org">
  <div class="org-ust"><b>Proje müdürü</b><span>tüm saha · işveren koordinasyonu, program, hakediş</span></div>
  <div class="org-orta"><b>Şantiye şefi</b><span>bloğun günlük yönetimi, iş dağılımı</span></div>
  <div class="org-alt">
    <div><b>Mekanik şef</b><span>kendi ekiplerinin sırası ve kalitesi</span></div>
    <div><b>Elektrik şef</b><span>kendi ekiplerinin sırası ve kalitesi</span></div>
    <div><b>Kalite kontrol müh.</b><span>formlar, tutanaklar, test kayıtları</span></div>
    <div><b>İSG uzmanı</b><span>risk, eğitim, saha denetimi</span></div>
    <div><b>Malzeme sorumlusu</b><span>saha içi takip ve dağıtım</span></div>
  </div>
  <div class="org-formen"><b>Formen</b> · her 20–25 kişiye 1 · ekip yönetimi ve günlük rapor</div>
</div>

---
class: koyu
---

<div class="ust-etiket">ÖLÇÜLEBİLİR VERİM</div>

# Bir ekip, bir günde

<div class="verim">
  <div><b>120</b><span>delik</span><i>kazık ön delgisi · 2 işçi + rok</i></div>
  <div><b>250</b><span>kazık</span><i>kazık çakma · 1 usta + 3</i></div>
  <div class="vurgu"><b>3</b><span>tracker</span><i>3 dizili · 1 usta + 7</i></div>
  <div><b>350</b><span>panel</span><i>panel montajı · 1 usta + 5</i></div>
  <div><b>3 km</b><span>solar kablo</span><i>MC4 dahil · 1 usta + 5</i></div>
  <div><b>2.000 m</b><span>33 kV (1×630)</span><i>2 usta + 10</i></div>
  <div><b>2 km</b><span>topraklama ağı</span><i>1 usta + 4</i></div>
  <div><b>60</b><span>dizi testi</span><i>1 uzman + 1</i></div>
</div>

<p class="dip">21 iş kaleminin tamamı ekip, makine ve günlük verimiyle Ek A'da.</p>

---
class: koyu
---

<div class="ust-etiket">MAKİNE PARKI · 113 MWp BLOK, EN FAZLA</div>

# Kendi makinemizle, iş bittiği hafta sahadan çıkar

<div class="makine">
  <div class="m"><span class="ad">Kepçe · JCB 3CX kırıcılı</span><span class="piktogram"><i v-for="n in 7" :key="n"></i></span><span class="say">7</span><span class="ne">kablo kanalları · 4.–11. hafta</span></div>
  <div class="m"><span class="ad">Manitou</span><span class="piktogram"><i v-for="n in 5" :key="n"></i></span><span class="say">5</span><span class="ne">kazık, tracker, panel dağıtımı · 5.–13. hafta</span></div>
  <div class="m"><span class="ad">Rok delgi makinesi</span><span class="piktogram"><i v-for="n in 3" :key="n"></i></span><span class="say">3</span><span class="ne">kazık ön delgisi · 1.–13. hafta</span></div>
  <div class="m"><span class="ad">Kablo çekme + makara römorku</span><span class="piktogram"><i v-for="n in 2" :key="n"></i></span><span class="say">1–2</span><span class="ne">OG ve DC ana kablolar</span></div>
  <div class="m"><span class="ad">Kato (mobil vinç)</span><span class="piktogram"><i></i></span><span class="say">1</span><span class="ne">istasyon ekipmanı, makaralar · 8.–13. hafta</span></div>
  <div class="m"><span class="ad">Büyük vinç 150 t</span><span class="piktogram"><i></i></span><span class="say">1</span><span class="ne">istasyonların yerleştirilmesi</span></div>
  <div class="m"><span class="ad">16 t vinç</span><span class="piktogram"><i></i></span><span class="say">1</span><span class="ne">10 m direk dikimi · ≈ 1 ay</span></div>
  <div class="m"><span class="ad">Personel servisi (20 kişilik)</span><span class="piktogram"><i v-for="n in 12" :key="n" class="ince"></i></span><span class="say">≤12</span><span class="ne">işçi sayısına göre</span></div>
</div>

<p class="dip">Rok ve makine operatörleri ekip ve işçi sayılarına dahil değildir.</p>

---
layout: center
class: bolum
---

<div class="bolum-no">03</div>
<h1 class="bolum-ad">Program</h1>
<p class="bolum-alt">Üç iş hattı aynı anda ilerler; bir iş, öncekisi kontrol edilip teslim alınmadan başlamaz.</p>

---
class: koyu
---

<div class="ust-etiket">ÇALIŞMA ŞEKLİ</div>

# Üç hat, tek birleşme noktası

<div class="hatlar">
  <div class="hat"><span class="hat-ad">Mekanik</span>
    <div class="adimlar"><div>Aplikasyon<i>1. hf</i></div><div>Delme<i>1–13</i></div><div>Kazık + beton<i>2–13</i></div><div class="ana">Tracker<i>3–14</i></div><div>Panel<i>5–15</i></div></div></div>
  <div class="hat"><span class="hat-ad">Kanal · kablo</span>
    <div class="adimlar"><div>Kanal kazısı<i>+ topraklama</i></div><div>Kablo çekme<i>OG + DC ana</i></div><div>Kanal kapatma<i>kum + dolgu</i></div><div class="bos"></div><div>Dizi kabloları<i>5–15</i></div></div></div>
  <div class="hat"><span class="hat-ad">İstasyon · sistem</span>
    <div class="adimlar"><div>TR istasyonu<i>8–14</i></div><div>Bağlantılar<i>inverter, OG</i></div><div>Sistemler<i>CCTV, SCADA</i></div><div class="bos"></div><div class="test">Testler<i>14–17</i></div></div></div>
  <div class="bitis"><span>DEVREYE ALMA</span><b>17. hafta</b></div>
</div>

<div class="kurallar">
  <div v-click><b>Mesafe korunur.</b> Delmeden 1 hafta sonra kazık, 2 hafta sonra tracker ekibi gelir.</div>
  <div v-click><b>Kanal kontrolsüz kapanmaz.</b> Kablo çekilip kontrol edildikten sonra kapatılır.</div>
  <div v-click><b>Birleşme.</b> Panel ve DC kablo hazır olunca dizi bağlantısı, ardından test.</div>
</div>

---
class: koyu
---

<div class="ust-etiket">113 MWp BLOK · 17 HAFTA · HAFTADA 6 GÜN</div>

# Tracker montajı programı belirler

<div class="grafik-kutu">
<Gantt :weeks="17" :months="[{t:'1. AY',s:1,e:4},{t:'2. AY',s:5,e:9},{t:'3. AY',s:10,e:13},{t:'4. AY',s:14,e:17}]" :rows="[
 {n:'Mobilizasyon, aplikasyon',k:11,s:1,e:1,g:'g'},
 {n:'Delme (rok taşeronu)',k:'rok',s:1,e:13,g:'m'},
 {n:'Kazık çakma + beton',k:9,s:2,e:13,g:'m'},
 {n:'Tracker montajı',k:79,s:3,e:14,g:'m',v:true},
 {n:'Panel montajı',k:46,s:5,e:15,g:'m'},
 {n:'AC / OG kablo',k:11,s:3,e:12,g:'k'},
 {n:'DC kablo',k:41,s:4,e:15,g:'k'},
 {n:'Topraklama',k:3,s:3,e:12,g:'k'},
 {n:'TR istasyonu, inverter',k:14,s:8,e:14,g:'i'},
 {n:'CCTV, aydınlatma',k:16,s:9,e:15,g:'i'},
 {n:'SCADA, robot, yangın',k:6,s:12,e:16,g:'i'},
 {n:'Testler, devreye alma',k:11,s:14,e:17,g:'g'},
 {n:'Toparlama',k:11,s:17,e:17,g:'g'}]" />
<div class="lejant"><span><i style="background:#e5212f"></i>Mekanik</span><span><i style="background:#f28a8f"></i>Kablo ve kanal</span><span><i style="background:#aeb6c2"></i>İstasyon ve sistemler</span><span><i style="background:#5c636e"></i>Genel, test</span></div>
</div>

---
class: koyu
---

<div class="ust-etiket">PERSONEL · 113 MWp BLOK</div>

<div class="baslik-sayi">
  <h1>9.–14. haftada zirve,<br/>son iki haftada sahadan çekilme</h1>
  <div class="mini"><div><b>225</b><span>en fazla</span></div><div><b>147</b><span>ortalama</span></div><div><b>≈15.000</b><span>adam-gün</span></div></div>
</div>

<Sutun :v="[11,9,102,143,189,189,189,203,219,219,219,225,211,213,120,17,22]" :h="235" />

<div class="makine-satir">
  <div><b>Rok</b><span v-for="(x,i) in [3,3,3,3,3,3,3,3,3,3,3,3,3,0,0,0,0]" :key="i" :class="{ s: !x }">{{ x || '·' }}</span></div>
  <div><b>Kepçe</b><span v-for="(x,i) in [1,2,5,7,7,7,7,7,7,7,7,5,3,3,2,1,1]" :key="i">{{ x }}</span></div>
  <div><b>Manitou</b><span v-for="(x,i) in [0,1,2,2,5,5,5,5,5,5,5,5,5,2,2,1,0]" :key="i" :class="{ s: !x }">{{ x || '·' }}</span></div>
</div>

---
class: koyu
---

<div class="ust-etiket">TÜM SAHA</div>

# Toplam süreyi siz seçersiniz: aynı anda kaç cephe?

<div class="cepheler">
  <div><span class="c-say">2</span><span class="c-ad">cephe</span><b>≈ 20 ay</b><i>450 kişi · 6 rok · 14 kepçe · 10 manitou</i></div>
  <div><span class="c-say">3</span><span class="c-ad">cephe</span><b>≈ 16 ay</b><i>675 kişi · 9 rok · 21 kepçe · 15 manitou</i></div>
  <div class="secili"><span class="rozet">ÖNERİLEN</span><span class="c-say">4</span><span class="c-ad">cephe</span><b>≈ 12 ay</b><i>900 kişi · 12 rok · 28 kepçe · 20 manitou</i></div>
  <div><span class="c-say">5</span><span class="c-ad">cephe</span><b>≈ 8 ay</b><i>1.125 kişi · 15 rok · 35 kepçe · 25 manitou</i></div>
  <div><span class="c-say">10</span><span class="c-ad">cephe</span><b>≈ 4 ay</b><i>2.250 kişi · 30 rok · 70 kepçe · 50 manitou</i></div>
</div>

<p class="dip">Kişi ve makine sayıları en yüksek değerlerdir. Her cephe 17 haftalık blok programını uygular, biten cephe bir sonraki bloğa geçer. Cephe sayısı malzeme teslim programı ve inşaat ilerleyişiyle birlikte kesinleşir.</p>

---
class: koyu
---

<div class="ust-etiket">ÖRNEK SENARYO · 4 CEPHE</div>

# Santral 113 MWp'lik adımlarla üretime geçer

<div class="senaryo">
  <div class="sn-grid">
    <div class="sn-ay"><span v-for="a in 12" :key="a">{{ a }}</span></div>
    <div v-for="(c, i) in [[1,5,9],[2,6,10],[3,7],[4,8]]" :key="i" class="sn-satir">
      <span class="sn-ad">{{ i + 1 }}. cephe</span>
      <div class="sn-iz">
        <div v-for="(b, j) in c" :key="b" class="sn-blok" :style="{ left: (j * 33.33) + '%', animationDelay: (j * 300 + i * 80) + 'ms' }">Blok {{ b }}</div>
      </div>
    </div>
  </div>
  <div class="merdiven">
    <div v-click class="mr" style="height:40%"><b>452</b><span>MWp · 4. ay</span></div>
    <div v-click class="mr" style="height:80%"><b>904</b><span>MWp · 8. ay</span></div>
    <div v-click class="mr son" style="height:100%"><b>1.130</b><span>MWp · 12. ay</span></div>
  </div>
</div>

<p class="dip">Cepheler bir ay arayla açılırsa en yüksek işçi ve makine sayısı tablodakinin altında kalır, çünkü blokların yoğun haftaları çakışmaz.</p>

---
class: koyu
---

<div class="ust-etiket">İKİ YOL</div>

# Hız mı, sabit ekip mi?

<div class="iki-yol">
  <div class="yol hizli">
    <span class="yol-etiket">HIZLI</span>
    <h3>4 aylık blok · 4 cephe</h3>
    <div class="yol-buyuk"><b>≈ 12</b><span>ay</span></div>
    <ul><li><span>Blok süresi</span><b>17 hafta</b></li><li><span>Blokta en fazla / ort. işçi</span><b>225 / 147</b></li><li><span>Blokta rok / kepçe / manitou</span><b>3 / 7 / 5</b></li><li><span>İlk üretim</span><b>4. ay · 452 MWp</b></li></ul>
  </div>
  <div class="yol">
    <span class="yol-etiket gri">DENGELİ</span>
    <h3>6 aylık blok · 2 ay arayla</h3>
    <div class="yol-buyuk"><b>24</b><span>ay</span></div>
    <ul><li><span>Blok süresi</span><b>26 hafta</b></li><li><span>Blokta en fazla / ort. işçi</span><b>141 / 97</b></li><li><span>Sahada en fazla</span><b>ort. 298 · tepe 339 kişi</b></li><li><span>İlk üretim</span><b>6. ay, sonra her 2 ayda +113 MWp</b></li></ul>
  </div>
</div>

---
class: koyu
---

<div class="ust-etiket">DENGELİ YOL · 113 MWp BLOK · 26 HAFTA</div>

# Aynı iş sırası, daha küçük ekipler

<div class="grafik-kutu">
<Gantt :weeks="26" :step="2" :months="[{t:'1. AY',s:1,e:4},{t:'2. AY',s:5,e:9},{t:'3. AY',s:10,e:13},{t:'4. AY',s:14,e:17},{t:'5. AY',s:18,e:22},{t:'6. AY',s:23,e:26}]" :rows="[
 {n:'Mobilizasyon, aplikasyon',k:11,s:1,e:1,g:'g'},
 {n:'Delme (rok taşeronu)',k:'rok',s:1,e:19,g:'m'},
 {n:'Kazık çakma + beton',k:6,s:2,e:20,g:'m'},
 {n:'Tracker montajı',k:50,s:3,e:21,g:'m',v:true},
 {n:'Panel montajı',k:28,s:6,e:23,g:'m'},
 {n:'AC / OG kablo',k:7,s:3,e:18,g:'k'},
 {n:'DC kablo',k:26,s:5,e:23,g:'k'},
 {n:'Topraklama',k:2,s:3,e:18,g:'k'},
 {n:'TR istasyonu, inverter',k:10,s:12,e:21,g:'i'},
 {n:'CCTV, aydınlatma',k:11,s:14,e:23,g:'i'},
 {n:'SCADA, robot, yangın',k:4,s:19,e:24,g:'i'},
 {n:'Testler, devreye alma',k:8,s:21,e:26,g:'g'},
 {n:'Toparlama',k:11,s:26,e:26,g:'g'}]" />
</div>

<p class="dip">Delmede blok başına 2 rok 19 hafta çalışır; gerekirse son haftalarda 3. rok eklenir.</p>

---
class: koyu
---

<div class="ust-etiket">DENGELİ YOL · 10 BLOK · 24 AY</div>

# Her 2 ayda bir +113 MWp

<div class="kademe">
  <div v-for="b in 10" :key="b" class="kd-satir">
    <span class="kd-ad">Blok {{ b }}</span>
    <div class="kd-iz"><div class="kd-cubuk" :style="{ left: ((b - 1) * 2 / 24 * 100) + '%', width: (6 / 24 * 100) + '%', animationDelay: (b * 80) + 'ms' }"><span>{{ (b * 113).toLocaleString('tr-TR') }} MWp</span></div></div>
  </div>
  <div class="kd-eksen"><span></span><div><i v-for="a in 13" :key="a">{{ (a - 1) * 2 }}</i></div></div>
</div>

<div class="bant"><b>250–300 kişi</b> 4.–20. aylar boyunca sahada sabit: ekipler bloktan bloğa kesintisiz geçer, işe alım ve konaklama planı kolaylaşır.</div>

---
layout: center
class: bolum
---

<div class="bolum-no">04</div>
<h1 class="bolum-ad">Güvence</h1>
<p class="bolum-alt">Kalite, iş güvenliği ve raporlama: her adım kayıtlı, her sapma aynı gün yazılı.</p>

---
class: koyu
---

<div class="ust-etiket">KALİTE KONTROL</div>

# Onaysız bir sonraki işe geçilmez

<div class="zincir">
  <div><b>Kazık</b><span>kot ±10 mm, eksen, düşeylik</span><i>sıra bazında ölçüm tutanağı</i></div>
  <div><b>Tracker</b><span>cıvata torku, boru düzlüğü</span><i>tork kayıt formu</i></div>
  <div><b>Panel</b><span>hasar, hiza, tork</span><i>seri no → dizi listesi</i></div>
  <div><b>Kanal</b><span>derinlik, kum, plaka, ikaz bandı</span><i>kapatmadan önce fotoğraf</i></div>
  <div><b>Kablo</b><span>bükülme, etiket, faz sırası</span><i>izolasyon testi</i></div>
  <div><b>OG ek</b><span>uzman yapımı, üretici talimatı</span><i>VLF test raporu</i></div>
  <div><b>Topraklama</b><span>kaynak, süreklilik, direnç</span><i>ölçüm raporu</i></div>
  <div><b>Dizi</b><span>polarite, Voc, izolasyon, I-V</span><i>dizi test raporu</i></div>
  <div class="son"><b>İstasyon</b><span>bağlantı, koruma, fonksiyon</span><i>devreye alma raporu</i></div>
</div>

<div class="kurallar">
  <div><b>Kalibre cihaz.</b> İzolasyon (1–5 kV), I-V, VLF, topraklama ölçer; belgeler işe başlamadan işverende.</div>
  <div><b>Uygunsuzluk.</b> Hatalı iş işaretlenir, düzeltilir, yeniden kontrol edilir; haftalık raporda yer alır.</div>
</div>

---
class: koyu
---

<div class="ust-etiket">İSG, ÇEVRE VE SAHA DÜZENİ</div>

# Riski tanımlı, önlemi hazır

<div class="riskler">
  <div><b>İş makinesi</b>şeritli alan, gözcü, geri vites ikazı</div>
  <div><b>Vinçle kaldırma</b>kaldırma planı, sertifikalı operatör ve sapancı</div>
  <div><b>Kanal göçmesi</b>şevli kazı, kenarda yığın yok</div>
  <div><b>Elektrik</b>kilitle-etiketle, yetkili elektrikçi, yalıtımlı alet</div>
  <div><b>Panel taşıma</b>iki kişiyle, kesilmeye dayanıklı eldiven</div>
  <div><b>Sıcak, güneş</b>gölgelik, su, yazın saat kaydırma</div>
  <div><b>Toz, gürültü</b>maske, kulaklık, sulama</div>
  <div><b>Termit kaynak</b>yangın tüpü, sıcak iş izni, gözlük</div>
</div>

<div class="ritueller">
  <div><b>Her çalışan</b>işe başlamadan İSG eğitimi</div>
  <div><b>Her sabah</b>10 dakikalık güvenlik konuşması</div>
  <div><b>Her blokta</b>ilk yardımcı, ilk yardım dolabı, söndürücü</div>
  <div><b>Her gün</b>ambalaj ve atık toplanır, türüne göre ayrılır</div>
</div>

---
class: koyu
---

<div class="ust-etiket">RAPORLAMA, HAKEDİŞ, TESLİM</div>

# Ne olduğunu her gün bilirsiniz

<div class="takvim">
  <div class="tk"><span class="tk-ne">HER GÜN</span><b>Günlük rapor</b><i>çalışan kişi ve makine, yapılan iş, sorunlar</i></div>
  <div class="tk"><span class="tk-ne">HER HAFTA</span><b>Haftalık rapor</b><i>programa göre ilerleme, gelecek hafta, malzeme ihtiyacı, İSG ve kalite</i></div>
  <div class="tk"><span class="tk-ne">HER AY</span><b>Ölçüm · hakediş</b><i>keşif satırlarına göre gerçekleşen miktar × birim fiyat</i></div>
  <div class="tk"><span class="tk-ne">BLOK SONU</span><b>As-built</b><i>dizi listeleri, kablo güzergâh ve uzunlukları, değişiklikler</i></div>
  <div class="tk"><span class="tk-ne">PROJE SONU</span><b>Teslim dosyası</b><i>test raporları, tutanaklar, kalibrasyon belgeleri</i></div>
</div>

<div class="bant">Malzeme eksikliği, temel gecikmesi ya da proje değişikliği gibi programı etkileyen her durum <b>aynı gün yazılı</b> bildirilir.</div>

---
class: kapanis-s
---

<img class="kapak-bg" src="/saha.svg" />
<div class="kapanis-ic">
  <div class="ust-etiket">SONRAKİ ADIM</div>
  <h1 class="dev2">İlk 113 MWp,<br/><em>4. ayda</em> üretimde.</h1>
  <p>Cephe sayısını malzeme teslim programınız ve inşaat takviminizle birlikte belirleyelim; 10 bloğun takvimini aynı gün çıkaralım.</p>
  <div class="secenek">
    <div><b>Hızlı</b>4 cephe · ≈ 12 ay</div>
    <div><b>Dengeli</b>6 aylık blok · 24 ay</div>
  </div>
  <Logo class="kapanis-logo" />
</div>

---
class: koyu ek
---

<div class="ust-etiket">EK A · İŞ EKİPLERİ VE GÜNLÜK VERİM</div>

<div class="ek-iki">
<table class="ek-tablo">
<tr><th>İş</th><th>Ekip</th><th>Makine</th><th>Günlük</th></tr>
<tr><td>Kazık ön delgisi</td><td>2 işçi</td><td>Rok + kompresör</td><td>120 delik</td></tr>
<tr><td>Kazık çakma</td><td>1 usta + 3</td><td>Çakma mak., ½ manitou</td><td>250 kazık</td></tr>
<tr><td>Delik betonu</td><td>4 işçi</td><td>Huni / mini pompa</td><td>60 m³</td></tr>
<tr><td>Tracker montajı</td><td>1 usta + 7</td><td>½ manitou</td><td>3 tracker</td></tr>
<tr><td>Panel montajı</td><td>1 usta + 5</td><td>¼ manitou</td><td>350 panel</td></tr>
<tr><td>Kanal kazısı</td><td>2 işçi</td><td>Kepçe</td><td>OG 400 / DC 200 m</td></tr>
<tr><td>Kanal kapatma</td><td>4 işçi</td><td>Kepçe</td><td>OG 500 / DC 300 m</td></tr>
<tr><td>Solar kablo, MC4</td><td>1 usta + 5</td><td>Kamyonet</td><td>3 km</td></tr>
<tr><td>DC ana kablo 2×400</td><td>2 usta + 8</td><td>Çekme mak. + römork</td><td>1,5 km</td></tr>
<tr><td>33 kV kablo</td><td>2 usta + 10</td><td>Çekme mak. + römork</td><td>600 m / 2.000 m</td></tr>
<tr><td>33 kV başlık, ek</td><td>1 uzman + 1</td><td>–</td><td>3 başlık / 4 ek</td></tr>
</table>
<table class="ek-tablo">
<tr><th>İş</th><th>Ekip</th><th>Makine</th><th>Günlük</th></tr>
<tr><td>Toplama kutusu</td><td>1 usta + 2</td><td>Kamyonet</td><td>12 kutu</td></tr>
<tr><td>Trafo istasyonu</td><td>2 usta + 4</td><td>Kato, büyük vinç</td><td>0,5 istasyon</td></tr>
<tr><td>İnverter DC bağlantı</td><td>1 usta + 2</td><td>Hidrolik pres</td><td>20 kablo</td></tr>
<tr><td>Topraklama ağı</td><td>1 usta + 4</td><td>Kamyonet</td><td>2 km</td></tr>
<tr><td>Termit kaynak</td><td>1 usta + 1</td><td>–</td><td>60 nokta</td></tr>
<tr><td>10 m aydınlatma direği</td><td>1 usta + 2</td><td>16 t vinç</td><td>8 direk</td></tr>
<tr><td>Kamera</td><td>1 usta + 2</td><td>Sepetli araç</td><td>6 kamera</td></tr>
<tr><td>Temizlik robotu</td><td>1 usta + 3</td><td>¼ manitou</td><td>10 robot</td></tr>
<tr><td>Dizi testleri</td><td>1 uzman + 1</td><td>Test cihazları</td><td>60 dizi</td></tr>
</table>
</div>

---
class: koyu ek
---

<div class="ust-etiket">EK B · PROJE MİKTARLARI</div>

<table class="ek-tablo genis">
<tr><th>İş grubu</th><th>Tüm saha</th><th>Bir blok (113 MWp)</th></tr>
<tr><td>DC güç</td><td>1.130,05 MWp · 1.793.736 panel × 630 Wp</td><td>113 MWp · 179.374 panel</td></tr>
<tr><td>Tracker</td><td>20.694 adet 3 dizili + 990 adet 2 dizili</td><td>≈ 2.069 + 99</td></tr>
<tr><td>Kazık ve ön delgi</td><td>286.932 · Ø230 mm, 1,8 m kayaya gömme</td><td>≈ 28.693</td></tr>
<tr><td>Dizi</td><td>64.062</td><td>≈ 6.406</td></tr>
<tr><td>33 kV kablo</td><td>3×240 Al 75 km · 1×630 Al 450 km · 444 başlık · 647 ek</td><td>–</td></tr>
<tr><td>DC kablo</td><td>8.000 km solar · ≈128.000 MC4 · 1.000 km ana kablo · 4.600 kutu</td><td>–</td></tr>
<tr><td>Topraklama</td><td>200 km 50 mm² bakır · 23.000 termit · 3.000 kazık · 317 km iletken</td><td>–</td></tr>
<tr><td>CCTV, aydınlatma</td><td>530 PTZ kamera · 2.000 çit + 2.900 yol aydınlatma direği (10 m)</td><td>–</td></tr>
<tr><td>Diğer</td><td>2.200 temizlik robotu · FAS · SCADA, PPC · 9 meteoroloji istasyonu</td><td>–</td></tr>
</table>
