"""Dokunma Efekti motoru v1 — gerçek fotoğraf + özgün çizgi karakter + suya atlama efekti.
Kullanım: python3 motor.py [arka_plan.jpg] [su_y_orani]  (arka plan yoksa yer tutucu manzara)
Çıktı: cikti/deneme.mp4 (1080x1920, 30fps, 10 sn)
"""
import sys, os, math, subprocess, random
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter

W, H, FPS, SURE = 1080, 1920, 30, 10
PW, PH = 1000, 750  # panel boyutu
random.seed(7)
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "cikti")
os.makedirs(os.path.join(OUT, "kare"), exist_ok=True)

def font(sz):
    for p in ["/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"]:
        if os.path.exists(p):
            return ImageFont.truetype(p, sz)
    return ImageFont.load_default()

# ---------- arka plan ----------
def yer_tutucu():
    im = Image.new("RGB", (PW, PH))
    d = ImageDraw.Draw(im)
    for y in range(PH):
        t = y / PH
        if t < 0.45:
            c = (int(120 + 90 * t), int(170 + 60 * t), int(225 - 20 * t))
        else:
            c = (40, 90, 110)
        d.line([(0, y), (PW, y)], fill=c)
    # kayalık vadi duvarları
    d.polygon([(0, 120), (180, 160), (320, 300), (300, 420), (0, 470)], fill=(176, 140, 104))
    d.polygon([(PW, 90), (800, 170), (690, 320), (720, 430), (PW, 470)], fill=(166, 128, 96))
    d.polygon([(250, 330), (420, 280), (560, 300), (720, 300), (760, 400), (230, 410)], fill=(110, 140, 80))
    # nehir
    for y in range(400, PH):
        t = (y - 400) / (PH - 400)
        d.line([(0, y), (PW, y)], fill=(int(50 + 30 * t), int(110 + 30 * t), int(130 + 20 * t)))
    # kıyı taşı (karakterin zıplayacağı yer)
    d.polygon([(0, 470), (330, 450), (380, 520), (0, 560)], fill=(140, 120, 100))
    im = im.filter(ImageFilter.GaussianBlur(1.2))
    a = np.array(im).astype(np.float32)
    a += np.random.normal(0, 4, a.shape)  # foto dokusu
    return Image.fromarray(np.clip(a, 0, 255).astype(np.uint8))

