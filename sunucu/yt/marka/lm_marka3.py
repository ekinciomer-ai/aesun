# LVL MAX sıralama temalı marka: C = kürsü (1-2-3 + taç), D = tier listesi (S→D satırları).
# Çıktı: lm_logo_C.png, lm_kapak_C.jpg, lm_logo_D.png, lm_kapak_D.jpg (logo 800x800, kapak 2560x1440, güvenli alan 1546x423)
import os
from PIL import Image, ImageDraw, ImageFilter, ImageFont

KOK = os.path.dirname(os.path.abspath(__file__))
F_BLK = "/usr/share/fonts/opentype/inter/Inter-BlackItalic.otf"
F_XB = "/usr/share/fonts/opentype/inter/Inter-ExtraBold.otf"
F_XBI = "/usr/share/fonts/opentype/inter/Inter-ExtraBoldItalic.otf"
ZEMIN = (12, 12, 22)
ALTIN, GUMUS, BRONZ = (255, 196, 30), (200, 208, 222), (214, 128, 64)
TIER = [("S", (255, 82, 82)), ("A", (255, 150, 60)), ("B", (255, 214, 60)), ("C", (120, 214, 90)), ("D", (80, 160, 255))]


def font(f, s): return ImageFont.truetype(f, s)


def ort(d, t, f, cx): return cx - d.textlength(t, font=f) / 2


def parla(im, m, renk, r, g):
    im.paste(Image.new("RGB", im.size, renk), (0, 0), m.filter(ImageFilter.GaussianBlur(r)).point(lambda v: int(v * g)))


def zemin(w, h):
    im = Image.new("RGB", (w, h), ZEMIN)
    v = Image.new("L", (w, h), 0); ImageDraw.Draw(v).ellipse([w * .15, h * .1, w * .85, h * .9], fill=255)
    im.paste(Image.new("RGB", (w, h), (38, 30, 70)), (0, 0), v.filter(ImageFilter.GaussianBlur(min(w, h) // 4)).point(lambda p: int(p * .7)))
    return im


def tac(d, cx, ust, gen, renk):
    h = gen * .62; a = ust + h
    d.polygon([(cx - gen / 2, a), (cx - gen / 2, ust + h * .25), (cx - gen / 4, ust + h * .55), (cx, ust), (cx + gen / 4, ust + h * .55),
               (cx + gen / 2, ust + h * .25), (cx + gen / 2, a)], fill=renk)
    for x in (cx - gen / 2, cx, cx + gen / 2):
        r = gen * .06; y = ust + (0 if x == cx else h * .25)
        d.ellipse([x - r, y - r, x + r, y + r], fill=renk)


def kursu(im, cx, taban, bw, hs, yazi):
    """hs: (ikinci, birinci, üçüncü) yükseklikleri"""
    d = ImageDraw.Draw(im)
    sira = [(2, GUMUS, hs[0], cx - bw), (1, ALTIN, hs[1], cx), (3, BRONZ, hs[2], cx + bw)]
    for no, renk, h, x in sira:
        koyu = tuple(int(c * .72) for c in renk)
        d.rectangle([x - bw / 2, taban - h, x + bw / 2, taban], fill=koyu)
        d.rectangle([x - bw / 2, taban - h, x + bw / 2, taban - h + h * .14], fill=renk)
        f = font(F_BLK, int(min(bw * .62, h * .62)))
        d.text((ort(d, str(no), f, x) - 4, taban - h + h * .2), str(no), font=f, fill=(255, 255, 255))
    tac(d, cx, taban - hs[1] - bw * .62 - bw * .12, bw * .8, ALTIN)


def logo_C():
    S = 800; im = zemin(S, S); d = ImageDraw.Draw(im)
    kursu(im, 400, 500, 165, (150, 225, 105), None)
    f = font(F_BLK, 118)
    m = Image.new("L", (S, S), 0); ImageDraw.Draw(m).text((ort(d, "LVL MAX", f, 400) - 6, 525), "LVL MAX", font=f, fill=255)
    parla(im, m, (255, 150, 30), 18, .6); im.paste(Image.new("RGB", (S, S), (255, 255, 255)), (0, 0), m)
    im.save(os.path.join(KOK, "lm_logo_C.png"))


def kapak_C():
    W, H = 2560, 1440; im = zemin(W, H); d = ImageDraw.Draw(im)
    kursu(im, 740, 915, 120, (120, 185, 85), None)
    f = font(F_BLK, 185)
    m = Image.new("L", (W, H), 0); ImageDraw.Draw(m).text((975, 590), "LVL MAX", font=f, fill=255)
    parla(im, m, (255, 150, 30), 26, .55); im.paste(Image.new("RGB", (W, H), (255, 255, 255)), (0, 0), m)
    d.text((990, 815), "RANKING EVERYTHING  #5 → #1", font=font(F_XBI, 54), fill=ALTIN)
    im.save(os.path.join(KOK, "lm_kapak_C.jpg"), quality=92)


def tier(im, x, y, w, sh, ara, ust_yazi=None):
    d = ImageDraw.Draw(im)
    for i, (harf, renk) in enumerate(TIER):
        yy = y + i * (sh + ara)
        d.rounded_rectangle([x, yy, x + sh * 1.15, yy + sh], radius=int(sh * .14), fill=renk)
        f = font(F_BLK, int(sh * .72))
        d.text((ort(d, harf, f, x + sh * .575) - 3, yy + sh * .06), harf, font=f, fill=(20, 20, 30))
        d.rounded_rectangle([x + sh * 1.15 + ara, yy, x + w, yy + sh], radius=int(sh * .14), fill=(30, 30, 48))
        if i == 0 and ust_yazi:
            fm = font(F_BLK, int(sh * .68))
            m = Image.new("L", im.size, 0); ImageDraw.Draw(m).text((x + sh * 1.15 + ara + sh * .25, yy + sh * .08), ust_yazi, font=fm, fill=255)
            parla(im, m, renk, int(sh * .2), .7); im.paste(Image.new("RGB", im.size, (255, 255, 255)), (0, 0), m)
        else:  # boş kart yerleri
            for k in range(3 if i else 0):
                kx = x + sh * 1.15 + ara + sh * .2 + k * sh * .95
                d.rounded_rectangle([kx, yy + sh * .15, kx + sh * .7, yy + sh * .85], radius=int(sh * .1), fill=(46, 46, 70))


def logo_D():
    S = 800; im = zemin(S, S)
    tier(im, 170, 176, 460, 80, 12, "MAX")
    im.save(os.path.join(KOK, "lm_logo_D.png"))


def kapak_D():
    W, H = 2560, 1440; im = zemin(W, H); d = ImageDraw.Draw(im)
    tier(im, 560, 528, 470, 70, 10, "MAX")
    f = font(F_BLK, 185)
    m = Image.new("L", (W, H), 0); ImageDraw.Draw(m).text((1110, 575), "LVL MAX", font=f, fill=255)
    parla(im, m, TIER[0][1], 26, .5); im.paste(Image.new("RGB", (W, H), (255, 255, 255)), (0, 0), m)
    d.text((1125, 800), "EVERYTHING RANKED  S → D", font=font(F_XBI, 54), fill=TIER[2][1])
    im.save(os.path.join(KOK, "lm_kapak_D.jpg"), quality=92)


if __name__ == "__main__":
    logo_C(); kapak_C(); logo_D(); kapak_D()
