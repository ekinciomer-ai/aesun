# LVL MAX marka alternatifleri: A = oyun rütbe rozeti (altıgen, altın), B = neon XP çubuğu.
# Çıktı: lm_logo_A.png, lm_kapak_A.jpg, lm_logo_B.png, lm_kapak_B.jpg  (logo 800x800, kapak 2560x1440, güvenli alan 1546x423)
import math, os
from PIL import Image, ImageDraw, ImageFilter, ImageFont

KOK = os.path.dirname(os.path.abspath(__file__))
F_BLK = "/usr/share/fonts/opentype/inter/Inter-BlackItalic.otf"
F_XB = "/usr/share/fonts/opentype/inter/Inter-ExtraBold.otf"
F_XBI = "/usr/share/fonts/opentype/inter/Inter-ExtraBoldItalic.otf"


def dikey_grad(w, h, ust, alt):
    g = Image.new("RGB", (1, h))
    for y in range(h):
        t = y / max(h - 1, 1)
        g.putpixel((0, y), tuple(int(ust[k] + (alt[k] - ust[k]) * t) for k in range(3)))
    return g.resize((w, h))


def maskeli(tuval, maske, renk_img, xy=(0, 0)):
    k = Image.new("RGB", tuval.size); k.paste(renk_img, xy)
    tuval.paste(k, (0, 0), maske)


def parla(tuval, maske, renk, yaricap, guc):
    tuval.paste(Image.new("RGB", tuval.size, renk), (0, 0), maske.filter(ImageFilter.GaussianBlur(yaricap)).point(lambda v: int(v * guc)))


def altigen(cx, cy, r):
    return [(cx + r * math.cos(math.radians(60 * i - 90)), cy + r * math.sin(math.radians(60 * i - 90))) for i in range(6)]


def ortala(d, metin, font, cx):
    return cx - d.textlength(metin, font=font) / 2


# ---------- A: rütbe rozeti ----------
ALTIN_U, ALTIN_A = (255, 236, 150), (214, 140, 20)
MOR = (28, 12, 52)


def rozet(S, cx, cy, r):
    im = Image.new("RGBA", (S[0], S[1]), (0, 0, 0, 0))
    m = Image.new("L", S, 0); ImageDraw.Draw(m).polygon(altigen(cx, cy, r), fill=255)
    ic = Image.new("L", S, 0); ImageDraw.Draw(ic).polygon(altigen(cx, cy, r * 0.86), fill=255)
    halka = Image.eval(m, lambda v: v); halka.paste(0, (0, 0), ic)
    tuval = Image.new("RGB", S, (0, 0, 0))
    gb = dikey_grad(int(2 * r), int(2 * r), ALTIN_U, ALTIN_A)
    maskeli(tuval, halka, gb, (int(cx - r), int(cy - r)))
    maskeli(tuval, ic, dikey_grad(int(2 * r), int(2 * r), (70, 30, 120), MOR), (int(cx - r), int(cy - r)))
    return tuval, m


def logo_A():
    S = 800
    im = Image.new("RGB", (S, S), (14, 6, 26))
    t, m = rozet((S, S), 400, 400, 340)
    g = Image.new("L", (S, S), 0); ImageDraw.Draw(g).polygon(altigen(400, 400, 340), fill=255)
    parla(im, g, (255, 170, 40), 30, 0.6)
    im.paste(t, (0, 0), m)
    d = ImageDraw.Draw(im)
    # yıldız
    ys = [(400 + (70 if i % 2 == 0 else 30) * math.cos(math.radians(-90 + 36 * i)), 160 + (70 if i % 2 == 0 else 30) * math.sin(math.radians(-90 + 36 * i))) for i in range(10)]
    d.polygon(ys, fill=ALTIN_U)
    f1 = ImageFont.truetype(F_XB, 96); f2 = ImageFont.truetype(F_BLK, 165)
    d.text((ortala(d, "LVL", f1, 400), 240), "LVL", font=f1, fill=(240, 230, 255))
    mm = Image.new("L", (S, S), 0); ImageDraw.Draw(mm).text((ortala(d, "MAX", f2, 400) - 6, 360), "MAX", font=f2, fill=255)
    bb = mm.getbbox(); maskeli(im, mm, dikey_grad(bb[2] - bb[0], bb[3] - bb[1], ALTIN_U, ALTIN_A), bb[:2])
    im.save(os.path.join(KOK, "lm_logo_A.png"))


