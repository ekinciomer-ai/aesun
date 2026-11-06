# Nazar Short — PRO kurgu: harita açılışı, canlı duman/ateş/su, toz, film dokusu, renk tonlama, vurgu yakınlaşması,
# kelime kelime altyazı, animasyonlu 3 katlı başlık, kapanış kartı. Kullanım: DIL=tr|en|es [KURU=1] python3 karma_pro.py
import os, sys, subprocess, json, math, re, random
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter
from fontTools.ttLib import TTFont

K = os.path.dirname(os.path.abspath(__file__)); DIL = os.environ.get("DIL", "tr"); KURU = os.environ.get("KURU") == "1"
W, H, FPS = 1080, 1920, 25
F = f"{K}/fonts"
FONT = {"cinzel7": f"{F}/cinzel-700.ttf", "cinzel9": f"{F}/cinzel-900.ttf", "alfa": f"{F}/alfa-400.ttf",
        "inter": "/usr/share/fonts/opentype/inter/Inter-Black.otf", "interb": "/usr/share/fonts/opentype/inter/Inter-ExtraBold.otf"}
CMAP = {k: set(TTFont(v).getBestCmap().keys()) for k, v in FONT.items()}
_FC = {}
def font(ad, px, metin=""):
    if ad != "inter" and any(ord(c) not in CMAP[ad] for c in metin): ad = "inter"
    if (ad, px) not in _FC: _FC[(ad, px)] = ImageFont.truetype(FONT[ad], px)
    return _FC[(ad, px)]
def ease(p): return 1 - (1 - p) ** 3
random.seed(7)

# ---------- metin, ses, zaman ----------
M = [l.strip() for l in open(f"{K}/metin_{DIL}.txt", encoding="utf-8") if l.strip()]
SESK = {"tr": ["NAZAR2_TR_SES"] * 9, "es": ["NAZAR2_ES_SES"] * 9,
        "en": ["NAZAR2_EN_SES"] * 5 + ["NAZAR3_EN_SES"] * 2 + ["NAZAR2_EN_SES"] * 2}[DIL]
