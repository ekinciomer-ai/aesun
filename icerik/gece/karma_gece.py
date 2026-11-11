# Gece Yapma Denen 4 Şey — "Celtic konsepti" açık tema kurgu (karma_acik.py'nin genelleştirilmiş hali).
# Kullanım: python3 karma_gece.py <video_ad>   (video tanımları: videolar.json)
# Girdi: sunucu/ses_kuyruk/cikti/<SES>.mp3 + icerik/gece/kelimeler/<SES>.json (whisper) + img/NN.png
# Ortam: KURU=1 → yalnız örnek kareler; ONIZ=1 → 540x960 hızlı önizleme
import os, sys, subprocess, json, math, re, random, difflib
import numpy as np
from PIL import Image, ImageDraw, ImageFont

K = os.path.dirname(os.path.abspath(__file__)); KOK = os.path.abspath(f"{K}/../..")
AD = sys.argv[1]; V = json.load(open(f"{K}/videolar.json", encoding="utf-8"))[AD]
KURU = os.environ.get("KURU") == "1"; ONIZ = os.environ.get("ONIZ") == "1"; STIL = V.get("stil", "foto")
W, H, FPS = 1080, 1920, 30
FI = {"black": "/usr/share/fonts/opentype/inter/Inter-Black.otf", "xbold": "/usr/share/fonts/opentype/inter/Inter-ExtraBold.otf", "bold": "/usr/share/fonts/opentype/inter/Inter-Bold.otf"}
_FC = {}
def font(ad, px):
    if (ad, px) not in _FC: _FC[(ad, px)] = ImageFont.truetype(FI[ad], px)
    return _FC[(ad, px)]
def ease(p): return 1 - (1 - p) ** 3
def norm(x): return re.sub(r"[^\w]", "", x.lower().replace("İ", "i").replace("I", "ı"))
def tr_upper(s): return s.replace("i", "İ").replace("ı", "I").upper()
random.seed(7); np.random.seed(3)
SARI = (255, 214, 0); BEYAZ = (255, 255, 255); LACI = (18, 28, 56)

