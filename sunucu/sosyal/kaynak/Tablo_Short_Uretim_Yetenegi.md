# Tablo Short Üretim Yeteneği — Devir Dosyası

Bu dosya, ünlü tablo yorum Short'larını üretme yeteneğini başka bir sohbete taşımak için hazırlandı. Yeni sohbet bu dosyayı okuyarak aynı kalitede video üretebilir.

**Sahip:** Ömer Ekinci (Xbay)
**Kanal:** Antik Stüdyo — YouTube @antikstudyo (Google hesabı: arabas400.mrc). Kanal kimliği: `UC77LyY3gqWmBNAKp2lbsGBg`. Kişisel "ömer ekinci" kanalına yükleme yapılmaz.
**Global sürüm:** Ancient Studio — @ancientstudiotv (İngilizce)
**Başlangıç:** 31 Ekim 2026 — 1. bölüm "Yıldızlı Gece" yayında.

---

## 1. Ne Üretiyoruz

Her gün 1 adet, 35–45 saniyelik dikey (1080×1920, 9:16) YouTube Short: bir ünlü tablonun **3 gizli detayı**.

### Anlatım kalıbı (6 sahne)
| # | Sahne | İçerik | Kamera |
|---|---|---|---|
| 1 | Kanca (0–3 sn) | Şaşırtıcı tek cümle. Örn: "Bu tablo bir akıl hastanesinde yapıldı." | Tablonun tamamı, hafif yakınlaşma |
| 2 | Bağlam | Ne zaman, nerede, hangi koşulda yapıldı | Tam görünüm, yavaş açılma |
| 3 | GİZLİ DETAY 1/3 | Birinci detay | İlgili bölgeye yakın plan |
| 4 | GİZLİ DETAY 2/3 | İkinci detay | İlgili bölgeye yakın plan |
| 5 | GİZLİ DETAY 3/3 | Üçüncü detay + son vuruş (tablonun asıl mesajı) | İlgili bölgeye yakın plan |
| 6 | Yarın | "Yarın: <sıradaki tablonun merak sorusu>" | Tamamına geri dönüş |

### Metin kuralları
- 450–520 karakter (Türkçe seslendirmede ~35–45 sn).
- Sayılar yazıyla: "bin sekiz yüz seksen dokuz".
- Kısa cümleler, konuşma dili, akıcı.
- Bilgiler her seferinde web araması ile doğrulanır. Emin olunmayan iddia kullanılmaz.
- Örnek metin (Yıldızlı Gece):
  > Bu tablo, bir akıl hastanesinde yapıldı. Yıl bin sekiz yüz seksen dokuz. Sen Remi. Van Gogh, kendi isteğiyle yattığı odanın penceresinden bu manzarayı izledi. Ama pencerede demir parmaklıklar vardı. Hiçbirini çizmedi. Gördüğünü değil, hissettiğini çizdi. Bu köy de aslında oradan görünmüyordu. Onu hafızasından ekledi. Ya bu siyah alev? Bir selvi ağacı. O dönemde, mezarlık ağacı. Yani tablo şunu söylüyor: Ölüm yakın... ama gökyüzü hâlâ dans ediyor. Yarın: Mona Lisa'nın kaşları neden yok?

### Görsel dil
- Tablo ortada; boşluklar tablonun bulanık, karartılmış kopyasıyla dolar (siyah boşluk yok).
- Üstte sarı yazılı başlık şeridi: `TABLO ADI • RESSAM, YIL`.
- Detay sahnelerinde sarı etiket: `GİZLİ DETAY 1/3` vb.
- Altyazı: büyük harf, beyaz, kalın siyah kenarlı, ekranın alt-ortası, 2–3 kelimelik parçalar, hafif "pop" efekti. Türkçe büyük harf doğru olmalı (i→İ, ı→I).
- Kenarlarda yumuşak karartma (vinyet).
- Fon müziği seslendirmenin altında %18 seviyede.

---

## 2. Kesin Kurallar

