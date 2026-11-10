---
theme: default
title: GES Kurulum Teklifi — Örnek
info: Slidev tampon denemesi (örnek rakamlar)
colorSchema: light
transition: slide-left
fonts:
  sans: Inter
  mono: JetBrains Mono
---

<div class="kapak">
<div class="etiket">TEKLİF SUNUMU · ÖRNEK</div>

# 50 MWp GES<br/>Mekanik + Elektrik Montaj

<p class="alt">Takvimde, bütçede, sıfır kazayla teslim.</p>
</div>

<style>
.kapak{position:absolute;inset:0;padding:70px 80px;background:linear-gradient(135deg,#0f1b2d 0%,#16324f 60%,#d98b00 160%);color:#fff}
.kapak h1{font-size:3.2rem;line-height:1.1;font-weight:800;color:#fff;margin-top:30px}
.etiket{letter-spacing:.2em;font-size:.8rem;color:#ffbf3c}
.alt{font-size:1.4rem;opacity:.85;margin-top:24px}
</style>

---
layout: two-cols
---

# Sorununuz

<v-clicks>

- Sahada **gecikme** = günlük üretim kaybı
- Ekip değişimi ve **kalite dalgalanması**
- İş güvenliği riskinin işverene dönmesi
- Belirsiz metraj → **ek fatura**

</v-clicks>

::right::

<div v-click class="kutu">
<div class="buyuk">1 gün gecikme</div>
<div>50 MWp sahada ≈ <b>230 MWh</b> kayıp üretim*</div>
<div class="kucuk">*Örnek: 4,6 kWh/kWp/gün</div>
</div>

<style>
.kutu{margin-top:90px;padding:28px;border-radius:14px;background:#fff4e0;border-left:6px solid #d98b00}
.buyuk{font-size:2rem;font-weight:800;color:#b36b00}
.kucuk{font-size:.7rem;opacity:.6;margin-top:8px}
</style>

---

# Neden biz

<div class="grid grid-cols-3 gap-6 mt-10">
<div v-click class="kart"><div class="sayi">13+</div>yıl saha deneyimi</div>
<div v-click class="kart"><div class="sayi">100+</div>tamamlanan proje</div>
<div v-click class="kart"><div class="sayi">TR+</div>Türkiye ve bölge ülkeleri</div>
</div>

<div v-click class="mt-10 text-lg">Mekanik + elektrik montajı <b>tek elden</b>: kazık, konstrüksiyon, panel, DC/AC kablo, topraklama, devreye alma.</div>

<style>
.kart{padding:26px;border-radius:14px;background:#0f1b2d;color:#fff;text-align:center;font-size:1.05rem}
.sayi{font-size:2.8rem;font-weight:800;color:#ffbf3c}
</style>

---

# Takvim: 16 hafta

```mermaid
gantt
  dateFormat  YYYY-MM-DD
  axisFormat  %d.%m
  section Mekanik
  Kazık çakma        :a1, 2027-03-01, 35d
  Konstrüksiyon      :a2, after a1, 30d
  Panel montajı      :a3, 2027-04-05, 45d
  section Elektrik
  DC kablo           :b1, 2027-04-15, 40d
  AC + trafo bağlantı:b2, after b1, 20d
  Test, devreye alma :b3, after b2, 10d
```

---

# Bütçe — şeffaf ve sabit

| Kalem | Birim | Tutar (örnek) |
|---|---|---|
| Mekanik montaj | €/kWp | 0,028 |
| Elektrik montaj | €/kWp | 0,022 |
| Test & devreye alma | götürü | dahil |
| **Toplam** | | **€2,5 M** |

<div v-click class="mt-8 p-4 rounded bg-green-50 border-l-4 border-green-600">
Metraj sabit: <b>ek fatura yok</b>. Gecikmede günlük ceza maddesini kabul ediyoruz.
</div>

---

# Risk → Güvence

<div class="grid grid-cols-2 gap-6 mt-8">
<div v-click class="r">⏱ <b>Gecikme</b><br/>Haftalık ilerleme raporu, gecikme cezası</div>
<div v-click class="r">🦺 <b>İş güvenliği</b><br/>Sertifikalı ekip, günlük İSG kontrolü</div>
<div v-click class="r">🔧 <b>Kalite</b><br/>Tork, kablo, topraklama testleri kayıtlı</div>
<div v-click class="r">📄 <b>Belgeler</b><br/>As-built, test raporları teslimde hazır</div>
</div>

<style>.r{padding:22px;border-radius:12px;background:#f3f5f8;font-size:1.05rem}</style>

---
layout: center
class: text-center
---

# Karar

<div class="text-2xl mt-6">İmza tarihinden <b>7 gün</b> içinde sahadayız.</div>

<div v-click class="mt-10 inline-block px-8 py-4 rounded-xl text-white text-xl" style="background:#d98b00">Sözleşme taslağını bu hafta gönderelim</div>
