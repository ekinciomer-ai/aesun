# Nazar Short — karma kurgu (illüstrasyon + 3 katlı başlık + sarı altyazı). Kullanım: DIL=tr|en python3 karma_nazar.py
import os, sys, subprocess, json, math, re
from PIL import Image, ImageDraw, ImageFont, ImageFilter
from fontTools.ttLib import TTFont

K = os.path.dirname(os.path.abspath(__file__)); DIL = os.environ.get("DIL", "tr"); KURU = os.environ.get("KURU") == "1"
W, H, FPS = 1080, 1920, 25
F = f"{K}/fonts"
FONT = {"cinzel7": f"{F}/cinzel-700.ttf", "cinzel9": f"{F}/cinzel-900.ttf", "alfa": f"{F}/alfa-400.ttf",
        "inter": "/usr/share/fonts/opentype/inter/Inter-Black.otf", "interb": "/usr/share/fonts/opentype/inter/Inter-ExtraBold.otf"}
CMAP = {k: set(TTFont(v).getBestCmap().keys()) for k, v in FONT.items()}
def font(ad, px, metin=""):
    if ad != "inter" and any(ord(c) not in CMAP[ad] for c in metin): ad = "inter"
    return ImageFont.truetype(FONT[ad], px)

# metin ve ses
M = [l.strip() for l in open(f"{K}/metin_{DIL}.txt", encoding="utf-8") if l.strip()]
SES = [f"{K}/NAZAR_{DIL.upper()}_SES__s{i+1}.mp3" for i in range(len(M))]
def sure(p): return float(subprocess.check_output(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", p]))
D = [sure(p) for p in SES]; ARA = 0.3
# sahneler: (görsel, yön, başlıklar[(küçük altın, büyük beyaz, büyük altın)])
B = {"tr": [
    ("s1", 1, [("TÜRKİYE · BUGÜN", "3 KİŞİDEN 2'Sİ", "İNANIYOR")]),
    ("s8", -1, [("AMA ASIL ŞOK", "5.000 YIL", "ÖNCE!")]),
    ("s2", 1, [("MÖ 1300 · UGARİT", "KİL TABLET", "KEM GÖZ")]),
    ("s3", -1, [("ROMA · YUNAN", "PLUTARKHOS", "GÖZ IŞIN SAÇAR")]),
    ("s4", 1, [("ROMA · 1850", "PAPA IX. PİUS", "NAZARLI PAPA")]),
    ("s5", -1, [("İZMİR · 1890", "ARAP CAM", "USTALARI")]),
    ("s6", 1, [("GÖRECE → NAZARKÖY", "OCAKLAR", "SÖNDÜ")]),
    ("s7", -1, [("186 TOPLUM", "KISKANÇLIK", "NAZARI BÜYÜTÜR")]),
    ("s8", 1, [("GÖZLER AYNI", "KORKU AYNI!", "TAMAMI KANALDA ▶")]),
], "en": [
    ("s1", 1, [("TURKEY · TODAY", "2 OUT OF 3", "BELIEVE IT")]),
    ("s8", -1, [("THE REAL SHOCK", "5,000 YEARS", "AGO!")]),
    ("s2", 1, [("1300 BC · UGARIT", "CLAY TABLET", "EVIL EYE")]),
    ("s3", -1, [("GREECE · ROME", "PLUTARCH", "EYES SHOOT RAYS")]),
    ("s4", 1, [("ROME · 1850s", "POPE PIUS IX", "THE CURSED POPE")]),
    ("s5", -1, [("IZMIR · 1890s", "ARAB GLASS", "MASTERS")]),
    ("s6", 1, [("GÖRECE → NAZARKÖY", "FURNACES", "WENT COLD")]),
    ("s7", -1, [("186 SOCIETIES", "ENVY", "FEEDS THE EYE")]),
    ("s8", 1, [("SAME EYES", "SAME FEAR!", "FULL STORY ▶")]),
]}[DIL]
assert len(B) == len(M)
ALT = {"tr": "Temsili illüstrasyon (yapay zekâ) · Ses: yapay zekâ ile klonlanmış kendi sesim", "en": "Illustration: AI generated · Voice: my own AI-cloned voice"}[DIL]
KANAL = {"tr": "ANTİK STÜDYO", "en": "ANCIENT STUDIO"}[DIL]

# zaman çizelgesi
T = []; t = 0.0
for i, d in enumerate(D):
    T.append((t, t + d)); t += d + ARA
TOPLAM = t; N = int(TOPLAM * FPS)
# altyazı grupları: cümle içinde 3 kelimelik gruplar, karakter oranıyla
def gruplar(s):
    w = s.split(); g = [w[i:i+3] for i in range(0, len(w), 3)]
    if len(g) > 1 and len(g[-1]) == 1: g[-2] += g[-1]; g.pop()
    return [" ".join(x) for x in g]
def tr_upper(s): return (s.replace("i", "İ").replace("ı", "I") if DIL == "tr" else s).upper()
ALTY = []
for i, s in enumerate(M):
    g = gruplar(s); top = sum(len(x) for x in g); t0, t1 = T[i]; c = t0
    for x in g:
        d = (t1 - t0) * len(x) / top; ALTY.append((c, c + d, tr_upper(x))); c += d

IMG = {}
def gorsel(ad):
    if ad not in IMG:
        im = Image.open(f"{K}/img/{ad}.png").convert("RGB")
        # 1080x1920'ye kırp (kapla)
        r = max(W * 1.12 / im.width, H * 1.12 / im.height); im = im.resize((int(im.width * r), int(im.height * r)), Image.LANCZOS)
        IMG[ad] = im
    return IMG[ad]

# üst/alt yumuşak koyulaşma (bir kez)
GOLGE = Image.new("RGBA", (W, H), (0, 0, 0, 0)); _g = GOLGE.load()
for y in range(H):
    a = int(110 * max(0, 1 - y / 620) ** 1.2) if y < 620 else (int(120 * max(0, (y - (H - 520)) / 520) ** 1.2) if y > H - 520 else 0)
    for x in range(W): _g[x, y] = (0, 0, 0, a)
def kare(fi):
    tz = fi / FPS
    si = next((i for i, (a, b) in enumerate(T) if tz < b + ARA), len(T) - 1)
    ad, yon, bas = B[si]; a, b = T[si]; p = min(1, max(0, (tz - a) / (b - a + ARA)))
    im = gorsel(ad); z = 1.0 + 0.08 * (p if yon > 0 else 1 - p)
    cw, ch = int(W / z * 1.0), int(H / z * 1.0)
    cx = (im.width - cw) // 2 + int((im.width - cw) * 0.25 * math.sin(p * 3.14) * yon); cy = (im.height - ch) // 2
    fr = im.crop((cx, cy, cx + cw, cy + ch)).resize((W, H), Image.BILINEAR)
    fr = Image.alpha_composite(fr.convert("RGBA"), GOLGE).convert("RGB"); d = ImageDraw.Draw(fr, "RGBA")
    # 3 katlı başlık (sırayla süzülür)
    k, bb, g = bas[0]; ysb = 150
    for j, (metin, fad, px, renk) in enumerate([(k, "cinzel7", 46, (232, 196, 112)), (bb, "alfa", 112, (255, 255, 255)), (g, "cinzel9", 84, (232, 196, 112))]):
        gec = min(1, max(0, (tz - a - 0.25 * j) / 0.45)); ft = font(fad, px, metin)
        while d.textlength(metin, font=ft) > W - 80 and px > 30: px -= 4; ft = font(fad, px, metin)
        y = ysb + (1 - gec) * 40; x = (W - d.textlength(metin, font=ft)) / 2
        d.text((x, y), metin, font=ft, fill=renk + (int(255 * gec),), stroke_width=4, stroke_fill=(0, 0, 0, int(230 * gec)))
        ysb += px + 18
    # altyazı
    for a2, b2, x in ALTY:
        if a2 <= tz < b2:
            px = 66; ft = font("inter", px)
            while d.textlength(x, font=ft) > W - 60 and px > 36: px -= 4; ft = font("inter", px)
            d.text(((W - d.textlength(x, font=ft)) / 2, 1480), x, font=ft, fill=(255, 214, 0), stroke_width=6, stroke_fill=(0, 0, 0)); break
    # alt yazılar
    ft = font("inter", 30); d.text(((W - d.textlength(KANAL, font=ft)) / 2, H - 70), KANAL, font=ft, fill=(255, 255, 255), stroke_width=3, stroke_fill=(0, 0, 0))
    ft = font("interb", 22); d.text((W - d.textlength(ALT, font=ft) - 24, H - 112), ALT, font=ft, fill=(220, 220, 220), stroke_width=2, stroke_fill=(0, 0, 0))
    # geçiş flaşı (0.2 sn krem)
    for (a3, _) in T[1:]:
        if abs(tz - a3) < 0.1: d.rectangle((0, 0, W, H), fill=(250, 240, 220, int(200 * (1 - abs(tz - a3) / 0.1))))
    return fr

if KURU:
    print(json.dumps({"toplam": round(TOPLAM, 1), "sahne": [(B[i][0], round(T[i][0], 1), round(T[i][1], 1)) for i in range(len(T))]}, ensure_ascii=False))
    kare(int(T[4][0] * FPS) + 20).save(f"{K}/kuru_{DIL}.png"); sys.exit()
# ses birleştir
lst = f"{K}/ses_{DIL}.txt"
with open(lst, "w") as f:
    for p in SES: f.write(f"file '{p}'\nfile '{K}/sessiz.wav'\n")
subprocess.run(["ffmpeg", "-y", "-v", "error", "-f", "lavfi", "-i", f"anullsrc=r=44100:cl=mono", "-t", str(ARA), f"{K}/sessiz.wav"], check=True)
subprocess.run(["ffmpeg", "-y", "-v", "error", "-f", "concat", "-safe", "0", "-i", lst, "-af", "loudnorm=I=-16:TP=-1.5", "-ar", "44100", f"{K}/ses_{DIL}.m4a"], check=True)
out = f"{K}/NAZAR_{DIL.upper()}.mp4"
ff = subprocess.Popen(["ffmpeg", "-y", "-v", "error", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-", "-i", f"{K}/ses_{DIL}.m4a",
                       "-c:v", "libx264", "-preset", "medium", "-crf", "22", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "160k", "-shortest", "-movflags", "+faststart", out], stdin=subprocess.PIPE)
for fi in range(N):
    ff.stdin.write(kare(fi).tobytes())
    if fi % 250 == 0: print(f"kare {fi}/{N}", flush=True)
ff.stdin.close(); ff.wait(); print("bitti", out, os.path.getsize(out) // 1024, "KB")