SES = [f"{K}/{SESK[i]}__s{i+1}.mp3" for i in range(len(M))]
def sure(p): return float(subprocess.check_output(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", p]))
D = [sure(p) for p in SES]; ARA = 0.28; KUYRUK = 1.4
T = []; t = 0.0
for d in D: T.append((t, t + d)); t += d + ARA
TOPLAM = t - ARA + KUYRUK; N = int(TOPLAM * FPS)

# ---------- sahne planı ----------
# (görsel | "HARITA", yön, (küçük altın, büyük beyaz, büyük altın))
B = {"tr": [
    ("HARITA", 1, ("TÜRKİYE · BUGÜN", "3 KİŞİDEN 2'Sİ", "İNANIYOR")),
    ("s8", -1, ("AMA ASIL ŞOK", "5.000 YIL", "ÖNCE!")),
    ("s2", 1, ("MÖ 1300 · UGARİT", "KİL TABLET", "KEM GÖZ")),
    ("s3", -1, ("ROMA · YUNAN", "PLUTARKHOS", "GÖZ IŞIN SAÇAR")),
    ("s4", 1, ("ROMA · 1850", "PAPA IX. PİUS", "NAZARLI PAPA")),
    ("s5", -1, ("İZMİR · 1890", "ARAP CAM", "USTALARI")),
    ("s6", 1, ("GÖRECE → NAZARKÖY", "OCAKLAR", "SÖNDÜ")),
    ("s7", -1, ("186 TOPLUM", "KISKANÇLIK", "NAZARI BÜYÜTÜR")),
    ("s8", 1, ("GÖZLER AYNI", "KORKU AYNI!", "TAMAMI KANALDA ▶")),
], "en": [
    ("HARITA", 1, ("WORLDWIDE · TODAY", "MILLIONS", "BELIEVE IT")),
    ("s8", -1, ("THE REAL SHOCK", "5,000 YEARS", "AGO!")),
    ("s2", 1, ("1300 BC · UGARIT", "CLAY TABLET", "EVIL EYE")),
    ("s3", -1, ("GREECE · ROME", "PLUTARCH", "EYES SHOOT RAYS")),
    ("s4", 1, ("ROME · 1850s", "POPE PIUS IX", "THE CURSED POPE")),
    ("s13", -1, ("GREECE · ITALY · MEXICO", "ONE FEAR", "A THOUSAND CHARMS")),
    ("s11", 1, ("MEXICO · TODAY", "AN EGG", "AND A PRAYER")),
    ("s7", -1, ("186 SOCIETIES", "ENVY", "FEEDS THE EYE")),
    ("s8", 1, ("SAME EYES", "SAME FEAR!", "FULL STORY ▶")),
], "es": [
    ("s9", 1, ("ROMA · 1923", "ALFONSO XIII", "¿MAL DE OJO?")),
    ("s8", -1, ("EL VERDADERO SUSTO", "5.000 AÑOS", "¡DE MIEDO!")),
    ("s2", 1, ("1300 A.C. · UGARIT", "TABLILLA", "MAL DE OJO")),
    ("s3", -1, ("GRECIA · ROMA", "PLUTARCO", "EL OJO LANZA RAYOS")),
    ("s4", 1, ("ROMA · 1850", "PÍO NONO", "EL PAPA GAFE")),
    ("s10", -1, ("ESPAÑA · SIGLO XVI", "LA HIGA", "DE AZABACHE")),
    ("s11", 1, ("ESPAÑA · HOY", "UN HUEVO", "Y UNA ORACIÓN")),
    ("s7", -1, ("186 SOCIEDADES", "ENVIDIA", "ALIMENTA EL OJO")),
    ("s8", 1, ("LOS MISMOS OJOS", "¡EL MISMO MIEDO!", "HISTORIA COMPLETA ▶")),
]}[DIL]
assert len(B) == len(M)
ALT = {"tr": "Temsili illüstrasyon (yapay zekâ) · Harita: Natural Earth · Ses: yapay zekâ ile klonlanmış kendi sesim",
       "en": "Illustrations: AI generated · Map: Natural Earth · Voice: my own AI-cloned voice",
       "es": "Ilustraciones: generadas por IA · Mapa: Natural Earth · Voz: mi propia voz clonada con IA"}[DIL]
KANAL = {"tr": "ANTİK STÜDYO", "en": "ANCIENT STUDIO", "es": "ESTUDIO ANTIGUO"}[DIL]
KAPANIS = {"tr": "TAMAMI KANALDA", "en": "FULL STORY ON THE CHANNEL", "es": "HISTORIA COMPLETA EN EL CANAL"}[DIL]
# efektler: görsel → {su:(y0,y1), duman:(cx,cy,rx,ry), ates:[(cx,cy,r)]} (kaynak görselin oranı)
EF = {"s1": {"su": (0.42, 0.56)}, "s2": {"su": (0.49, 0.62)}, "s3": {"ates": [(0.46, 0.80, 0.03)]},
      "s5": {"duman": (0.60, 0.28, 0.16, 0.22), "ates": [(0.78, 0.80, 0.07)]}, "s6": {"ates": [(0.43, 0.70, 0.06)], "su": (0.44, 0.52)},
      "s10": {"su": (0.40, 0.60)}, "s12": {}, "s13": {}}
# harita noktaları (lon, lat, etiket)
# (lon, lat, etiket, etiket yönü: 1 sağ / -1 sol, dikey kayma, büyük mü)
NOKTA = {"tr": [(35.0, 39.0, "TÜRKİYE %69", 1, -40, True), (22.0, 39.5, "YUNANİSTAN %66", -1, 40, False), (-6.0, 32.0, "FAS %80", -1, 0, False), (9.5, 34.0, "TUNUS %90", 1, 45, False), (78.0, 22.0, "HİNDİSTAN", 1, 0, False), (-102.0, 23.5, "MEKSİKA", 1, 0, False), (40.0, 56.0, "RUSYA %56", 1, -30, False)],
         "en": [(22.0, 39.5, "GREECE 66%", -1, -40, True), (35.0, 39.0, "TURKEY 69%", 1, -40, False), (-6.0, 32.0, "MOROCCO 80%", -1, 10, False), (9.5, 34.0, "TUNISIA 90%", 1, 45, False), (78.0, 22.0, "INDIA", 1, 0, True), (-102.0, 23.5, "MEXICO", 1, 0, True), (40.0, 56.0, "RUSSIA 56%", 1, -30, False), (12.5, 42.5, "ITALY", -1, -45, False)],
         "es": [(-3.7, 40.0, "ESPAÑA", -1, -45, True), (12.5, 42.5, "ITALIA", 1, -40, False), (-102.0, 23.5, "MÉXICO", 1, 0, True), (22.0, 39.5, "GRECIA 66%", 1, 40, False), (-6.0, 32.0, "MARRUECOS 80%", -1, 30, False), (35.0, 39.0, "TURQUÍA 69%", 1, -30, False), (-58.0, -34.0, "ARGENTINA", 1, 0, False)]}[DIL]

# ---------- altyazı: kelime zamanları (karakter oranı) ----------
def tr_upper(s): return (s.replace("i", "İ").replace("ı", "I") if DIL == "tr" else s).upper()
KEL = []  # (t0, t1, grup_idx, kelime_idx_in_group, grup_kelimeleri)
for i, s in enumerate(M):
    w = s.split(); g = [w[k:k+3] for k in range(0, len(w), 3)]
    if len(g) > 1 and len(g[-1]) == 1: g[-2] += g[-1]; g.pop()
    t0, t1 = T[i]; top = sum(len(x) + 1 for x in w); c = t0
    for gi, grp in enumerate(g):
        for wi, x in enumerate(grp):
            d = (t1 - t0) * (len(x) + 1) / top; KEL.append((c, c + d, i, gi, wi, [tr_upper(y) for y in grp])); c += d

# ---------- görseller ----------
IMG = {}
def gorsel(ad):
    if ad not in IMG:
        im = Image.open(f"{K}/img/{ad}.png").convert("RGB")
        r = max(W * 1.14 / im.width, H * 1.14 / im.height); im = im.resize((int(im.width * r), int(im.height * r)), Image.LANCZOS)
        IMG[ad] = np.asarray(im).astype(np.float32)
    return IMG[ad]

# duman dokusu (procedural, bir kez)
def gurultu(w, h, oktav=4):
    a = np.zeros((h, w), np.float32)
    for o in range(oktav):
        s = 2 ** (o + 3); n = np.random.rand(h // s + 2, w // s + 2).astype(np.float32)
        im = Image.fromarray((n * 255).astype(np.uint8)).resize((w, h), Image.BICUBIC); a += np.asarray(im).astype(np.float32) / 255 / (2 ** o)
    a -= a.min(); a /= a.max(); return a
np.random.seed(3); DUMAN = gurultu(512, 1024)
DUST = [(random.random(), random.random(), random.uniform(1.5, 3.5), random.uniform(0.004, 0.012), random.random() * 6.28) for _ in range(70)]

def efektler(arr, ad, tz):
    e = EF.get(ad, {}); h, w = arr.shape[:2]
    if "su" in e:
        y0, y1 = int(e["su"][0] * h), int(e["su"][1] * h); band = arr[y0:y1].copy(); n = y1 - y0
        for k in range(0, n, 2):
            f = (k / n); amp = 2.5 * math.sin(f * 3.14); dx = int(round(amp * math.sin(tz * 2.1 + k * 0.35)))
            band[k:k+2] = np.roll(band[k:k+2], dx, axis=1)
        # ışıltı
        par = (np.sin(np.linspace(0, 40, w)[None, :] + tz * 3.0) * np.sin(np.linspace(0, 9, n)[:, None] * 2 + tz)) > 0.985
        band[par] = np.minimum(band[par] + 60, 255); arr[y0:y1] = band
    if "duman" in e:
        cx, cy, rx, ry = e["duman"]; cx, cy, rx, ry = int(cx * w), int(cy * h), int(rx * w), int(ry * h)
        x0, y0 = max(0, cx - rx), max(0, cy - ry); x1, y1 = min(w, cx + rx), min(h, cy + ry)
        yy, xx = np.mgrid[y0:y1, x0:x1]; mask = np.clip(1 - ((xx - cx) / rx) ** 2 - ((yy - cy) / ry) ** 2, 0, 1) ** 1.5
        oy = int((tz * 55) % 512); ox = int((tz * 12) % 100)
        tex = np.tile(DUMAN, (3, 3))[oy:oy + (y1 - y0), ox:ox + (x1 - x0)]
        a = (mask * (0.25 + 0.45 * tex))[..., None]; arr[y0:y1, x0:x1] = arr[y0:y1, x0:x1] * (1 - a) + np.array([205, 200, 195]) * a
    for (cx, cy, r) in e.get("ates", []):
        cx, cy, r = int(cx * w), int(cy * h), int(r * w); x0, y0, x1, y1 = max(0, cx - r), max(0, cy - r), min(w, cx + r), min(h, cy + r)
        yy, xx = np.mgrid[y0:y1, x0:x1]; m = np.clip(1 - ((xx - cx) ** 2 + (yy - cy) ** 2) / (r * r), 0, 1)
        f = 1 + (0.18 * math.sin(tz * 23) + 0.12 * math.sin(tz * 37 + 1) + 0.06 * math.sin(tz * 61)) * m
        arr[y0:y1, x0:x1] = np.clip(arr[y0:y1, x0:x1] * f[..., None] * np.array([1.0, 0.97, 0.9]) + (m * 18)[..., None] * np.array([1, 0.5, 0.1]), 0, 255)
    return arr

# ---------- harita ----------
def harita_taban():
    d = json.load(open(f"{K}/geo/package/land-50m.json")); sc, tr = d["transform"]["scale"], d["transform"]["translate"]
    def arc(i):
        a = d["arcs"][i if i >= 0 else ~i]; x = y = 0; pts = []
        for dx, dy in a: x += dx; y += dy; pts.append((x * sc[0] + tr[0], y * sc[1] + tr[1]))
        return pts if i >= 0 else pts[::-1]
    MW, MH = 4320, 2160  # equirectangular: 12 px/derece
    def pr(lon, lat): return ((lon + 180) * 12, (90 - lat) * 12)
    im = Image.new("RGB", (MW, MH), (12, 24, 46)); dr = ImageDraw.Draw(im)
    # hafif enlem/boylam ızgarası
    geoms = d["objects"]["land"]["geometries"]
    for g in geoms:
        polys = g["arcs"] if g["type"] == "MultiPolygon" else [g["arcs"]]
        for poly in polys:
            for ri, ring in enumerate(poly):
                pts = []
                for ai in ring: pts += arc(ai)
                pts = [pr(*p) for p in pts]
                if len(pts) > 2: dr.polygon(pts, fill=(54, 72, 96) if ri == 0 else (12, 24, 46), outline=(120, 146, 176))
    dr.rectangle((0, 0, MW, 12 * 12), fill=(12, 24, 46))  # kutup artığı
    return im
HARITA = None
def harita_kare(tz, p, basla_sn):
    global HARITA
    if HARITA is None: HARITA = harita_taban()
    # kamera: dünya genel → Akdeniz (TR/EN) ya da İspanya-Atlantik (ES)
    hedef = {"tr": (28, 37, 24.0), "en": (24, 36, 19.0), "es": (-25, 32, 15.0)}[DIL]  # merkez lon, lat, zoom (px/derece)
    z0 = 4.0; z = z0 + (hedef[2] - z0) * ease(min(1, p * 1.25))
    clon = 10 + (hedef[0] - 10) * ease(min(1, p * 1.25)); clat = 20 + (hedef[1] - 20) * ease(min(1, p * 1.25))
    cw, ch = W / z, H / z  # derece
    x0 = (clon + 180) * 12 - cw * 12 / 2; y0 = (90 - clat) * 12 - ch * 12 / 2
    fr = HARITA.crop((int(x0), int(y0), int(x0 + cw * 12), int(y0 + ch * 12))).resize((W, H), Image.BILINEAR)
    d = ImageDraw.Draw(fr, "RGBA")
    def pr(lon, lat): return ((lon + 180) * 12 - x0) * z / 12, ((90 - lat) * 12 - y0) * z / 12
    for i, (lon, lat, et, yon, dy, buyuk) in enumerate(NOKTA):
        x, y = pr(lon, lat); g = min(1, max(0, (tz - basla_sn - 0.5 - i * 0.28) / 0.4))
        if g <= 0 or not (-200 < x < W + 200 and -200 < y < H + 200): continue
        R = 60 if buyuk else 44
        for k in range(3):
            r = 10 + ((tz * 0.9 + k / 3 + i * 0.1) % 1) * R; a = int(160 * (1 - (r - 10) / R) * g)
            d.ellipse((x - r, y - r, x + r, y + r), outline=(255, 200, 80, a), width=3)
        rr = 11 if buyuk else 8
        d.ellipse((x - rr, y - rr, x + rr, y + rr), fill=(255, 210, 90, int(255 * g)), outline=(255, 255, 255, int(255 * g)), width=2)
        ft = font("interb", 40 if buyuk else 32); tw = d.textlength(et, font=ft); yy0 = y + dy
        bx = x + 18 if yon > 0 else x - 18 - tw - 26
        d.line((x, y, bx + (0 if yon > 0 else tw + 26), yy0), fill=(255, 210, 90, int(160 * g)), width=2)
        d.rounded_rectangle((bx, yy0 - 27, bx + tw + 26, yy0 + 27), 10, fill=(0, 0, 0, int(180 * g)), outline=(255, 200, 80, int(120 * g)))
        d.text((bx + 13, yy0 - 24), et, font=ft, fill=(255, 235, 170, int(255 * g)))
    # vinyet
    return fr

# ---------- katmanlar ----------
GOLGE = Image.new("RGBA", (W, H), (0, 0, 0, 0)); _g = np.zeros((H, W, 4), np.uint8)
yy = np.arange(H)[:, None]; a_top = (110 * np.clip(1 - yy / 640, 0, 1) ** 1.3); a_bot = (130 * np.clip((yy - (H - 560)) / 560, 0, 1) ** 1.3)
_g[..., 3] = np.clip(a_top + a_bot, 0, 255).astype(np.uint8); GOLGE = Image.fromarray(_g, "RGBA")
# vinyet + renk tonlama LUT
yy, xx = np.mgrid[0:H, 0:W]; VIN = (1 - 0.55 * np.clip(((xx - W / 2) / (W * 0.62)) ** 2 + ((yy - H / 2) / (H * 0.62)) ** 2, 0, 1) ** 1.6).astype(np.float32)[..., None]
xs = np.arange(256) / 255
LUT = np.stack([np.clip((xs - 0.5) * 1.12 + 0.5 + 0.03 * xs, 0, 1), np.clip((xs - 0.5) * 1.10 + 0.5, 0, 1), np.clip((xs - 0.5) * 1.06 + 0.5 + 0.03 * (1 - xs), 0, 1)], 1)
LUT = (LUT * 255).astype(np.uint8)

def kompoze(arr, tz):
    arr = np.clip(arr * VIN, 0, 255).astype(np.uint8)
    arr = np.stack([LUT[arr[..., 0], 0], LUT[arr[..., 1], 1], LUT[arr[..., 2], 2]], -1)
    # film grain
    arr = np.clip(arr.astype(np.int16) + np.random.randint(-7, 8, (H // 2, W // 2, 1)).repeat(2, 0).repeat(2, 1), 0, 255).astype(np.uint8)
    return Image.fromarray(arr)

def toz(d, tz):
    for (x, y, r, hz, f) in DUST:
        px = (x + 0.03 * math.sin(tz * 0.6 + f)) % 1 * W; py = ((y - tz * hz) % 1) * H; a = int(90 + 70 * math.sin(tz * 2 + f))
        d.ellipse((px - r, py - r, px + r, py + r), fill=(255, 240, 200, a))

def baslik(d, bas, tz, a):
    ysb = 140
    for j, (metin, fad, px, renk) in enumerate([(bas[0], "cinzel7", 44, (232, 196, 112)), (bas[1], "alfa", 112, (255, 255, 255)), (bas[2], "cinzel9", 82, (232, 196, 112))]):
        gec = ease(min(1, max(0, (tz - a - 0.18 * j) / 0.5))); ft = font(fad, px, metin)
        while d.textlength(metin, font=ft) > W - 80 and px > 30: px -= 4; ft = font(fad, px, metin)
        tw = d.textlength(metin, font=ft); x = (W - tw) / 2; y = ysb + (1 - gec) * 50
        d.text((x, y), metin, font=ft, fill=renk + (int(255 * gec),), stroke_width=5, stroke_fill=(0, 0, 0, int(235 * gec)))
        if j == 1:
            lw = tw * gec; d.rectangle(((W - lw) / 2, y + px + 8, (W + lw) / 2, y + px + 12), fill=(232, 196, 112, int(255 * gec)))
        ysb += px + 20

def altyazi(d, tz):
    for (t0, t1, i, gi, wi, grp) in KEL:
        if t0 <= tz < t1:
            px = 68; ft = font("inter", px); metin = " ".join(grp)
            while d.textlength(metin, font=ft) > W - 60 and px > 36: px -= 4; ft = font("inter", px)
            x = (W - d.textlength(metin, font=ft)) / 2; y = 1470
            for k, wd in enumerate(grp):
                fill = (255, 255, 255) if k == wi else (255, 214, 0)
                d.text((x, y), wd, font=ft, fill=fill, stroke_width=6, stroke_fill=(0, 0, 0)); x += d.textlength(wd + " ", font=ft)
            break

def kare(fi):
    tz = fi / FPS
    si = next((i for i, (a, b) in enumerate(T) if tz < b + ARA), len(T) - 1)
    ad, yon, bas = B[si]; a, b = T[si]; p = min(1, max(0, (tz - a) / (b - a + ARA)))
    if ad == "HARITA":
        fr = harita_kare(tz, p, a)
    else:
        arr = gorsel(ad).copy(); arr = efektler(arr, ad, tz)
        h, w = arr.shape[:2]; punch = 0.05 * math.exp(-max(0, tz - a) / 0.35)
        z = 1.0 + 0.09 * (ease(p) if yon > 0 else 1 - ease(p)) + punch
        cw, ch = int(W / z), int(H / z)
        cx = (w - cw) // 2 + int((w - cw) * 0.3 * math.sin(p * 3.14) * yon); cy = (h - ch) // 2 + int((h - ch) * 0.15 * (p - 0.5) * yon)
        fr = Image.fromarray(arr[cy:cy + ch, cx:cx + cw].astype(np.uint8)).resize((W, H), Image.BILINEAR)
    fr = kompoze(np.asarray(fr).astype(np.float32), tz)
    fr = Image.alpha_composite(fr.convert("RGBA"), GOLGE); d = ImageDraw.Draw(fr, "RGBA")
    if ad != "HARITA": toz(d, tz)
    # kapanış kartı
    if si == len(B) - 1:
        g = ease(min(1, max(0, (tz - a - 1.0) / 0.5)))
        if g > 0:
            ft = font("inter", 50); tw = d.textlength(KAPANIS, font=ft); bx, by = (W - tw) / 2 - 36, 560
            pul = 1 + 0.02 * math.sin(tz * 6)
            d.rounded_rectangle((bx, by, bx + tw + 72, by + 96), 22, fill=(200, 30, 30, int(235 * g)), outline=(255, 255, 255, int(255 * g)), width=3)
            d.text(((W - tw) / 2, by + 20), KAPANIS, font=ft, fill=(255, 255, 255, int(255 * g)))
            ft2 = font("interb", 40); s2 = "▶"; d.text(((W - d.textlength(s2, font=ft2)) / 2, by + 110), s2, font=ft2, fill=(255, 255, 255, int(255 * g)))
    baslik(d, bas, tz, a); altyazi(d, tz)
    ft = font("inter", 30); d.text(((W - d.textlength(KANAL, font=ft)) / 2, H - 70), KANAL, font=ft, fill=(255, 255, 255), stroke_width=3, stroke_fill=(0, 0, 0))
    ft = font("interb", 21); d.text((W - d.textlength(ALT, font=ft) - 24, H - 112), ALT, font=ft, fill=(220, 220, 220), stroke_width=2, stroke_fill=(0, 0, 0))
    # geçişler: sahne başında kısa krem flaş; "şok" sahnesinde (2.) kararma
    for k, (a3, _) in enumerate(T[1:], 1):
        if abs(tz - a3) < 0.12:
            if k == 1: d.rectangle((0, 0, W, H), fill=(0, 0, 0, int(255 * (1 - abs(tz - a3) / 0.12))))
            else: d.rectangle((0, 0, W, H), fill=(250, 240, 220, int(190 * (1 - abs(tz - a3) / 0.12))))
    if tz > TOPLAM - 0.6: d.rectangle((0, 0, W, H), fill=(0, 0, 0, int(255 * (tz - (TOPLAM - 0.6)) / 0.6)))
    return fr.convert("RGB")

if KURU:
    print(json.dumps({"toplam": round(TOPLAM, 1), "sahne": [(B[i][0], round(T[i][0], 1), round(T[i][1], 1)) for i in range(len(T))]}, ensure_ascii=False))
    for n, sn in enumerate([T[0][0] + 5.5, T[1][0] + 1.0, T[5][0] + 2.0, T[8][0] + 2.2]): kare(int(sn * FPS)).save(f"{K}/kuru_{DIL}_{n}.png")
    sys.exit()
# ses
lst = f"{K}/ses_{DIL}.txt"
subprocess.run(["ffmpeg", "-y", "-v", "error", "-f", "lavfi", "-i", "anullsrc=r=44100:cl=mono", "-t", str(ARA), f"{K}/sessiz.wav"], check=True)
subprocess.run(["ffmpeg", "-y", "-v", "error", "-f", "lavfi", "-i", "anullsrc=r=44100:cl=mono", "-t", str(KUYRUK), f"{K}/kuyruk.wav"], check=True)
with open(lst, "w") as f:
    for i, p in enumerate(SES):
        w = f"{K}/p_{DIL}_{i}.wav"; subprocess.run(["ffmpeg", "-y", "-v", "error", "-i", p, "-ar", "44100", "-ac", "1", w], check=True)
        f.write(f"file '{w}'\n" + (f"file '{K}/sessiz.wav'\n" if i < len(SES) - 1 else f"file '{K}/kuyruk.wav'\n"))
subprocess.run(["ffmpeg", "-y", "-v", "error", "-f", "concat", "-safe", "0", "-i", lst, "-af", "loudnorm=I=-16:TP=-1.5", "-ar", "44100", f"{K}/ses_{DIL}.m4a"], check=True)
out = f"{K}/NAZAR_{DIL.upper()}_pro.mp4"
ff = subprocess.Popen(["ffmpeg", "-y", "-v", "error", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-", "-i", f"{K}/ses_{DIL}.m4a",
                       "-c:v", "libx264", "-preset", "medium", "-crf", "21", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "160k", "-shortest", "-movflags", "+faststart", out], stdin=subprocess.PIPE)
for fi in range(N):
    ff.stdin.write(kare(fi).tobytes())
    if fi % 250 == 0: print(f"kare {fi}/{N}", flush=True)
ff.stdin.close(); ff.wait(); print("bitti", out, os.path.getsize(out) // 1024, "KB")