1. **Telif:** Sadece telifi düşmüş tablolar (ressam 70+ yıl önce ölmüş). Picasso, Dalí, Frida, Magritte gibi telifli eserler kullanılmaz.
2. **Görsel kaynağı:** Wikimedia Commons (telifsiz kopyalar).
3. **Müzik:** Kendi ürettiğimiz müzik ya da telifsiz kayıt (klasik eserlerde beste serbest olsa da **kaydın** telifi olabilir; yalnızca CC0/kamu malı kayıt, örn. Musopen).
4. **Ses:** Yalnızca **Uğur — Turkish Documentary Narrator** (ElevenLabs). `destek_teengirl` sesi bu seriye uygun bulunmadı, kullanılmaz.
5. **Başlıklarda** "TR", "EN" gibi dil ifadeleri olmaz.
6. YouTube kontrolleri telif/kural uyarısı verirse yayınlanmaz, Ömer'e bildirilir.
7. Yanlış kanala asla yükleme yapılmaz.

---

## 3. Araçlar ve Ayarlar

| İş | Araç | Ayar |
|---|---|---|
| Seslendirme | ElevenLabs `text_to_speech` | voice_id `fSruVisKJEvQqmgx0yZT` (Ugur), model `eleven_multilingual_v2`, language `tr`, stability `0.45`, style `0.25`, speed `1.0` |
| Tablo görseli | Wikimedia Commons, `curl` | Standart küçük resim: `.../thumb/<x>/<xy>/<Dosya>.jpg/1920px-<Dosya>.jpg`. 2560/3840/orijinal 429 veya 400 verebilir; 429'da 30–60 sn bekle, 1280px dene. Genel bir User-Agent kullan (örn. `AnalizShortsBot/1.0`). `file` ile JPEG olduğunu kontrol et. |
| Zamanlama | `ffmpeg silencedetect` | `noise=-50dB:d=0.25`; az duraklama çıkarsa -40/-35 dB. Sahne sınırları net duraklamalara oturtulur. |
| Kurgu | `render.py` (Bölüm 6) | Python + Pillow + ffmpeg, Inter Display yazı tipi |
| Yükleme dosyası | ffmpeg | `-c:v libx264 -preset slow -b:v 1750k -maxrate 2200k -bufsize 4000k -c:a aac -b:a 128k -movflags +faststart` → 10 MB altı (tarayıcı yükleme sınırı) |
| YouTube | Claude in Chrome | Studio → hesap değiştir → Antik Stüdyo → Oluştur → Video yükle → dosya inputuna `file_upload` |

ElevenLabs kotası: video başına ~600 karakter; 30 video ≈ 18.000 karakter. Mevcut abonelik yeterli.

---

## 4. Üretim Adımları (her video)

1. **Tablo seç:** `tablolar.json`'da `"yapildi": false` olan ilk tablo.
2. **Araştır:** tarih, müze, 3 gerçek ve az bilinen detay (web araması).
3. **Metin yaz:** Bölüm 1 kalıbı ve kuralları.
4. **Seslendir:** Uğur sesi, Bölüm 3 ayarları.
5. **Görseli indir:** Wikimedia 1920px.
6. **Görsele bak:** detayların görseldeki konumunu (piksel) belirle.
7. **Duraklamaları bul:** silencedetect → 6 sahnenin başlangıç/bitiş saniyeleri.
8. **Ayar dosyası (cfg.json) yaz:** Bölüm 5 yapısı.
9. **Kurgula:** `python3 render.py cfg.json out.mp4`.
10. **Kontrol et:** videodan 6 kare çıkar, yan yana birleştir, bak: altyazı doğru Türkçe mi, kamera doğru detayda mı, siyah boşluk var mı.
11. **Yükleme dosyası:** 10 MB altına sıkıştır. Ad: `Tablo_<iki haneli sıra>_<Tablo_Adi_ascii>_Short.mp4`.
12. **Yükle ve zamanla:** Antik Stüdyo kanalı; başlık ≤60 karakter + `#shorts`; açıklama 2–3 cümle + "Her gün bir ünlü tablo, 3 gizli detay. Yarın: <soru>" + `#sanat #tablo #<ressam> #<tablo> #resim #shorts`; kitle "çocuklara özel değil"; zamanla → yayın saati.
13. **Doğrula:** Studio → İçerik → Shorts listesinde "Zamanlandı" ve doğru tarih/saat.
14. **İşaretle:** `tablolar.json`'da `"yapildi": true`.
15. **Bildir:** tablo adı, yayın saati, başlık, video linki.

---

## 5. Ayar Dosyası (cfg.json) Yapısı