# ---------- ses + kelime zamanları ----------
SES = f"{KOK}/sunucu/ses_kuyruk/cikti/{V['ses']}.mp3"
def sure(p): return float(subprocess.check_output(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", p]))
SURE = sure(SES); KUYRUK = 1.5; TOPLAM = SURE + KUYRUK; N = int(TOPLAM * FPS)
WJ = json.load(open(f"{K}/kelimeler/{V['ses']}.json", encoding="utf-8"))
METIN = V["metin"]
KELIME = METIN.split()
sm = difflib.SequenceMatcher(None, [norm(x) for x in KELIME], [norm(x["k"]) for x in WJ], autojunk=False)
ZT = [None] * len(KELIME)
for tag, a0, a1, b0, b1 in sm.get_opcodes():
    if tag == "equal":
        for k in range(a1 - a0): ZT[a0 + k] = (WJ[b0 + k]["b"], WJ[b0 + k]["s"])
idx = [k for k, v in enumerate(ZT) if v]; print(f"hizalanan kelime {len(idx)}/{len(KELIME)}")
for k in range(len(KELIME)):
    if ZT[k] is None:
        on = max([j for j in idx if j < k], default=None); so = min([j for j in idx if j > k], default=None)
        a_ = ZT[on][1] if on is not None else 0.0; b_ = ZT[so][0] if so is not None else SURE
        n1 = on if on is not None else -1; n2 = so if so is not None else len(KELIME)
        ZT[k] = (a_ + (b_ - a_) * (k - n1) / (n2 - n1), a_ + (b_ - a_) * (k + 1 - n1) / (n2 - n1))

# ---------- sahneler: {"k": başlangıç kelimesi (sırayla aranır), "g": görsel, "y": yön, "e": etiket, "b": [beyaz, sarı]} ----------
SAHNE = []; arama = 0
for i, s in enumerate(V["sahneler"]):
    if i == 0: t0 = 0.0
    else:
        hedef = norm(s["k"]); j = next((j for j in range(arama, len(KELIME)) if norm(KELIME[j]).startswith(hedef)), None)
        if j is None: raise SystemExit(f"sahne kelimesi bulunamadı: {s['k']}")
        arama = j + 1; t0 = ZT[j][0]
    SAHNE.append([t0, None, s["g"], s.get("y", 1), s.get("e"), s["b"][0], s["b"][1]])
for k in range(len(SAHNE)): SAHNE[k][1] = SAHNE[k + 1][0] if k + 1 < len(SAHNE) else TOPLAM
SON_KONUSMA = ZT[-1][1]
ALT = "Temsili görseller: yapay zekâ · Ses: yapay zekâ ile klonlanmış kendi sesim · Müzik: kanal üretimi"
KANAL = "ANTİK STÜDYO"; KAPANIS = tuple(V.get("kapanis", ["TAMAMI KANALDA", "YORUMLARA YAZ ▼"]))
ANAHTAR = V["anahtar"]
def sari_mi(w): n = norm(w); return any(n.startswith(norm(a)) for a in ANAHTAR)

# ---------- altyazı grupları (3 kelime, cümle sonunda kırılır) ----------
GRUP = []; tampon = []
def bosalt(son_k):
    if tampon:
        t0 = ZT[tampon[0]][0]; t1 = ZT[son_k + 1][0] if son_k + 1 < len(KELIME) else ZT[son_k][1] + 0.8
        GRUP.append((t0, t1, [KELIME[j] for j in tampon])); tampon.clear()
for k, w in enumerate(KELIME):
    tampon.append(k)
    if len(tampon) == 3 or re.search(r"[.!?…:;]$", w): bosalt(k)
bosalt(len(KELIME) - 1)

# ---------- görsel katmanlar ----------
IMG = {}
def gorsel(ad):
    if ad not in IMG:
        im = Image.open(f"{K}/img/{ad}.png").convert("RGB")
        r = max(W * 1.12 / im.width, H * 1.12 / im.height); IMG[ad] = im.resize((int(im.width * r), int(im.height * r)), Image.LANCZOS)
    return IMG[ad]
_g = np.zeros((H, W, 4), np.uint8); yy = np.arange(H)[:, None]
_g[..., 3] = np.clip(70 * np.clip(1 - yy / 620, 0, 1) ** 1.3 + 90 * np.clip((yy - (H - 560)) / 560, 0, 1) ** 1.3, 0, 255).astype(np.uint8)
GOLGE = Image.fromarray(_g, "RGBA")
yy, xx = np.mgrid[0:H, 0:W]; VIN = (1 - 0.12 * np.clip(((xx - W / 2) / (W * 0.65)) ** 2 + ((yy - H / 2) / (H * 0.65)) ** 2, 0, 1) ** 1.5).astype(np.float32)[..., None]
GRAIN = [np.random.randint(-4, 5, (H, W, 1)).astype(np.int16) for _ in range(6)]
def sahne_taban(si, tz):
    t0, t1, ad, yon = SAHNE[si][:4]; p = min(1, max(0, (tz - t0) / max(0.8, t1 - t0)))
    im = gorsel(ad); w, h = im.size
    if STIL == "2d":   # çizgi film: daha geniş yakınlaşma + sahne girişinde yumuşak "oturma" zıplaması
        ts = tz - t0; zip_ = 0.05 * math.exp(-ts * 5) * math.cos(ts * 14) if ts < 1.2 else 0.0
        z = 1.0 + 0.13 * (ease(p) if yon > 0 else 1 - ease(p)) + max(0.0, zip_); kay = 0.45
    else: z = 1.0 + 0.08 * (ease(p) if yon > 0 else 1 - ease(p)); kay = 0.25
    cw, ch = int(W / z), int(H / z)
    cx = (w - cw) // 2 + int((w - cw) * kay * math.sin(p * 3.14) * yon); cy = (h - ch) // 2 + int((h - ch) * 0.12 * (p - 0.5) * yon)
    return im.crop((cx, cy, cx + cw, cy + ch)).resize((W, H), Image.BILINEAR)
def sigdir(d, metin, ad, px, maxw):
    ft = font(ad, px)
    while d.textlength(metin, font=ft) > maxw and px > 30: px -= 4; ft = font(ad, px)
    return ft
def baslik(d, s, tz, alfa=1.0):
    t0, _, _, _, etiket, b1, b2 = s; y = 150
    g0 = ease(min(1, max(0, (tz - t0) / 0.35))) * alfa
    if etiket:
        ft = font("xbold", 34); tw = d.textlength(etiket, font=ft); bx = (W - tw) / 2 - 22
        d.rounded_rectangle((bx, y, bx + tw + 44, y + 58), 14, fill=LACI + (int(235 * g0),))
        d.text((bx + 22, y + 9), etiket, font=ft, fill=SARI + (int(255 * g0),)); y += 80
    for j, (metin, renk) in enumerate([(b1, BEYAZ), (b2, SARI)]):
        if not metin: continue
        g = ease(min(1, max(0, (tz - t0 - 0.12 * (j + 1)) / 0.4))) * alfa; ft = sigdir(d, metin, "black", 92 if j == 0 else 76, W - 90)
        tw = d.textlength(metin, font=ft); d.text(((W - tw) / 2, y + (1 - g) * 30), metin, font=ft, fill=renk + (int(255 * g),), stroke_width=7, stroke_fill=LACI + (int(235 * g),))
        y += (92 if j == 0 else 76) + 14
def altyazi(d, tz):
    for (t0, t1, kel) in GRUP:
        if t0 <= tz < t1:
            metin = tr_upper(" ".join(kel)); ft = sigdir(d, metin, "black", 66, W - 60)
            x = (W - d.textlength(metin, font=ft)) / 2; y = 1440
            for wd in kel:
                u = tr_upper(wd); d.text((x, y), u, font=ft, fill=SARI if sari_mi(wd) else BEYAZ, stroke_width=7, stroke_fill=LACI); x += d.textlength(u + " ", font=ft)
            break
GECIS = 0.35
def kare(fi):
    tz = fi / FPS
    si = next((i for i, s in enumerate(SAHNE) if tz < s[1]), len(SAHNE) - 1); s = SAHNE[si]; t0 = s[0]
    fr = sahne_taban(si, tz); karisim = 0.0
    if si > 0 and tz - t0 < GECIS: karisim = 1 - ease((tz - t0) / GECIS); fr = Image.blend(fr, sahne_taban(si - 1, tz), karisim)
    arr = np.clip(np.asarray(fr).astype(np.float32) * VIN, 0, 255).astype(np.int16) + GRAIN[fi % 6]
    fr = Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8)).convert("RGBA"); fr = Image.alpha_composite(fr, GOLGE); d = ImageDraw.Draw(fr, "RGBA")
    d.rectangle((0, 0, W, 8), fill=LACI); d.rectangle((0, 0, W * tz / TOPLAM, 8), fill=SARI)
    if karisim > 0: baslik(d, SAHNE[si - 1], tz, alfa=karisim)
    if tz > SON_KONUSMA - 0.2:
        g = ease(min(1, max(0, (tz - (SON_KONUSMA - 0.2)) / 0.4)))
        for j, (m, renk, yy0) in enumerate([(KAPANIS[0], BEYAZ, 150), (KAPANIS[1], SARI, 230)]):
            f = sigdir(d, m, "black", 56 if j == 0 else 48, W - 80); tw = d.textlength(m, font=f)
            d.text(((W - tw) / 2, yy0), m, font=f, fill=renk + (int(255 * g),), stroke_width=7, stroke_fill=LACI + (int(235 * g),))
    else: baslik(d, s, tz)
    altyazi(d, tz)
    ft = font("black", 28); d.text(((W - d.textlength(KANAL, font=ft)) / 2, H - 76), KANAL, font=ft, fill=BEYAZ, stroke_width=3, stroke_fill=(0, 0, 0))
    ft = font("bold", 20); d.text((W - d.textlength(ALT, font=ft) - 20, H - 40), ALT, font=ft, fill=(210, 210, 210), stroke_width=2, stroke_fill=(0, 0, 0))
    if tz > TOPLAM - 0.6: d.rectangle((0, 0, W, H), fill=(0, 0, 0, int(255 * (tz - (TOPLAM - 0.6)) / 0.6)))
    return fr.convert("RGB")

