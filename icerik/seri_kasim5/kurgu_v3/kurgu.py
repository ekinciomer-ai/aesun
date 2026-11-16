import cv2, numpy as np, subprocess, json
from PIL import Image, ImageDraw, ImageFont, ImageFilter
W, H, FPS = 1080, 1920, 30; CW, CH, CY = 1080, 1224, 330
FD = "/home/claude/aesun/icerik/nazar/karma"
F_BAS = ImageFont.truetype("/usr/share/fonts/opentype/inter/Inter-Black.otf", 96); F_KUC = ImageFont.truetype("/usr/share/fonts/opentype/inter/Inter-ExtraBold.otf", 38)
F_ALT = ImageFont.truetype("/usr/share/fonts/opentype/inter/Inter-Black.otf", 54); F_MARKA = ImageFont.truetype("/usr/share/fonts/opentype/inter/Inter-ExtraBold.otf", 30)
F_NOT = ImageFont.truetype("/usr/share/fonts/opentype/inter/Inter-ExtraBold.otf", 19)
def kareler(yol, bas=0, son=None):
    c = cv2.VideoCapture(yol); fps = c.get(cv2.CAP_PROP_FPS) or 30; out = []
    while True:
        ok, f = c.read()
        if not ok: break
        t = len(out) / fps
        out.append(cv2.resize(f, (CW, CH), interpolation=cv2.INTER_AREA))
    n0 = int(bas * fps); n1 = int(son * fps) if son else len(out)
    out = out[n0:n1]
    # 30 fps'e yeniden örnekle
    k = len(out) / fps; m = int(k * FPS)
    return [out[min(len(out) - 1, int(i * fps / FPS))] for i in range(m)]
def resim(yol): return cv2.resize(cv2.imread(yol), (CW, CH), interpolation=cv2.INTER_AREA)
def zoom(img, n, z0=1.0, z1=1.06):
    r = []
    for i in range(n):
        z = z0 + (z1 - z0) * i / max(1, n - 1); w, h = int(CW / z), int(CH / z); x, y = (CW - w) // 2, (CH - h) // 3
        r.append(cv2.resize(img[y:y + h, x:x + w], (CW, CH)))
    return r
orij, eski, turk = resim("orij.jpg"), resim("eski.jpg"), resim("turk.jpg")
v1 = kareler("v1.mp4", 0, 4.3); v2 = kareler("v2.mp4")
# v1 sepetli tablodan üretildi; 1. adımda sepet henüz yok: sağ alt köşeyi sepetsiz kareden yumuşak maskeyle geri koy
_ara = resim("ara.png"); _m = np.zeros((CH, CW), np.float32); _m[int(0.66*CH):, int(0.70*CW):] = 1
_m = cv2.GaussianBlur(_m, (0, 0), 18)[..., None]
v1 = [(f * (1 - _m) + _ara * _m).astype(np.uint8) for f in v1]
fa, fs, ft = kareler("f_aski.mp4"), kareler("f_sepet.mp4"), kareler("f_turk.mp4")
S = [  # (kareler, ses, ses_baslangic, küçük, büyük, büyük2, altyazı)
 (zoom(orij, int(4.0 * FPS)), "s1.mp3", 0.2, "SÜTÇÜ KIZ", "SİLİNENİ", "GERİ ÇİZDİK", "Vermeer bu tablodan iki şey sildi. Biz geri çizdik!"),
 (fa + v1, "s2.mp3", 1.0, "1. ADIM", "TESTİ", "ASKISI", "Önce duvara testi askısını astık. Kız bile şaşırdı!"),
 (fs + zoom(eski, int(0.6 * FPS), 1.0, 1.01), "s3.mp3", 0.2, "2. ADIM", "SÖĞÜT", "SEPET", "Sonra yere söğüt sepetini koyduk."),
 (ft + zoom(turk, int(0.4 * FPS), 1.0, 1.01), "s4.mp3", 0.1, "3. ADIM", "BİZİM", "EVDE OLSA", "Madem başladık... bir de bizim evdeki gibi yapalım."),
 (v2, "s5.mp3", 2.6, "SÜT YERİNE", "DEMLİ", "ÇAY", "Süt yerine demli çay, ekmek yerine simit. Bak, kız da gülümsedi!"),
 (zoom(v2[-1], int(5.6 * FPS), 1.0, 1.08), "s6.mp3", 0.2, "SENCE?", "VERMEER", "MI BIZ MI?", "Sence hangisi daha güzel: Vermeer'inki mi, bizimki mi? Yorumlara yaz!"),
]
S[5] = S[5][:5] + ("Mİ BİZ Mİ?",) + S[5][6:]
def sar(d, metin, ft, gen):
    sat, cur = [], ""
    for w in metin.split():
        t = (cur + " " + w).strip()
        if d.textlength(t, font=ft) > gen and cur: sat.append(cur); cur = w
        else: cur = t
    sat.append(cur); return sat