- `image`: tablo görseli yolu
- `audio`: seslendirme mp3
- `music`: fon müziği wav
- `header`: üst şerit yazısı
- `segments`: 6 sahne; her birinde `text` (altyazı metni), `start`/`end` (saniye), `cam` ve `cam2` (sahne başı ve sonu kamera), isteğe bağlı `tag`
- Kamera değeri `[merkez_x, merkez_y, genişlik]`, tablo pikseli cinsinden (görsel genişliği 1920 iken). Tam görünüm: genişlik = görsel genişliği (1920). Detay yakın planı: ~550–650. Sahneler arası geçiş 1 sn yumuşak kayma.
- Son sahnenin `end` değeri = ses süresi + 0.5 sn.

Örnek (Yıldızlı Gece — gerçek kullanılan ayar):

```json
{
 "header": "YILDIZLI GECE • VAN GOGH, 1889",
 "segments": [
  {
   "text": "Bu tablo, bir akıl hastanesinde yapıldı.",
   "start": 0,
   "end": 2.75,
   "cam": [
    960,
    760,
    1500
   ],
   "cam2": [
    960,
    760,
    1250
   ]
  },
  {
   "text": "1889. Saint-Rémy. Van Gogh, kendi isteğiyle yattığı odanın penceresinden bu manzarayı izledi.",
   "start": 2.75,
   "end": 13.9,
   "cam": [
    960,
    760,
    1920
   ],
   "cam2": [
    960,
    760,
    1700
   ]
  },
  {
   "text": "Ama pencerede demir parmaklıklar vardı. Hiçbirini çizmedi. Gördüğünü değil, hissettiğini çizdi.",
   "start": 13.9,
   "end": 21.7,
   "cam": [
    1000,
    500,
    640
   ],
   "cam2": [
    1050,
    520,
    560
   ],
   "tag": "GİZLİ DETAY 1/3"
  },
  {
   "text": "Bu köy de aslında oradan görünmüyordu. Onu hafızasından ekledi.",
   "start": 21.7,
   "end": 25.45,
   "cam": [
    1150,
    1150,
    600
   ],
   "cam2": [
    1200,
    1180,
    520
   ],
   "tag": "GİZLİ DETAY 2/3"
  },
  {
   "text": "Ya bu siyah alev? Bir selvi ağacı. O dönemde, mezarlık ağacı. Yani tablo şunu söylüyor: Ölüm yakın… ama gökyüzü hâlâ dans ediyor.",
   "start": 25.45,
   "end": 32.8,
   "cam": [
    300,
    800,
    640
   ],
   "cam2": [
    300,
    650,
    560
   ],
   "tag": "GİZLİ DETAY 3/3"
  },
  {
   "text": "Yarın: Mona Lisa'nın kaşları neden yok?",
   "start": 32.8,
   "end": 36.2,
   "cam": [
    960,
    760,
    1600
   ],
   "cam2": [
    960,
    760,
    1920
   ]
  }
 ],
 "audio": "voice.mp3",
 "music": "music.wav",
 "image": "img.jpg"
}
```

---

## 6. Kurgu Betiği (render.py)

Kullanım: `python3 render.py cfg.json cikti.mp4`
Gereksinim: Python 3, Pillow, ffmpeg, Inter Display yazı tipi (`/usr/share/fonts/opentype/inter/`). Yazı tipi yolu farklıysa 2 satırı güncelle.

