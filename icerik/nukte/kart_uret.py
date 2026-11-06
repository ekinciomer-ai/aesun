#!/usr/bin/env python3
"""Söz kartı basıcı (Celtic konsepti): YZ görsel + başlık (beyaz) + anahtar satır (sarı) + lacivert söz kutusu.
Kullanım: python3 kart_uret.py kartlar_hafta1.json <gorsel_klasoru> <cikti_klasoru>
Her kart için 4:5 (1080x1350) ve 9:16 (1080x1920) PNG üretir. Yazı tipi: Inter (OFL)."""
import json, sys, textwrap
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageFilter

F = "/usr/share/fonts/opentype/inter/"
def font(ad, b): return ImageFont.truetype(F + ad, b)
LACI = (14, 30, 66); SARI = (255, 205, 40); BEYAZ = (255, 255, 255)

def sar(d, metin, fnt, gen):
    satirlar = []
    for p in metin.split("\n"):
        kel, s = p.split(), ""
        for k in kel:
            t = (s + " " + k).strip()
            if d.textlength(t, font=fnt) <= gen: s = t
            else: satirlar.append(s); s = k
        satirlar.append(s)
    return satirlar

def golge_yaz(d, xy, metin, fnt, renk):
    x, y = xy
    d.text((x + 3, y + 3), metin, font=fnt, fill=(0, 0, 0, 170))
    d.text((x, y), metin, font=fnt, fill=renk)

def bas(k, gorsel, cikti, W, H):
    g = Image.open(gorsel).convert("RGB")
    o = max(W / g.width, H / g.height); g = g.resize((round(g.width * o), round(g.height * o)), Image.LANCZOS)
    x0, y0 = (g.width - W) // 2, (g.height - H) // 2; g = g.crop((x0, y0, x0 + W, y0 + H)).convert("RGBA")
    kat = Image.new("RGBA", (W, H), (0, 0, 0, 0)); d = ImageDraw.Draw(kat)
    # üstte okunurluk için yumuşak karartma
    for i in range(int(H * 0.30)):
        d.line([(0, i), (W, i)], fill=(0, 0, 0, int(150 * (1 - i / (H * 0.30)))))
    g = Image.alpha_composite(g, kat); d = ImageDraw.Draw(g)
    M = 64; gen = W - 2 * M
    # ilerleme çubuğu (Celtic imzası)
    d.rectangle([0, 0, int(W * 0.35), 10], fill=SARI)
    y = 70 if H < 1500 else 150
    for s in sar(d, k["baslik"], font("Inter-Black.otf", 64), gen):
        golge_yaz(d, (M, y), s, font("Inter-Black.otf", 64), BEYAZ); y += 76
    for s in sar(d, k["anahtar"], font("Inter-ExtraBold.otf", 46), gen):
        golge_yaz(d, (M, y + 6), s, font("Inter-ExtraBold.otf", 46), SARI); y += 58
    # söz kutusu
    fq = font("Inter-Bold.otf", 50 if len(k["soz"]) < 90 else 44); fa = font("Inter-SemiBold.otf", 30)
    qs = sar(d, k["soz"], fq, gen - 60); as_ = sar(d, k["alt"], fa, gen - 60)
    kh = 50 + len(qs) * (fq.size + 14) + 26 + len(as_) * 40 + 40
    alt_bosluk = 120 if H < 1500 else 260
    ky = H - alt_bosluk - kh
    kutu = Image.new("RGBA", (W, H), (0, 0, 0, 0)); kd = ImageDraw.Draw(kutu)
    kd.rounded_rectangle([M - 20, ky, W - M + 20, ky + kh], 26, fill=LACI + (228,))
    kd.rectangle([M - 20, ky + 26, M - 8, ky + kh - 26], fill=SARI)
    g = Image.alpha_composite(g, kutu); d = ImageDraw.Draw(g)
    yy = ky + 50
    for s in qs: d.text((M + 30, yy), s, font=fq, fill=BEYAZ); yy += fq.size + 14
    yy += 26
    for s in as_: d.text((M + 30, yy), s, font=fa, fill=SARI); yy += 40
    d.text((W - M, H - alt_bosluk + 40), k["kanal"], font=font("Inter-SemiBold.otf", 30), fill=BEYAZ, anchor="ra")
    g.convert("RGB").save(cikti, quality=95)

if __name__ == "__main__":
    kartlar = json.load(open(sys.argv[1], encoding="utf-8"))
    gk, ck = Path(sys.argv[2]), Path(sys.argv[3]); ck.mkdir(parents=True, exist_ok=True)
    for k in kartlar:
        gs = gk / f"{k['id']}.png"
        if not gs.exists(): print("görsel yok:", k["id"]); continue
        bas(k, gs, ck / f"{k['id']}_4x5.png", 1080, 1350)
        bas(k, gs, ck / f"{k['id']}_9x16.png", 1080, 1920)
        print("tamam:", k["id"])
