# Antik Stüdyo kurgu motoru (Nazar PRO kalıbının genel hâli): kamu malı tablo/fotoğraf + odak yakınlaşması, harita sahnesi,
# 3 katlı başlık, kelime kelime altyazı, toz/film dokusu/renk tonu, geçiş flaşı, kapanış kartı.
# Kullanım: python3 motor.py <sahne.json> [--onizleme] [--kuru]
#   sahne.json: {kod, dil, format: dikey|yatay, metin:[...], ses:[mp3...], sahneler:[...], alt, kanal, kapanis, cikti}
#   sahne: {"img": yol, "odak": [x0,y0,x1,y1], "odak2": [...], "bas": [kucuk, buyuk, buyuk2]}  (odak: görsel oranı 0-1)
#          {"harita": {"merkez":[lon,lat], "zoom": px/derece, "noktalar": [[lon,lat,etiket,yon,dy,buyuk]], "yol": [[lon,lat],...]}, "bas": [...]}
import os, sys, subprocess, json, math, random
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter
from fontTools.ttLib import TTFont

A = os.path.dirname(os.path.abspath(__file__)); KOK = os.path.dirname(A)
J = json.load(open(sys.argv[1], encoding="utf-8")); JD = os.path.dirname(os.path.abspath(sys.argv[1]))
ONIZ = "--onizleme" in sys.argv; KURU = "--kuru" in sys.argv
DIL = J["dil"]; YATAY = J.get("format") == "yatay"
W0, H0 = (1920, 1080) if YATAY else (1080, 1920)
OL = 480 / min(W0, H0) if ONIZ else 1.0
W, H = int(W0 * OL) // 2 * 2, int(H0 * OL) // 2 * 2; S = min(W, H) / 1080; FPS = 25
FD = f"{KOK}/nazar/karma"
FONT = {"cinzel7": f"{FD}/cinzel-700.ttf", "cinzel9": f"{FD}/cinzel-900.ttf", "alfa": f"{FD}/alfa-400.ttf",
        "inter": "/usr/share/fonts/opentype/inter/Inter-Black.otf", "interb": "/usr/share/fonts/opentype/inter/Inter-ExtraBold.otf"}
CMAP = {k: set(TTFont(v).getBestCmap().keys()) for k, v in FONT.items()}
_FC = {}
def font(ad, px, metin=""):
    px = max(8, int(px))
    if ad != "inter" and any(ord(c) not in CMAP[ad] for c in metin): ad = "inter"
    if (ad, px) not in _FC: _FC[(ad, px)] = ImageFont.truetype(FONT[ad], px)
    return _FC[(ad, px)]
def ease(p): return 1 - (1 - p) ** 3
def eio(p): return p * p * (3 - 2 * p)
random.seed(7); np.random.seed(3)
def yol(p): return p if os.path.isabs(p) else os.path.join(JD, p)

