"""Tablo Short kurgu motoru v2: tablo kırpımları (Ken Burns) + canlı klipler + özel efektler, 1080x1920, üst başlık + altyazı.
python3 kurgu2.py plan.json  → plan: {"cikti":..., "not":..., "muzik":..., "sahneler":[{tip, ses, ses_bas, kucuk, b1, b2, alt, ...}]}"""
import cv2, numpy as np, subprocess, json, sys, math
from PIL import Image, ImageDraw, ImageFont, ImageFilter
W, H, FPS = 1080, 1920, 30; CW, CH, CY = 1080, 1224, 330
FI = "/usr/share/fonts/opentype/inter/"
F_BAS = ImageFont.truetype(FI + "Inter-Black.otf", 96); F_KUC = ImageFont.truetype(FI + "Inter-ExtraBold.otf", 38)
F_ALT = ImageFont.truetype(FI + "Inter-Black.otf", 52); F_MARKA = ImageFont.truetype(FI + "Inter-ExtraBold.otf", 30)
F_NOT = ImageFont.truetype(FI + "Inter-ExtraBold.otf", 19); F_ALT2 = ImageFont.truetype(FI + "Inter-Black.otf", 42)
P = json.load(open(sys.argv[1], encoding="utf-8"))
_IMG = {}
def img(y):
    if y not in _IMG: _IMG[y] = cv2.imread(y)
    return _IMG[y]