# ---------- kanal üretimi müzik altyapısı (sıcak, yumuşak pad; telif yok) ----------
def altyapi(yol, sn):
    sr = 44100; t = np.arange(int(sn * sr)) / sr; out = np.zeros_like(t)
    akor = [[220.0, 261.63, 329.63], [196.0, 246.94, 293.66], [174.61, 220.0, 261.63], [196.0, 246.94, 329.63]]  # Am C... yumuşak döngü
    blok = 6.0
    for i in range(int(sn // blok) + 1):
        a = akor[i % 4]; s0 = int(i * blok * sr); s1 = min(len(t), int((i + 1) * blok * sr + sr))
        tt = t[s0:s1] - i * blok; env = np.clip(tt / 1.5, 0, 1) * np.clip((blok + 1 - tt) / 1.5, 0, 1)
        for f in a: out[s0:s1] += env * (np.sin(2 * np.pi * f * tt) * 0.5 + np.sin(2 * np.pi * f * 2.003 * tt) * 0.12)
    out += 0.15 * np.sin(2 * np.pi * 110 * t) * (0.6 + 0.4 * np.sin(2 * np.pi * 0.07 * t))
    out = out / (np.abs(out).max() + 1e-9) * 0.6
    import wave
    with wave.open(yol, "wb") as w_: w_.setnchannels(1); w_.setsampwidth(2); w_.setframerate(sr); w_.writeframes((out * 32767).astype(np.int16).tobytes())

CIK = f"{K}/cikti"; os.makedirs(CIK, exist_ok=True)
if KURU:
    print(json.dumps({"toplam": round(TOPLAM, 1), "sahne": [(s[2], round(s[0], 1), round(s[1], 1)) for s in SAHNE]}, ensure_ascii=False))
    for n, si in enumerate(range(0, len(SAHNE), max(1, len(SAHNE) // 4))): kare(int((SAHNE[si][0] + 1.2) * FPS)).save(f"{CIK}/kuru_{AD}_{n}.jpg", quality=80)
    sys.exit()
altyapi(f"{CIK}/altyapi_{AD}.wav", TOPLAM + 1)
subprocess.run(["ffmpeg", "-y", "-v", "error", "-i", SES, "-af", "loudnorm=I=-16:TP=-1.5", "-ar", "44100", "-ac", "1", f"{CIK}/konusma_{AD}.wav"], check=True)
subprocess.run(["ffmpeg", "-y", "-v", "error", "-i", f"{CIK}/konusma_{AD}.wav", "-i", f"{CIK}/altyapi_{AD}.wav", "-filter_complex",
                f"[0:a]apad=pad_dur={KUYRUK}[v];[1:a]atrim=0:{TOPLAM:.2f},afade=t=in:d=1.5,afade=t=out:st={TOPLAM-2.5:.2f}:d=2.5,volume=0.10[m];[v][m]amix=inputs=2:duration=first:normalize=0,loudnorm=I=-15:TP=-1.5[a]",
                "-map", "[a]", "-ar", "44100", f"{CIK}/ses_{AD}.m4a"], check=True)
out = f"{CIK}/{AD}{'_onizleme' if ONIZ else ''}.mp4"
olcek = ["-vf", "scale=540:960"] if ONIZ else []
ff = subprocess.Popen(["ffmpeg", "-y", "-v", "error", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-", "-i", f"{CIK}/ses_{AD}.m4a", *olcek,
                       "-c:v", "libx264", "-preset", "veryfast", "-crf", "23", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "160k", "-shortest", "-movflags", "+faststart", out], stdin=subprocess.PIPE)
for fi in range(N):
    ff.stdin.write(kare(fi).tobytes())
    if fi % 600 == 0: print(f"{AD}: kare {fi}/{N}", flush=True)
ff.stdin.close(); ff.wait(); print("bitti", out, os.path.getsize(out) // 1024, "KB")