M = J["metin"]; SES = [yol(p) for p in J["ses"]]; B = J["sahneler"]
assert len(M) == len(SES) == len(B), (len(M), len(SES), len(B))
def _sure(p): return float(subprocess.check_output(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", p]))
HIZ = float(J.get("ses_hiz", 1.0))
def sure(p): return _sure(p) / HIZ
D = [sure(p) for p in SES]; ARA = J.get("ara", 0.28 if not YATAY else 0.45); KUYRUK = 1.6
T = []; t = 0.0
for d in D: T.append((t, t + d)); t += d + ARA
TOPLAM = t - ARA + KUYRUK; N = int(TOPLAM * FPS)

def buyuk_harf(s): return (s.replace("i", "İ").replace("ı", "I") if DIL == "tr" else s).upper()
KEL = []
for i, s in enumerate(M):
    w = s.split(); n = 3 if not YATAY else 5; g = [w[k:k + n] for k in range(0, len(w), n)]
    if len(g) > 1 and len(g[-1]) == 1: g[-2] += g[-1]; g.pop()
    t0, t1 = T[i]; top = sum(len(x) + 1 for x in w); c = t0
    for gi, grp in enumerate(g):
        for wi, x in enumerate(grp):
            d = (t1 - t0) * (len(x) + 1) / top; KEL.append((c, c + d, wi, [buyuk_harf(y) for y in grp])); c += d

# ---------- görsel ----------
GOR = {}
def gorsel(p):
    if p not in GOR:
        im = Image.open(yol(p)).convert("RGB")
        mx = 2600 if not ONIZ else 1400
        if max(im.size) > mx: r = mx / max(im.size); im = im.resize((int(im.width * r), int(im.height * r)), Image.LANCZOS)
        # arka plan: kapla + bulanık + karartılmış
        r = max(W / im.width, H / im.height) * 1.15; bg = im.resize((int(im.width * r), int(im.height * r)), Image.BILINEAR)
        bg = bg.crop(((bg.width - W) // 2, (bg.height - H) // 2, (bg.width - W) // 2 + W, (bg.height - H) // 2 + H)).filter(ImageFilter.GaussianBlur(30 * S))
        bg = Image.fromarray((np.asarray(bg).astype(np.float32) * 0.42).astype(np.uint8))
        GOR[p] = (im, bg)
    return GOR[p]
def kutu(im, od):
    # odak kutusunu çıktı oranına genişlet (görselin dışına taşabilir)
    x0, y0, x1, y1 = od[0] * im.width, od[1] * im.height, od[2] * im.width, od[3] * im.height
    cx, cy, bw, bh = (x0 + x1) / 2, (y0 + y1) / 2, x1 - x0, y1 - y0
    if bw / bh > W / H: bh = bw * H / W
    else: bw = bh * W / H
    return cx, cy, bw, bh
def gorsel_kare(sc, p, tz, a):
    im, bg = gorsel(sc["img"])
    od1 = sc.get("odak", [0, 0, 1, 1]); od2 = sc.get("odak2")
    if od2 is None:  # hafif yakınlaşma
        cx, cy, bw, bh = kutu(im, od1); od2 = None
        k1 = kutu(im, od1); k2 = (cx + bw * 0.03, cy, bw * 0.88, bh * 0.88)
    else:
        k1 = kutu(im, od1); k2 = kutu(im, od2)
    e = eio(min(1, p * 1.05)); punch = 0.04 * math.exp(-max(0, tz - a) / 0.35)
    cx, cy, bw, bh = [k1[i] + (k2[i] - k1[i]) * e for i in range(4)]; bw *= 1 - punch; bh *= 1 - punch
    fr = bg.copy()
    # görselin kutu ile kesişimi → çıktıdaki yeri
    bx0, by0 = cx - bw / 2, cy - bh / 2; sx = W / bw
    ix0, iy0, ix1, iy1 = max(0, bx0), max(0, by0), min(im.width, bx0 + bw), min(im.height, by0 + bh)
    if ix1 > ix0 and iy1 > iy0:
        ox0, oy0 = (ix0 - bx0) * sx, (iy0 - by0) * sx; ow, oh = (ix1 - ix0) * sx, (iy1 - iy0) * sx
        parca = im.resize((max(1, round(ow)), max(1, round(oh))), Image.BILINEAR, box=(ix0, iy0, ix1, iy1))
        # görsel çerçevesi (gölge) — tam ekran değilse
        if ow < W - 2 or oh < H - 2:
            gl = Image.new("L", (W, H), 0); ImageDraw.Draw(gl).rectangle((ox0 - 3 * S, oy0 - 3 * S, ox0 + ow + 3 * S, oy0 + oh + 3 * S), fill=200)
            gl = gl.filter(ImageFilter.GaussianBlur(18 * S)); fr = Image.composite(Image.new("RGB", (W, H), (0, 0, 0)), fr, gl)
        fr.paste(parca, (round(ox0), round(oy0)))
    return fr

# ---------- harita ----------
HAR = None
def harita_taban():
    d = json.load(open(f"{FD}/geo/land-50m.json")); sc, tr = d["transform"]["scale"], d["transform"]["translate"]
    def arc(i):
        a = d["arcs"][i if i >= 0 else ~i]; x = y = 0; pts = []
        for dx, dy in a: x += dx; y += dy; pts.append((x * sc[0] + tr[0], y * sc[1] + tr[1]))
        return pts if i >= 0 else pts[::-1]
    MW, MH = 4320 * 2, 2160 * 2; k = 24
    im = Image.new("RGB", (MW, MH), (12, 24, 46)); dr = ImageDraw.Draw(im)
    for g in d["objects"]["land"]["geometries"]:
        polys = g["arcs"] if g["type"] == "MultiPolygon" else [g["arcs"]]
        for poly in polys:
            for ri, ring in enumerate(poly):
                pts = []
                for ai in ring: pts += arc(ai)
                pts = [((lo + 180) * k, (90 - la) * k) for lo, la in pts]
                if len(pts) > 2: dr.polygon(pts, fill=(54, 72, 96) if ri == 0 else (12, 24, 46), outline=(120, 146, 176))
    return im, k
def harita_kare(sc, tz, p, a):
    global HAR
    if HAR is None: HAR = harita_taban()
    im, k = HAR; h = sc["harita"]; z1 = h["zoom"] * S; z0 = z1 * h.get("bas_zoom", 0.55)
    z = z0 + (z1 - z0) * ease(min(1, p * 1.4)); clon, clat = h["merkez"]
    cw, ch = W / z, H / z
    x0 = (clon + 180) * k - cw * k / 2; y0 = (90 - clat) * k - ch * k / 2
    fr = im.crop((int(x0), int(y0), int(x0 + cw * k), int(y0 + ch * k))).resize((W, H), Image.BILINEAR)
    d = ImageDraw.Draw(fr, "RGBA")
    def pr(lon, lat): return ((lon + 180) * k - x0) * z / k, ((90 - lat) * k - y0) * z / k
    if h.get("yol"):
        pts = [pr(*q) for q in h["yol"]]; g = min(1, max(0, (tz - a - 0.6) / 1.8)); n = max(2, int(len(pts) * g))
        if g > 0: d.line(pts[:n], fill=(255, 200, 80, 230), width=max(2, int(6 * S)), joint="curve")
    for i, (lon, lat, et, yon, dy, buyuk) in enumerate(h.get("noktalar", [])):
        x, y = pr(lon, lat); g = min(1, max(0, (tz - a - 0.5 - i * 0.3) / 0.4))
        if g <= 0: continue
        R = (64 if buyuk else 44) * S
        for kk in range(3):
            r = 10 * S + ((tz * 0.9 + kk / 3 + i * 0.1) % 1) * R; al = int(160 * (1 - (r - 10 * S) / R) * g)
            d.ellipse((x - r, y - r, x + r, y + r), outline=(255, 200, 80, al), width=max(1, int(3 * S)))
        rr = (12 if buyuk else 8) * S
        d.ellipse((x - rr, y - rr, x + rr, y + rr), fill=(255, 210, 90, int(255 * g)), outline=(255, 255, 255, int(255 * g)), width=max(1, int(2 * S)))
        if not et: continue
        ft = font("interb", (42 if buyuk else 32) * S); tw = d.textlength(et, font=ft); yy0 = y + dy * S
        bx = x + 18 * S if yon > 0 else x - 18 * S - tw - 26 * S
        d.line((x, y, bx + (0 if yon > 0 else tw + 26 * S), yy0), fill=(255, 210, 90, int(160 * g)), width=max(1, int(2 * S)))
        d.rounded_rectangle((bx, yy0 - 27 * S, bx + tw + 26 * S, yy0 + 27 * S), 10 * S, fill=(0, 0, 0, int(190 * g)), outline=(255, 200, 80, int(120 * g)))
        d.text((bx + 13 * S, yy0 - 24 * S), et, font=ft, fill=(255, 235, 170, int(255 * g)))
    return fr

# ---------- katmanlar ----------
yy = np.arange(H)[:, None].astype(np.float32)
if YATAY: a_top = 120 * np.clip(1 - yy / (330 * S), 0, 1) ** 1.3; a_bot = 150 * np.clip((yy - (H - 330 * S)) / (330 * S), 0, 1) ** 1.3
else: a_top = 110 * np.clip(1 - yy / (640 * S), 0, 1) ** 1.3; a_bot = 140 * np.clip((yy - (H - 600 * S)) / (600 * S), 0, 1) ** 1.3
_g = np.zeros((H, W, 4), np.uint8); _g[..., 3] = np.clip(a_top + a_bot, 0, 255).astype(np.uint8); GOLGE = Image.fromarray(_g, "RGBA")
yv, xv = np.mgrid[0:H, 0:W]; VIN = (1 - 0.5 * np.clip(((xv - W / 2) / (W * 0.62)) ** 2 + ((yv - H / 2) / (H * 0.62)) ** 2, 0, 1) ** 1.6).astype(np.float32)[..., None]
xs = np.arange(256) / 255
LUT = (np.stack([np.clip((xs - .5) * 1.10 + .5 + .02 * xs, 0, 1), np.clip((xs - .5) * 1.08 + .5, 0, 1), np.clip((xs - .5) * 1.05 + .5 + .02 * (1 - xs), 0, 1)], 1) * 255).astype(np.uint8)
GR = [np.random.randint(-6, 7, (H // 2 + 1, W // 2 + 1, 1)).repeat(2, 0).repeat(2, 1)[:H, :W].astype(np.int16) for _ in range(6)]
def kompoze(fr, fi):
    arr = np.clip(np.asarray(fr).astype(np.float32) * VIN, 0, 255).astype(np.uint8)
    arr = np.stack([LUT[arr[..., 0], 0], LUT[arr[..., 1], 1], LUT[arr[..., 2], 2]], -1)
    return Image.fromarray(np.clip(arr.astype(np.int16) + GR[fi % 6], 0, 255).astype(np.uint8))
DUST = [(random.random(), random.random(), random.uniform(1.5, 3.5), random.uniform(0.004, 0.012), random.random() * 6.28) for _ in range(60)]
def toz(d, tz):
    for (x, y, r, hz, f) in DUST:
        px = (x + 0.03 * math.sin(tz * 0.6 + f)) % 1 * W; py = ((y - tz * hz) % 1) * H; al = int(80 + 60 * math.sin(tz * 2 + f)); r *= S
        d.ellipse((px - r, py - r, px + r, py + r), fill=(255, 240, 200, al))

def baslik(d, bas, tz, a):
    if not bas: return
    if YATAY: ys = 56 * S; boy = [(bas[0], "cinzel7", 34, (232, 196, 112)), (bas[1], "alfa", 78, (255, 255, 255)), (bas[2], "cinzel9", 56, (232, 196, 112))]
    else: ys = 140 * S; boy = [(bas[0], "cinzel7", 44, (232, 196, 112)), (bas[1], "alfa", 112, (255, 255, 255)), (bas[2], "cinzel9", 82, (232, 196, 112))]
    for j, (metin, fad, px, renk) in enumerate(boy):
        if not metin: continue
        px *= S; gec = ease(min(1, max(0, (tz - a - 0.18 * j) / 0.5))); ft = font(fad, px, metin)
        sinir = (W * 0.62) if YATAY else W - 80 * S
        while d.textlength(metin, font=ft) > sinir and px > 20: px -= 3; ft = font(fad, px, metin)
        tw = d.textlength(metin, font=ft); x = 70 * S if YATAY else (W - tw) / 2; y = ys + (1 - gec) * 40 * S
        d.text((x, y), metin, font=ft, fill=renk + (int(255 * gec),), stroke_width=max(1, int(5 * S)), stroke_fill=(0, 0, 0, int(235 * gec)))
        if j == 1:
            lw = tw * gec; lx = x if YATAY else (W - lw) / 2
            d.rectangle((lx, y + px + 8 * S, lx + lw, y + px + 12 * S), fill=(232, 196, 112, int(255 * gec)))
        ys += px + 20 * S

def altyazi(d, tz):
    for (t0, t1, wi, grp) in KEL:
        if t0 <= tz < t1:
            px = (68 if not YATAY else 50) * S; ft = font("inter", px); metin = " ".join(grp)
            while d.textlength(metin, font=ft) > W - 120 * S and px > 16: px -= 3; ft = font("inter", px)
            x = (W - d.textlength(metin, font=ft)) / 2; y = (1470 * S) if not YATAY else H - 190 * S
            for k, wd in enumerate(grp):
                d.text((x, y), wd, font=ft, fill=(255, 255, 255) if k == wi else (255, 214, 0), stroke_width=max(1, int(6 * S)), stroke_fill=(0, 0, 0))
                x += d.textlength(wd + " ", font=ft)
            break

KANAL = J["kanal"]; ALT = J["alt"]; KAP = J["kapanis"]
YUMUSAK = J.get("gecis") == "yumusak"; XF = 0.6
def kare(fi):
    tz = fi / FPS
    si = next((i for i, (a, b) in enumerate(T) if tz < b + ARA), len(T) - 1)
    sc = B[si]; a, b = T[si]; p = min(1, max(0, (tz - a) / (b - a + ARA)))
    fr = harita_kare(sc, tz, p, a) if "harita" in sc else gorsel_kare(sc, p, tz, a)
    if YUMUSAK and si + 1 < len(B):
        a3 = T[si + 1][0]
        if tz > a3 - XF:  # sonraki sahneye çapraz geçiş
            sc2 = B[si + 1]; b3 = T[si + 1][1]
            fr2 = harita_kare(sc2, a3, 0, a3) if "harita" in sc2 else gorsel_kare(sc2, 0, a3, a3 + 1)
            fr = Image.blend(fr, fr2, eio(min(1, (tz - (a3 - XF)) / XF)))
    fr = kompoze(fr, fi); fr = Image.alpha_composite(fr.convert("RGBA"), GOLGE); d = ImageDraw.Draw(fr, "RGBA")
    if "harita" not in sc: toz(d, tz)
    if si == len(B) - 1:
        g = ease(min(1, max(0, (tz - a - 1.0) / 0.5)))
        if g > 0:
            ft = font("inter", 46 * S); tw = d.textlength(KAP, font=ft); bx, by = (W - tw) / 2 - 36 * S, (1300 * S if not YATAY else H * 0.42)
            d.rounded_rectangle((bx, by, bx + tw + 72 * S, by + 92 * S), 22 * S, fill=(200, 30, 30, int(235 * g)), outline=(255, 255, 255, int(255 * g)), width=max(1, int(3 * S)))
            d.text(((W - tw) / 2, by + 20 * S), KAP, font=ft, fill=(255, 255, 255, int(255 * g)))
    baslik(d, sc.get("bas"), tz, a); altyazi(d, tz)
    ft = font("inter", 30 * S)
    if YATAY: d.text((W - d.textlength(KANAL, font=ft) - 60 * S, 50 * S), KANAL, font=ft, fill=(255, 255, 255, 220), stroke_width=max(1, int(3 * S)), stroke_fill=(0, 0, 0))
    else: d.text(((W - d.textlength(KANAL, font=ft)) / 2, H - 70 * S), KANAL, font=ft, fill=(255, 255, 255), stroke_width=max(1, int(3 * S)), stroke_fill=(0, 0, 0))
    ft = font("interb", 20 * S); kr = sc.get("kunye", "")
    satir = ALT + (" · " + kr if kr else "")
    while d.textlength(satir, font=ft) > W - 40 * S and ft.size > 9: ft = font("interb", ft.size - 1)
    d.text((W - d.textlength(satir, font=ft) - 22 * S, H - (112 if not YATAY else 40) * S), satir, font=ft, fill=(225, 225, 225), stroke_width=max(1, int(2 * S)), stroke_fill=(0, 0, 0))
    for k, (a3, _) in enumerate(T[1:], 1):
        if not YUMUSAK and abs(tz - a3) < 0.12: d.rectangle((0, 0, W, H), fill=(250, 240, 220, int(170 * (1 - abs(tz - a3) / 0.12))))
    if tz < 0.25: d.rectangle((0, 0, W, H), fill=(0, 0, 0, int(255 * (1 - tz / 0.25))))
    if tz > TOPLAM - 0.6: d.rectangle((0, 0, W, H), fill=(0, 0, 0, int(255 * min(1, (tz - (TOPLAM - 0.6)) / 0.6))))
    return fr.convert("RGB")

CIK = yol(J["cikti"]); os.makedirs(os.path.dirname(CIK), exist_ok=True)
if ONIZ: CIK = CIK.replace(".mp4", "_480p.mp4")
if KURU:
    print(json.dumps({"toplam": round(TOPLAM, 1)}))
    for n in range(len(B)): kare(int((T[n][0] + min(2.2, (T[n][1] - T[n][0]) * 0.7)) * FPS)).save(CIK.replace(".mp4", f"_k{n:02d}.jpg"), quality=80)
    sys.exit()
tmp = CIK + ".ses"; os.makedirs(tmp, exist_ok=True)
subprocess.run(["ffmpeg", "-y", "-v", "error", "-f", "lavfi", "-i", "anullsrc=r=44100:cl=mono", "-t", str(ARA), f"{tmp}/a.wav"], check=True)
subprocess.run(["ffmpeg", "-y", "-v", "error", "-f", "lavfi", "-i", "anullsrc=r=44100:cl=mono", "-t", str(KUYRUK), f"{tmp}/k.wav"], check=True)
with open(f"{tmp}/l.txt", "w") as f:
    for i, pth in enumerate(SES):
        w = f"{tmp}/p{i}.wav"; subprocess.run(["ffmpeg", "-y", "-v", "error", "-i", pth, *(["-filter:a", f"atempo={HIZ}"] if HIZ != 1.0 else []), "-ar", "44100", "-ac", "1", w], check=True)
        f.write(f"file '{w}'\n" + (f"file '{tmp}/a.wav'\n" if i < len(SES) - 1 else f"file '{tmp}/k.wav'\n"))
sesg = f"{tmp}/ses.wav"
subprocess.run(["ffmpeg", "-y", "-v", "error", "-f", "concat", "-safe", "0", "-i", f"{tmp}/l.txt", sesg], check=True)
muz = J.get("muzik")
if muz:  # müzik sesin altında (-20 dB civarı), sonda kısılır
    subprocess.run(["ffmpeg", "-y", "-v", "error", "-i", sesg, "-stream_loop", "-1", "-i", yol(muz), "-filter_complex",
                    f"[1:a]volume={J.get('muzik_seviye', 0.12)},afade=t=out:st={TOPLAM - 2.5}:d=2.5[m];[0:a][m]amix=inputs=2:duration=first:normalize=0[o]",
                    "-map", "[o]", f"{tmp}/karisik.wav"], check=True); sesg = f"{tmp}/karisik.wav"
subprocess.run(["ffmpeg", "-y", "-v", "error", "-i", sesg, "-af", "loudnorm=I=-16:TP=-1.5", "-ar", "44100", "-c:a", "aac", "-b:a", "160k", f"{tmp}/ses.m4a"], check=True)
ff = subprocess.Popen(["ffmpeg", "-y", "-v", "error", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-", "-i", f"{tmp}/ses.m4a",
                       "-c:v", "libx264", "-preset", "veryfast", "-crf", "20" if not ONIZ else "26", *([] if ONIZ else ["-maxrate", "2800k" if YATAY else "6000k", "-bufsize", "8000k"]), "-pix_fmt", "yuv420p", "-c:a", "copy", "-shortest", "-movflags", "+faststart", CIK], stdin=subprocess.PIPE)
for fi in range(N):
    try: ff.stdin.write(kare(fi).tobytes())
    except BrokenPipeError: break
    if fi % 500 == 0: print(f"{os.path.basename(CIK)} kare {fi}/{N}", flush=True)
try: ff.stdin.close()
except BrokenPipeError: pass
ff.wait(); print("bitti", CIK, os.path.getsize(CIK) // 1024, "KB", round(TOPLAM, 1), "sn")