def kutu(im, b):
    """b: normalize kutu; pencere oranına genişlet, taşarsa bulanık dolgu ile sığdır."""
    h, w = im.shape[:2]; x0, y0, x1, y1 = b[0]*w, b[1]*h, b[2]*w, b[3]*h
    cx, cy, bw, bh = (x0+x1)/2, (y0+y1)/2, x1-x0, y1-y0; r = CW/CH
    if bw/bh > r: bh = bw/r
    else: bw = bh*r
    X0, Y0 = int(cx-bw/2), int(cy-bh/2); X1, Y1 = int(cx+bw/2), int(cy+bh/2)
    pad = max(0, -X0, -Y0, X1-w, Y1-h)
    if pad:
        big = cv2.resize(cv2.GaussianBlur(cv2.resize(im, (w//8, h//8)), (0, 0), 6), (w+2*pad, h+2*pad)); big = (big*0.45).astype(np.uint8)
        big[pad:pad+h, pad:pad+w] = im; im = big; X0 += pad; X1 += pad; Y0 += pad; Y1 += pad
    return cv2.resize(im[Y0:Y1, X0:X1], (CW, CH), interpolation=cv2.INTER_AREA)
def ease(t): return 0.5 - 0.5*math.cos(math.pi*min(1, max(0, t)))
def resim_kareleri(s, n):
    im = img(s["img"]); a, b = s["odak"], s.get("odak2", s["odak"])
    return [kutu(im, [a[k]+(b[k]-a[k])*ease(i/max(1, n-1)) for k in range(4)]) for i in range(n)]
def klip_kareleri(s):
    c = cv2.VideoCapture(s["yol"]); fps = c.get(cv2.CAP_PROP_FPS) or 30; fr = []
    while True:
        ok, f = c.read()
        if not ok: break
        fr.append(f)
    fr = fr[int(s.get("bas", 0)*fps): int(s["son"]*fps) if s.get("son") else len(fr)]
    m = int(len(fr)/fps*FPS); b = s.get("odak", [0, 0, 1, 1])
    return [kutu(fr[min(len(fr)-1, int(i*fps/FPS))], b) for i in range(m)]
def kafatasi_kareleri(s, n):
    """Anamorfoz: kafatası ekseni boyunca sıkıştırarak yandan bakış etkisi (Holbein)."""
    im = img(s["img"]); h, w = im.shape[:2]; cx, cy = s["merkez"][0]*w, s["merkez"][1]*h; ang = s["aci"]
    out = []
    for i in range(n):
        t = ease(min(1, i/(n*0.6))); k = 1 + (s["sikistir"]-1)*t
        R = cv2.getRotationMatrix2D((cx, cy), ang, 1.0); R3 = np.vstack([R, [0, 0, 1]])
        Sx = np.array([[k, 0, cx*(1-k)], [0, 1, 0], [0, 0, 1]])
        Ri = np.linalg.inv(R3); M = (Ri @ Sx @ R3)[:2]
        warped = cv2.warpAffine(im, M, (w, h), borderMode=cv2.BORDER_REFLECT)
        z = s["kutu"]; b2 = s.get("kutu2", z); bb = [z[j]+(b2[j]-z[j])*t for j in range(4)]
        out.append(kutu(warped, bb))
    return out
def sar(d, metin, ft, gen):
    sat, cur = [], ""
    for wd in metin.split():
        t = (cur+" "+wd).strip()
        if d.textlength(t, font=ft) > gen and cur: sat.append(cur); cur = wd
        else: cur = t
    sat.append(cur); return sat
dur = lambda p: float(subprocess.check_output(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", p]))
vid = P["cikti"][:-4] + "_goruntu.mp4"
pp = subprocess.Popen(["ffmpeg", "-y", "-loglevel", "error", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "18", "-preset", "veryfast", vid], stdin=subprocess.PIPE)
t0, sesler = 0.0, []
for si, s in enumerate(P["sahneler"]):
    sd = dur(s["ses"]); sb = s.get("ses_bas", 0.15); hedef = max(s.get("min", 0), sb+sd+s.get("kuyruk", 0.35)); n = int(hedef*FPS)
    parcalar = []
    for g in s["gorsel"]:
        if g["tip"] == "klip": parcalar += klip_kareleri(g)
        elif g["tip"] == "kafatasi": parcalar += kafatasi_kareleri(g, int(g["sure"]*FPS))
        else: parcalar += resim_kareleri(g, int(g.get("sure", 0)*FPS) or max(1, n-len(parcalar)))
    if len(parcalar) < n: parcalar += [parcalar[-1]]*(n-len(parcalar))
    kar = parcalar; n = len(kar); sesler.append((s["ses"], t0+sb))
    for i, f in enumerate(kar):
        t = i/FPS; rgb = Image.fromarray(cv2.cvtColor(f, cv2.COLOR_BGR2RGB))
        arka = rgb.resize((W, H)).filter(ImageFilter.GaussianBlur(40)).point(lambda v: int(v*0.32)); arka.paste(rgb, (0, CY))
        d = ImageDraw.Draw(arka, "RGBA"); g_ = min(1, t/0.25)
        def ort(y, txt, ft, renk):
            tw = d.textlength(txt, font=ft); d.text(((W-tw)/2+3, y+4), txt, font=ft, fill=(0, 0, 0, int(200*g_))); d.text(((W-tw)/2, y), txt, font=ft, fill=renk+(int(255*g_),))
        ort(52, s["kucuk"], F_KUC, (255, 214, 120)); ort(100, s["b1"], F_BAS, (255, 255, 255)); ort(205, s["b2"], F_BAS, (255, 214, 120))
        if sb-0.05 <= t <= sb+sd+0.25:
            fa, ara = F_ALT, 62; sl = sar(d, s["alt"], fa, W-110)
            if len(sl) > 3: fa, ara = F_ALT2, 52; sl = sar(d, s["alt"], fa, W-90)
            y = CY+CH+30
            for sat in sl[:4]:
                tw = d.textlength(sat, font=fa); d.text(((W-tw)/2, y), sat, font=fa, fill=(255, 255, 255), stroke_width=5, stroke_fill=(0, 0, 0)); y += ara
        if s.get("yorum") and t > 1.0:
            txt = "YORUMLARA YAZ"; tw = d.textlength(txt, font=F_MARKA); bx = (W-tw)/2
            d.rounded_rectangle([bx-26, CY+CH-110, bx+tw+26, CY+CH-50], 14, fill=(214, 40, 40, 235)); d.text((bx, CY+CH-102), txt, font=F_MARKA, fill=(255, 255, 255))
        tw = d.textlength(P["not"], font=F_NOT); d.text(((W-tw)/2, H-112), P["not"], font=F_NOT, fill=(220, 220, 220, 200))
        tw = d.textlength("ANTİK STÜDYO", font=F_MARKA); d.text(((W-tw)/2, H-76), "ANTİK STÜDYO", font=F_MARKA, fill=(255, 255, 255, 230))
        pp.stdin.write(arka.tobytes())
    t0 += n/FPS
pp.stdin.close(); pp.wait()
T = t0; inp, fl = [], []
for i, (sy, t) in enumerate(sesler):
    inp += ["-i", sy]; fl.append(f"[{i}:a]adelay={int(t*1000)}|{int(t*1000)},apad[a{i}]")
k = len(sesler); inp += ["-i", P["muzik"]]
fl.append(f"[{k}:a]volume={P.get('muzik_seviye', 0.10)},afade=t=out:st={T-1.5}:d=1.5[m]")
fl.append("".join(f"[a{i}]" for i in range(k))+f"[m]amix=inputs={k+1}:normalize=0,atrim=0:{T},loudnorm=I=-14:TP=-1.5[out]")
ses = P["cikti"][:-4]+"_ses.wav"
subprocess.run(["ffmpeg", "-y", "-loglevel", "error", *inp, "-filter_complex", ";".join(fl), "-map", "[out]", "-ar", "48000", ses], check=True)
subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", vid, "-i", ses, "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-shortest", P["cikti"]], check=True)
subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", P["cikti"], "-vf", "scale=480:-2", "-c:v", "libx264", "-crf", "28", "-preset", "veryfast", "-c:a", "aac", "-b:a", "96k", P["cikti"][:-4]+"_480p.mp4"], check=True)
print("tamam", P["cikti"], round(T, 1), "sn")
