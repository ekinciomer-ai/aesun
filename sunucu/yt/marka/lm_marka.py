# LVL MAX marka görselleri: lm_logo.png (800x800) + lm_kapak.jpg (2560x1440, güvenli alan 1546x423 ortada)
# Dil yok, rozet + seviye çubuğu: her ülkede aynı okunur. Yalnız ücretsiz yazı tipleri (Inter, OFL).
import os
from PIL import Image, ImageDraw, ImageFilter, ImageFont

KOK = os.path.dirname(os.path.abspath(__file__))
F_BLK = "/usr/share/fonts/opentype/inter/Inter-BlackItalic.otf"
F_XB = "/usr/share/fonts/opentype/inter/Inter-ExtraBoldItalic.otf"
ZEMIN = (11, 11, 20)
SEVIYE = [(46, 204, 113), (241, 196, 15), (243, 156, 18), (231, 76, 60), (255, 200, 40)]  # LVL1 yeşil → MAX altın


def gradyan(w, h, renkler):
    g = Image.new("RGB", (w, 1))
    n = len(renkler) - 1
    for x in range(w):
        t = x / max(w - 1, 1) * n; i = min(int(t), n - 1); f = t - i
        a, b = renkler[i], renkler[i + 1]
        g.putpixel((x, 0), tuple(int(a[k] + (b[k] - a[k]) * f) for k in range(3)))
    return g.resize((w, h))


def yazi_gradyan(tuval, metin, font, xy, renkler, golge=True, parlama=None):
    m = Image.new("L", tuval.size, 0)
    ImageDraw.Draw(m).text(xy, metin, font=font, fill=255)
    if parlama:
        p = Image.new("RGB", tuval.size, parlama)
        tuval.paste(p, (0, 0), m.filter(ImageFilter.GaussianBlur(28)).point(lambda v: int(v * 0.55)))
    if golge:
        s = Image.new("RGB", tuval.size, (0, 0, 0))
        tuval.paste(s, (0, 0), m.filter(ImageFilter.GaussianBlur(6)).transform(tuval.size, Image.AFFINE, (1, 0, -8, 0, 1, -10)))
    bb = m.getbbox()
    g = gradyan(bb[2] - bb[0], bb[3] - bb[1], renkler)
    katman = Image.new("RGB", tuval.size); katman.paste(g, bb[:2])
    tuval.paste(katman, (0, 0), m)
    return bb


def cubuk(d, x, y, w, h, ara, egim=14):
    sw = (w - ara * 4) / 5
    for i, r in enumerate(SEVIYE):
        x0 = x + i * (sw + ara)
        hh = h * (0.45 + 0.55 * (i / 4))  # seviye büyüdükçe çubuk uzar
        d.polygon([(x0 + egim, y + h - hh), (x0 + sw + egim, y + h - hh), (x0 + sw, y + h), (x0, y + h)], fill=r)


def zemin(w, h):
    im = Image.new("RGB", (w, h), ZEMIN)
    d = ImageDraw.Draw(im)
    for i in range(-h, w, 90):  # hafif çapraz hız çizgileri
        d.line([(i, h), (i + h * 0.6, 0)], fill=(20, 20, 34), width=28)
    v = Image.new("L", (w, h), 0)
    ImageDraw.Draw(v).ellipse([w * 0.1, h * 0.05, w * 0.9, h * 0.95], fill=255)
    parl = Image.new("RGB", (w, h), (40, 24, 60))
    im.paste(parl, (0, 0), v.filter(ImageFilter.GaussianBlur(min(w, h) // 4)).point(lambda p: int(p * 0.7)))
    return im


def logo():
    S = 800
    im = zemin(S, S)
    d = ImageDraw.Draw(im)
    f1 = ImageFont.truetype(F_XB, 150)
    f2 = ImageFont.truetype(F_BLK, 270)
    w1 = d.textlength("LVL", font=f1)
    yazi_gradyan(im, "LVL", f1, ((S - w1) / 2 - 10, 120), [(240, 240, 255), (200, 200, 230)])
    w2 = d.textlength("MAX", font=f2)
    yazi_gradyan(im, "MAX", f2, ((S - w2) / 2 - 14, 250), [SEVIYE[3], SEVIYE[2], SEVIYE[4]], parlama=(255, 120, 30))
    cubuk(d, 205, 585, 390, 85, 14)
    im.save(os.path.join(KOK, "lm_logo.png"))


def kapak():
    W, H = 2560, 1440
    im = zemin(W, H)
    d = ImageDraw.Draw(im)
    f = ImageFont.truetype(F_BLK, 225)
    fl = ImageFont.truetype(F_XB, 225)
    wl = d.textlength("LVL ", font=fl); wm = d.textlength("MAX", font=f)
    cw, ara = 210, 50
    x = (W - (wl + wm + ara + cw)) / 2
    y = 560
    yazi_gradyan(im, "LVL", fl, (x, y), [(240, 240, 255), (200, 200, 230)])
    yazi_gradyan(im, "MAX", f, (x + wl, y), [SEVIYE[3], SEVIYE[2], SEVIYE[4]], parlama=(255, 120, 30))
    cubuk(d, x + wl + wm + ara, 610, cw, 185, 12, egim=16)
    ft = ImageFont.truetype(F_XB, 56)
    t = "LVL 1  →  LVL MAX"
    tw = d.textlength(t, font=ft)
    d.text(((W - tw) / 2, 850), t, font=ft, fill=(235, 235, 245))
    im.save(os.path.join(KOK, "lm_kapak.jpg"), quality=92)


if __name__ == "__main__":
    logo(); kapak()