```python
import json, math, subprocess, sys
from PIL import Image, ImageFilter, ImageDraw, ImageFont, ImageEnhance

W, H, FPS = 1080, 1920, 30
cfg = json.load(open(sys.argv[1]))
out = sys.argv[2]
audio = cfg.get("audio")

paint = Image.open(cfg["image"]).convert("RGB")
PW, PH = paint.size
WH = int(PW * 16 / 9)          # world height (full-frame 9:16 at width PW)
OY = (WH - PH) // 2
bg = paint.resize((int(PW * WH / PH), WH), Image.BILINEAR)
bx = (bg.width - PW) // 2
bg = bg.crop((bx, 0, bx + PW, WH)).filter(ImageFilter.GaussianBlur(40))
bg = ImageEnhance.Brightness(bg).enhance(0.45)
world = bg.copy(); world.paste(paint, (0, OY))

def clamp_cam(cx, cy, w):
    h = w * 16 / 9
    cx = min(max(cx, w / 2), PW - w / 2)
    if h <= PH:
        cy = min(max(cy, h / 2), PH - h / 2)
    else:
        cy = PH / 2
    return cx, cy + OY, w

segs = cfg["segments"]
for s in segs:
    s["cam"] = clamp_cam(*s["cam"])
    s["cam2"] = clamp_cam(*s.get("cam2", [s["cam"][0], s["cam"][1] - OY, s["cam"][2] * 0.93]))
total = segs[-1]["end"] + 0.6

def ease(t): return t * t * (3 - 2 * t)
def lerp(a, b, t): return tuple(x + (y - x) * t for x, y in zip(a, b))

def camera(t):
    for i, s in enumerate(segs):
        if t < s["end"] or i == len(segs) - 1:
            break
    s = segs[i]
    dur = max(s["end"] - s["start"], 0.1)
    drift = lerp(s["cam"], s["cam2"], ease(min(max((t - s["start"]) / dur, 0), 1)))
    if i > 0:
        p = segs[i - 1]
        prev = p["cam2"]
        k = (t - s["start"]) / 1.0
        if k < 1:
            return lerp(prev, drift, ease(max(k, 0)))
    return drift

FB = ImageFont.truetype("/usr/share/fonts/opentype/inter/InterDisplay-Black.otf", 84)
FS = ImageFont.truetype("/usr/share/fonts/opentype/inter/InterDisplay-Bold.otf", 40)

caps = []
for s in segs:
    words = s["text"].split()
    chunks, cur = [], []
    for w_ in words:
        cur.append(w_)
        if len(" ".join(cur)) > 14 or w_[-1] in ".?!,:":
            chunks.append(" ".join(cur)); cur = []
    if cur: chunks.append(" ".join(cur))
    L = sum(len(c) for c in chunks)
    t0, dur = s["start"], s["end"] - s["start"]
    for c in chunks:
        d = dur * len(c) / L
        caps.append((t0, t0 + d, c)); t0 += d

def wrap(text, font, maxw, d):
    lines, cur = [], ""
    for w_ in text.split():
        t = (cur + " " + w_).strip()
        if d.textlength(t, font=font) > maxw and cur:
            lines.append(cur); cur = w_
        else:
            cur = t
    lines.append(cur); return lines

vign = Image.new("L", (W, H), 0)
vd = ImageDraw.Draw(vign)
for i in range(60):
    a = int(170 * (1 - i / 60) ** 2)
    vd.rectangle([i * 6, i * 9, W - i * 6, H - i * 9], outline=a, width=9)
vign = vign.filter(ImageFilter.GaussianBlur(30))
black = Image.new("RGB", (W, H), (0, 0, 0))

cmd = ["ffmpeg", "-y", "-loglevel", "error", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-"]
if audio:
    cmd += ["-i", audio]
    if cfg.get("music"):
        cmd += ["-i", cfg["music"], "-filter_complex", "[1:a]volume=1.0[v];[2:a]volume=0.18[m];[v][m]amix=inputs=2:duration=longest:normalize=0[a]", "-map", "0:v", "-map", "[a]"]
    else:
        cmd += ["-map", "0:v", "-map", "1:a"]
    cmd += ["-c:a", "aac", "-b:a", "192k"]
cmd += ["-c:v", "libx264", "-preset", "veryfast", "-crf", "19", "-pix_fmt", "yuv420p", "-t", f"{total:.2f}", "-movflags", "+faststart", out]
p = subprocess.Popen(cmd, stdin=subprocess.PIPE)

header = cfg["header"]
nf = int(total * FPS)
for f in range(nf):
    t = f / FPS
    cx, cy, w = camera(t)
    w = min(w, PW); h = min(w * 16 / 9, WH)
    x0 = min(max(cx - w / 2, 0), PW - w); y0 = min(max(cy - h / 2, 0), WH - h)
    fr = world.resize((W, H), Image.BICUBIC, box=(x0, y0, x0 + w, y0 + h))
    fr = Image.composite(black, fr, vign)
    d = ImageDraw.Draw(fr)
    # header
    hw = d.textlength(header, font=FS)
    d.rounded_rectangle([(W - hw) / 2 - 28, 150, (W + hw) / 2 + 28, 222], 36, fill=(0, 0, 0, 160))
    d.text((W / 2, 186), header, font=FS, fill=(255, 214, 90), anchor="mm")
    # tag (detail counter)
    for s in segs:
        if s.get("tag") and s["start"] <= t < s["end"]:
            tw = d.textlength(s["tag"], font=FS)
            d.rounded_rectangle([(W - tw) / 2 - 24, 250, (W + tw) / 2 + 24, 314], 32, fill=(255, 214, 90))
            d.text((W / 2, 282), s["tag"], font=FS, fill=(15, 15, 15), anchor="mm")
    # caption
    for a, b, c in caps:
        if a <= t < b:
            pop = min((t - a) / 0.12, 1)
            font = FB if pop >= 1 else ImageFont.truetype("/usr/share/fonts/opentype/inter/InterDisplay-Black.otf", int(84 * (0.85 + 0.15 * pop)))
            lines = wrap(c.replace("i","İ").replace("ı","I").upper(), font, W - 140, d)
            y = 1380 - (len(lines) - 1) * 50
            for ln in lines:
                d.text((W / 2, y), ln, font=font, fill=(255, 255, 255), anchor="mm", stroke_width=10, stroke_fill=(0, 0, 0))
                y += 100
            break
    p.stdin.write(fr.tobytes())
p.stdin.close(); p.wait()
print("done", out, total)
```