dur = lambda p: float(subprocess.check_output(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", p]))
p = subprocess.Popen(["ffmpeg", "-y", "-loglevel", "error", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "18", "-preset", "veryfast", "goruntu.mp4"], stdin=subprocess.PIPE)
t0, sesler = 0.0, []
for si, (kar, ses, sb, kuc, b1, b2, alt) in enumerate(S):
    sd = dur(ses); sesler.append((ses, t0 + sb)); n = len(kar)
    for i, f in enumerate(kar):
        t = i / FPS
        rgb = Image.fromarray(cv2.cvtColor(f, cv2.COLOR_BGR2RGB))
        arka = rgb.resize((W, int(W * CH / CW))).resize((W, H)).filter(ImageFilter.GaussianBlur(40)).point(lambda v: int(v * 0.35))
        arka.paste(rgb, (0, CY)); d = ImageDraw.Draw(arka, "RGBA")
        g = min(1, t / 0.25)
        d.rectangle([0, CY, W, CY + 10], fill=(0, 0, 0, 90))
        # başlık
        def ort(y, s, ft, renk):
            tw = d.textlength(s, font=ft); d.text(((W - tw) / 2 + 3, y + 4), s, font=ft, fill=(0, 0, 0, int(200 * g))); d.text(((W - tw) / 2, y), s, font=ft, fill=renk + (int(255 * g),))
        ort(52, kuc, F_KUC, (255, 214, 120)); ort(100, b1, F_BAS, (255, 255, 255)); ort(205, b2, F_BAS, (255, 214, 120))
        # altyazı (ses sürerken)
        if sb - 0.05 <= t <= sb + sd + 0.25:
            sat = sar(d, alt, F_ALT, W - 120); y = CY + CH + 40
            for s_ in sat[:3]:
                tw = d.textlength(s_, font=F_ALT); x = (W - tw) / 2
                d.text((x, y), s_, font=F_ALT, fill=(255, 255, 255), stroke_width=6, stroke_fill=(0, 0, 0)); y += 66
        if si == 5 and t > 1.0:
            s_ = "YORUMLARA YAZ"; tw = d.textlength(s_, font=F_MARKA); bx = (W - tw) / 2
            d.rounded_rectangle([bx - 26, CY + CH - 110, bx + tw + 26, CY + CH - 50], 14, fill=(214, 40, 40, 235)); d.text((bx, CY + CH - 102), s_, font=F_MARKA, fill=(255, 255, 255))
        not_ = "Tablo kamu malı (Rijksmuseum) · Eklemeler ve hareket: yapay zekâ ile mizahi canlandırma"
        tw = d.textlength(not_, font=F_NOT); d.text(((W - tw) / 2, H - 112), not_, font=F_NOT, fill=(220, 220, 220, 200))
        tw = d.textlength("ANTİK STÜDYO", font=F_MARKA); d.text(((W - tw) / 2, H - 76), "ANTİK STÜDYO", font=F_MARKA, fill=(255, 255, 255, 230))
        p.stdin.write(arka.tobytes())
    t0 += n / FPS
p.stdin.close(); p.wait()
json.dump({"toplam": t0, "sesler": sesler}, open("zaman.json", "w"))
print("toplam", t0)