def kapak_A():
    W, H = 2560, 1440
    im = dikey_grad(W, H, (34, 14, 62), (10, 4, 20))
    d = ImageDraw.Draw(im)
    for i in range(0, W, 120):  # ışın
        d.line([(W / 2, H / 2), (i, 0)], fill=(44, 20, 78), width=6)
        d.line([(W / 2, H / 2), (i, H)], fill=(44, 20, 78), width=6)
    S = (W, H)
    t, m = rozet(S, 760, 720, 200)
    g = Image.new("L", S, 0); ImageDraw.Draw(g).polygon(altigen(760, 720, 200), fill=255)
    parla(im, g, (255, 170, 40), 40, 0.6)
    im.paste(t, (0, 0), m)
    f0 = ImageFont.truetype(F_BLK, 100)
    mm = Image.new("L", S, 0); ImageDraw.Draw(mm).text((ortala(d, "MAX", f0, 760) - 4, 662), "MAX", font=f0, fill=255)
    bb = mm.getbbox(); maskeli(im, mm, dikey_grad(bb[2] - bb[0], bb[3] - bb[1], ALTIN_U, ALTIN_A), bb[:2])
    f1 = ImageFont.truetype(F_BLK, 210); f2 = ImageFont.truetype(F_XBI, 66)
    d.text((1010, 560), "LVL MAX", font=f1, fill=(245, 240, 255))
    d.text((1020, 820), "LVL 1  →  LVL MAX", font=f2, fill=ALTIN_U)
    im.save(os.path.join(KOK, "lm_kapak_A.jpg"), quality=92)


# ---------- B: neon XP çubuğu ----------
CYAN, PEMBE = (0, 240, 255), (255, 46, 160)


def neon_yazi(im, metin, font, xy, renk):
    m = Image.new("L", im.size, 0); ImageDraw.Draw(m).text(xy, metin, font=font, fill=255)
    parla(im, m, renk, 26, 0.9); parla(im, m, renk, 8, 1.0)
    im.paste(Image.new("RGB", im.size, (255, 255, 255)), (0, 0), m)
    return m.getbbox()


def xp_cubuk(im, x, y, w, h):
    d = ImageDraw.Draw(im)
    d.rounded_rectangle([x, y, x + w, y + h], radius=h // 2, outline=(90, 90, 120), width=max(3, h // 10), fill=(18, 18, 30))
    p = int(h * 0.18)
    g = Image.new("RGB", (w - 2 * p, h - 2 * p))
    for i in range(g.width):
        t = i / g.width
        g.paste(tuple(int(CYAN[k] + (PEMBE[k] - CYAN[k]) * t) for k in range(3)), (i, 0, i + 1, g.height))
    m = Image.new("L", g.size, 0); ImageDraw.Draw(m).rounded_rectangle([0, 0, g.width - 1, g.height - 1], radius=g.height // 2, fill=255)
    gm = Image.new("L", im.size, 0); gm.paste(m, (x + p, y + p))
    parla(im, gm, PEMBE, 18, 0.7)
    im.paste(g, (x + p, y + p), m)


def logo_B():
    S = 800
    im = Image.new("RGB", (S, S), (6, 6, 14))
    f1 = ImageFont.truetype(F_XBI, 150); f2 = ImageFont.truetype(F_BLK, 250)
    d = ImageDraw.Draw(im)
    neon_yazi(im, "LVL", f1, (ortala(d, "LVL", f1, 400), 120), CYAN)
    neon_yazi(im, "MAX", f2, (ortala(d, "MAX", f2, 400) - 10, 280), PEMBE)
    xp_cubuk(im, 170, 600, 460, 70)
    im.save(os.path.join(KOK, "lm_logo_B.png"))


def kapak_B():
    W, H = 2560, 1440
    im = Image.new("RGB", (W, H), (6, 6, 14))
    d = ImageDraw.Draw(im)
    for x in range(0, W, 80): d.line([(x, 0), (x, H)], fill=(14, 14, 28), width=2)
    for y in range(0, H, 80): d.line([(0, y), (W, y)], fill=(14, 14, 28), width=2)
    f1 = ImageFont.truetype(F_XBI, 230); f2 = ImageFont.truetype(F_BLK, 230)
    wl = d.textlength("LVL ", font=f1); wm = d.textlength("MAX", font=f2); x = (W - wl - wm) / 2
    neon_yazi(im, "LVL", f1, (x, 520), CYAN)
    neon_yazi(im, "MAX", f2, (x + wl, 520), PEMBE)
    xp_cubuk(im, 830, 830, 900, 60)
    f3 = ImageFont.truetype(F_XB, 40)
    d.text((1745, 838), "100%", font=f3, fill=(255, 255, 255))
    im.save(os.path.join(KOK, "lm_kapak_B.jpg"), quality=92)


if __name__ == "__main__":
    logo_A(); kapak_A(); logo_B(); kapak_B()