### Fon müziği üretimi (music.wav — telifsiz, kendi üretimimiz)

```python
import numpy as np, wave
sr=44100; T=48; t=np.arange(int(sr*T))/sr
chords=[[110,164.81,220,261.63],[87.31,130.81,174.61,220],[98,146.83,196,246.94],[82.41,123.47,164.81,207.65]]
out=np.zeros_like(t); L=6.0
for i in range(int(T/L)+1):
    st=i*L; seg=(t>=st)&(t<st+L+2); tt=t[seg]-st
    env=np.minimum(tt/2,1)*np.clip((L+2-tt)/2,0,1)
    for f in chords[i%4]:
        out[seg]+=env*(np.sin(2*np.pi*f*tt)+0.3*np.sin(2*np.pi*2*f*tt+0.5))*0.12
out*=0.6+0.4*np.sin(2*np.pi*0.1*t)
out/=np.abs(out).max(); out*=0.8
fade=np.minimum(1,np.minimum(t/1.5,(T-t)/2)); out*=fade
d=(out*32767).astype(np.int16); st=np.stack([d,d],1)
w=wave.open('music.wav','wb'); w.setnchannels(2); w.setsampwidth(2); w.setframerate(sr); w.writeframes(st.tobytes()); w.close()
```

---

## 7. Tablo Listesi (30 eser, sırayla)

| # | Tablo | Ressam | Yıl | Durum |
|---|---|---|---|---|
| 1 | Yıldızlı Gece | Vincent van Gogh | 1889 | ✅ yayında |
| 2 | Mona Lisa | Leonardo da Vinci | 1503 | |
| 3 | İnci Küpeli Kız | Johannes Vermeer | 1665 | |
| 4 | Kaplumbağa Terbiyecisi | Osman Hamdi Bey | 1906 | |
| 5 | Çığlık | Edvard Munch | 1893 | |
| 6 | Kanagawa'nın Büyük Dalgası | Katsushika Hokusai | 1831 | |
| 7 | Son Akşam Yemeği | Leonardo da Vinci | 1498 | |
| 8 | Venüs'ün Doğuşu | Sandro Botticelli | 1485 | |
| 9 | Gece Devriyesi | Rembrandt | 1642 | |
| 10 | Öpücük | Gustav Klimt | 1908 | |
| 11 | Dünyevi Zevkler Bahçesi | Hieronymus Bosch | 1505 | |
| 12 | Nedimeler (Las Meninas) | Diego Velázquez | 1656 | |
| 13 | 3 Mayıs 1808 | Francisco Goya | 1814 | |
| 14 | Halka Yol Gösteren Özgürlük | Eugène Delacroix | 1830 | |
| 15 | Medusa'nın Salı | Théodore Géricault | 1819 | |
| 16 | Karda Avcılar | Pieter Bruegel | 1565 | |
| 17 | Arnolfini Portresi | Jan van Eyck | 1434 | |
| 18 | Atina Okulu | Raffaello | 1511 | |
| 19 | Adem'in Yaratılışı | Michelangelo | 1512 | |
| 20 | Oğlunu Yiyen Satürn | Francisco Goya | 1823 | |
| 21 | Sis Denizi Üzerindeki Gezgin | Caspar David Friedrich | 1818 | |
| 22 | İzlenim, Gün Doğumu | Claude Monet | 1872 | |
| 23 | Ayçiçekleri | Vincent van Gogh | 1888 | |
| 24 | Folies-Bergère'de Bir Bar | Édouard Manet | 1882 | |
| 25 | Büyükelçiler | Hans Holbein | 1533 | |
| 26 | Holofernes'in Başını Kesen Judith | Artemisia Gentileschi | 1620 | |
| 27 | Dr. Tulp'un Anatomi Dersi | Rembrandt | 1632 | |
| 28 | Ophelia | John Everett Millais | 1852 | |
| 29 | Babil Kulesi | Pieter Bruegel | 1563 | |
| 30 | Mihrap | Osman Hamdi Bey | 1901 | |