if len(sys.argv) > 1:
    bg = Image.open(sys.argv[1]).convert("RGB")
    r = max(PW / bg.width, PH / bg.height)
    bg = bg.resize((int(bg.width * r) + 1, int(bg.height * r) + 1), Image.LANCZOS)
    bg = bg.crop(((bg.width - PW) // 2, (bg.height - PH) // 2, (bg.width - PW) // 2 + PW, (bg.height - PH) // 2 + PH))
    SU_Y = float(sys.argv[2]) if len(sys.argv) > 2 else 0.72
else:
    bg = yer_tutucu()
    SU_Y = 0.72
BG = np.array(bg).astype(np.float32)

# su giriş noktası
SX, SY = int(PW * 0.58), int(PH * SU_Y)
KIYI = (int(PW * 0.24), int(PH * 0.62))  # zıplama noktası

# ---------- özgün karakter "Tutu" (Frig külahlı çocuk) ----------
def karakter(d, x, y, s=1.0, faz=0.0, poz="yuru"):
    k = (25, 25, 30); L = int(5 * s)
    def el(cx, cy, rx, ry, fill):
        d.ellipse([cx - rx, cy - ry, cx + rx, cy + ry], fill=fill, outline=k, width=L)
    sw = math.sin(faz) * 18 * s if poz == "yuru" else 0
    if poz == "zipla":
        sw = 0
    # bacaklar
    if poz != "batik":
        for i, sg in enumerate((-1, 1)):
            ox = sg * 14 * s + (sw * sg)
            d.line([(x + sg * 12 * s, y - 40 * s), (x + ox, y)], fill=k, width=int(11 * s))
            d.line([(x + sg * 12 * s, y - 40 * s), (x + ox, y)], fill=(240, 200, 160), width=int(6 * s))
            el(x + ox + 6 * s, y, 13 * s, 7 * s, (120, 70, 40))
    # gövde (kırmızı tunik)
    d.polygon([(x - 30 * s, y - 40 * s), (x + 30 * s, y - 40 * s), (x + 20 * s, y - 110 * s), (x - 20 * s, y - 110 * s)],
              fill=(210, 60, 50), outline=k, width=L)
    d.line([(x - 26 * s, y - 62 * s), (x + 26 * s, y - 62 * s)], fill=(240, 190, 60), width=int(6 * s))
    # kollar
    kol = -60 if poz == "zipla" else 0
    for sg in (-1, 1):
        ex = x + sg * (42 * s) + (-sw * sg * 0.6)
        ey = y - (70 + (kol if poz == "zipla" else 0) * -1) * s if poz != "zipla" else y - 150 * s
        d.line([(x + sg * 20 * s, y - 100 * s), (ex, ey)], fill=k, width=int(11 * s))
        d.line([(x + sg * 20 * s, y - 100 * s), (ex, ey)], fill=(240, 200, 160), width=int(6 * s))
    # kafa
    el(x, y - 140 * s, 34 * s, 32 * s, (245, 205, 165))
    # Frig külahı
    d.polygon([(x - 36 * s, y - 150 * s), (x + 34 * s, y - 152 * s), (x + 22 * s, y - 196 * s), (x - 8 * s, y - 206 * s), (x + 30 * s, y - 214 * s)],
              fill=(230, 80, 60), outline=k, width=L)
    # yüz
    d.ellipse([x + 4 * s, y - 148 * s, x + 12 * s, y - 138 * s], fill=k)
    d.ellipse([x + 18 * s, y - 148 * s, x + 26 * s, y - 138 * s], fill=k)
    if poz == "zipla":
        d.ellipse([x + 8 * s, y - 128 * s, x + 22 * s, y - 116 * s], fill=k)  # "vay" ağzı
    else:
        d.arc([x + 6 * s, y - 134 * s, x + 24 * s, y - 120 * s], 20, 160, fill=k, width=int(4 * s))
    el(x - 2 * s, y - 130 * s, 6 * s, 4 * s, (240, 150, 140))

# ---------- su efektleri ----------
damlalar = []
def su_bozulma(arr, t_rel):
    """Gerçek görüntüdeki suyu halka halka dalgalandırır (dokunma tepkisi)."""
    if t_rel < 0:
        return arr
    yy, xx = np.mgrid[0:PH, 0:PW].astype(np.float32)
    dx = (xx - SX); dy = (yy - SY) * 2.6  # perspektif: elips halkalar
    r = np.sqrt(dx * dx + dy * dy) + 1e-3
    on = 36 + 260 * t_rel
    genlik = 9 * math.exp(-0.9 * t_rel)
    dalga = genlik * np.sin((r - on) / 11.0) * np.exp(-((r - on) / 90.0) ** 2) + \
            genlik * 0.6 * np.sin((r - on * 0.6) / 9.0) * np.exp(-((r - on * 0.6) / 60.0) ** 2)
    maske = np.clip((yy - PH * (SU_Y - 0.12)) / 40.0, 0, 1)
    ox = (dx / r) * dalga * maske; oy = (dy / r) * dalga * maske * 0.5
    sx = np.clip(xx + ox, 0, PW - 1).astype(np.int32); sy = np.clip(yy + oy, 0, PH - 1).astype(np.int32)
    out = arr[sy, sx]
    parlak = (np.cos((r - on) / 11.0) * np.exp(-((r - on) / 70.0) ** 2) * maske * 35 * math.exp(-0.7 * t_rel))[..., None]
    return np.clip(out + parlak, 0, 255)

def sicrama_baslat():
    for _ in range(70):
        a = random.uniform(-math.pi * 0.95, -math.pi * 0.05)
        v = random.uniform(5, 19)
        damlalar.append([SX + random.uniform(-20, 20), SY, math.cos(a) * v * 0.8, math.sin(a) * v, random.uniform(4, 11)])

def damla_ciz(d):
    for p in damlalar:
        p[0] += p[2]; p[1] += p[3]; p[3] += 0.75
        if p[1] < SY + 8:
            d.ellipse([p[0] - p[4], p[1] - p[4], p[0] + p[4], p[1] + p[4] * 1.3], fill=(225, 245, 255), outline=(25, 25, 30), width=3)
    damlalar[:] = [p for p in damlalar if p[1] < SY + 8]

def cizgi_halka(d, t_rel):
    for i in range(3):
        rr = 40 + 230 * max(0, t_rel - i * 0.35)
        if t_rel - i * 0.35 > 0 and rr < 330:
            d.ellipse([SX - rr, SY - rr / 2.6, SX + rr, SY + rr / 2.6], outline=(255, 255, 255), width=4)

# ---------- kare üretimi ----------
F_ON = font(54); F_ET = font(40); F_KUC = font(30)
TZIP, TSU = 3.2, 4.4
sicradi = False
toplam = FPS * SURE
for f in range(toplam):
    t = f / FPS
    trel = t - TSU
    arr = su_bozulma(BG, trel) if trel >= 0 else BG
    panel = Image.fromarray(arr.astype(np.uint8))
    d = ImageDraw.Draw(panel)
    if t < TZIP:  # kıyıya yürü
        p = t / TZIP
        x = -60 + (KIYI[0] + 60) * p; y = KIYI[1]
        karakter(d, x, y, 1.0, t * 9, "yuru")
    elif t < TSU:  # yay çizerek zıpla
        p = (t - TZIP) / (TSU - TZIP)
        x = KIYI[0] + (SX - KIYI[0]) * p
        y = KIYI[1] + (SY - KIYI[1]) * p - 260 * math.sin(math.pi * p)
        karakter(d, x, y, 1.0, 0, "zipla")
    else:
        if not sicradi:
            sicrama_baslat(); sicradi = True
        cizgi_halka(d, trel)
        if trel > 2.4:  # kafası sudan çıkar, el sallar
            yuk = min(1, (trel - 2.4) / 0.6)
            ky = SY + 40 - 120 * yuk
            sub = Image.new("RGBA", (PW, PH), (0, 0, 0, 0)); sd = ImageDraw.Draw(sub)
            karakter(sd, SX, ky + 140, 1.0, 0, "batik")
            sub = sub.crop((0, 0, PW, SY + 6)); panel.paste(sub, (0, 0), sub)
            d = ImageDraw.Draw(panel)
            if trel > 3.2:
                d.text((SX + 50, SY - 190), "YAŞASIN!", font=F_ET, fill=(255, 255, 255), stroke_width=5, stroke_fill=(25, 25, 30))
        damla_ciz(d)
    # ekran düzeni
    can = Image.new("RGB", (W, H), (14, 14, 18)); cd = ImageDraw.Draw(can)
    cd.text((W // 2, 120), "ANTİK STÜDYO", font=F_ON, fill=(240, 190, 60), anchor="mm")
    cd.text((W // 2, 185), "çizgi karakter × gerçek dünya", font=F_KUC, fill=(200, 200, 210), anchor="mm")
    m = Image.new("L", (PW, PH), 0); ImageDraw.Draw(m).rounded_rectangle([0, 0, PW, PH], 28, fill=255)
    can.paste(panel, (40, 240), m)
    cd.text((W // 2, 1050), "ORİJİNAL ÇEKİM", font=F_ON, fill=(255, 110, 160), anchor="mm")
    can.paste(Image.fromarray(BG.astype(np.uint8)), (40, 1110), m)
    can.save(os.path.join(OUT, "kare", f"{f:04d}.jpg"), quality=90)

subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-framerate", str(FPS), "-i", os.path.join(OUT, "kare", "%04d.jpg"),
                "-c:v", "libx264", "-preset", "veryfast", "-crf", "20", "-pix_fmt", "yuv420p", os.path.join(OUT, "deneme.mp4")], check=True)
print("tamam", os.path.join(OUT, "deneme.mp4"))