Not: Bu tablodaki durumlar 31 Ekim itibarıyla. Güncel durum için `tablolar.json` esas alınır.

---

## 8. Mevcut Kurulum ve Dosyalar

- **Klasör (Ömer'in bilgisayarı):** `C:\Users\ekinc\OneDrive\Desktop\AntikStudyo_Claude\tablo`
  - Hazır videolar burada.
  - `_sistem\` → `render.py`, `music.wav`, `ornek_cfg_yildizli_gece.json`, `tablolar.json`
- **Günlük zamanlanmış görev:** "Günlük Tablo Short – hazırla ve zamanla" — her gün 14:47 (İstanbul) çalışır, hazırlar, yükler, zamanlar.
- **Yayın saati:** 18:00 (Kasım 2026'da 20:00'den değiştirildi — görevdeki saatin 18:00 olduğundan emin olun).
- **Bağımlılıklar:** ElevenLabs (bilgisayardaki yerel bağlantı), klasör erişimi, Claude in Chrome (YouTube oturumu açık).

### ⚠️ Taşınması gereken konu
Ömer'in kalıcı kuralı: **tüm işler yalnızca sunucuda yapılır, bilgisayarında program kurulmaz/iş yapılmaz.** Mevcut kurulum ses, klasör ve YouTube yüklemesi için bilgisayara bağlı. Yeni sohbette bu akışın sunucuya taşınması gerekiyor:
- Dosyalar sunucuya (veya Drive'a) alınmalı.
- Seslendirme sunucudan ElevenLabs'e bağlanmalı.
- YouTube yüklemesi sunucudan resmi YouTube yükleme bağlantısıyla yapılmalı (tarayıcı yerine).
- Taşıma öncesi yedek alınmalı; mevcut günlük görev, yenisi çalıştığı doğrulanana kadar kapatılmamalı.

---

## 9. İçerik Üretme Yeteneği — Genişleme Fikirleri

| # | Fikir | Neden | Durum |
|---|---|---|---|
| 1 | **Müze Modu:** tablolar + telifsiz klasik müzik, 1 saatlik arka plan videosu (ders/okuma için) | Görseller hazır, ek maliyet yok; uzun video → izlenme saati; CutkodA altındaki ambient kanala uygun | Önerildi ⭐ |
| 2 | **Tablo canlansaydı:** tablo sahnesinin yapay zekâ ile birkaç saniyelik hareketlenmesi | Short kancası olarak çok güçlü; Topview ücretsiz haklarıyla denenebilir | Önerildi ⭐ |
| 3 | **Bu tablo yapılırken dünyada ne oluyordu?** | Antik Stüdyo'nun tarih çizgisine uygun | Önerildi |
| 4 | **Bu tablodaki hatayı bul** testi | Yorum ve etkileşim artırır, sıfır maliyet | Önerildi |
| 5 | **Ressamın hayatı** mini-serisi | Hayat hikâyeleri kanalı planına uygun | Önerildi |
| 6 | **İngilizce sürüm** (@ancientstudiotv) | Aynı görüntü + İngilizce ses/altyazı; içerik 2 katı | Ömer istedi |
| 7 | TikTok + Instagram Reels'e aynı videolar | Ek erişim | Planlandı |
| 8 | Haftalık uzun video (7 tablonun derlemesi) | Para kazanma şartı için izlenme saati | Planlandı |

### Para kazanma hedefi
YouTube İş Ortağı Programı (bilinen şart, başvuru öncesi teyit edilmeli): 1.000 abone + (90 günde 10 milyon Shorts izlenmesi **veya** 4.000 saat uzun video izlenmesi).

---

## 10. Ömer ile Çalışma Şekli

- Türkçe, kısa ve işe odaklı.
- Uzun işlerde kısa ara durum mesajları.
- Yazılımcı değil: teknik işi Claude yapar, sonuç sade dille anlatılır.
- Öncelik sırası: 1) güvenlik (veri kaybı yok, yedek, telif ihlali yok) 2) kalite 3) en düşük maliyet.
- Ücretli servis yerine kendi sistemimiz; mümkün olan her şey ücretsiz.
- Tekrar tekrar giriş yapması istenmez; oturumlar saklı tutulur.
