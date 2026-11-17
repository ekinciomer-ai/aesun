"""Gezegen dokularını kodla üretir (telifsiz): Dünya (gerçek kara maskesi, global-land-mask/GLOBE), bulut, Jüpiter.
Kullanım: python3 doku_uret.py <cikti_klasoru>"""
import sys, numpy as np
from PIL import Image, ImageFilter
from global_land_mask import globe
out = sys.argv[1]; W, H = 2048, 1024
rng = np.random.default_rng(7)
def fbm(w, h, oct=6, base=4, seed=0):
    r = np.random.default_rng(seed); acc = np.zeros((h, w)); amp = 1; tot = 0
    for o in range(oct):
        n = base * 2 ** o; g = r.random((n // 2 + 2, n + 2))
        im = Image.fromarray((g * 255).astype(np.uint8)).resize((w, h), Image.BICUBIC)
        acc += amp * np.asarray(im, float) / 255; tot += amp; amp *= .5
    return acc / tot
lat = np.linspace(90, -90, H); lon = np.linspace(-180, 180, W)
LO, LA = np.meshgrid(lon, lat)
land = globe.is_land(LA, LO).astype(float)
landb = np.asarray(Image.fromarray((land * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(3)), float) / 255
n1 = fbm(W, H, 7, 4, 1); n2 = fbm(W, H, 6, 8, 2)
al = np.abs(LA)
# kara renkleri: enleme göre (çöl kuşağı, orman, tundra, buz)
orman = np.array([38, 74, 34]); cayir = np.array([92, 112, 52]); col = np.array([178, 148, 98]); tundra = np.array([120, 112, 92]); buz = np.array([236, 240, 246])
def mix(a, b, t): return a * (1 - t[..., None]) + b * t[..., None]
cl = lambda x: np.clip(x, 0, 1)
desert = cl(1 - np.abs(al - 23) / 11) * cl((n1 - .22) * 3)
sahra = cl(1 - np.abs(LA - 23) / 10) * ((LO > -17) & (LO < 58)) + cl(1 - np.abs(LA + 25) / 8) * ((LO > 118) & (LO < 145))
desert = cl(desert + sahra * 1.2)
k = mix(orman, cayir, cl(n2 * 1.4 - .2)); k = mix(k, col, cl(desert * 1.3))
k = mix(k, tundra, cl((al - 55) / 12)); k = mix(k, buz, cl((al - 68) / 6) + cl((LA + 62) / -4))
k *= (0.82 + 0.35 * n1)[..., None]
# okyanus: derin lacivert, kıyıda turkuaz
sig = cl(landb * 2.2) * (1 - land)
o = mix(np.array([6, 20, 52]), np.array([10, 44, 92]), cl(n2)); o = mix(o, np.array([30, 110, 140]), sig * .8)
o = mix(o, buz, cl((al - 76) / 5) * .9)
img = mix(o, k, land)
Image.fromarray(np.clip(img, 0, 255).astype(np.uint8)).save(f"{out}/dunya.jpg", quality=92)
Image.fromarray((np.clip(1 - land, 0, 1) * 255).astype(np.uint8)).save(f"{out}/dunya_parlak.png")
# bulut
b = np.asarray(Image.fromarray((fbm(W, H // 3, 8, 8, 5) * 255).astype(np.uint8)).resize((W, H), Image.BICUBIC), float) / 255
b2 = fbm(W, H, 7, 16, 9); b3 = fbm(W, H, 6, 32, 21)
bulut = cl((b * .55 + b2 * .35 + b3 * .25 - .6) * 3.0) ** 1.4 * (0.45 + 0.55 * cl(1 - np.abs(np.abs(LA) - 52) / 30) + .35 * cl(1 - np.abs(LA) / 12))
Image.fromarray((bulut * 255).astype(np.uint8)).save(f"{out}/bulut.png")
# Jüpiter: kuşaklar + türbülans + Büyük Kırmızı Leke
y = (LA / 90.0)
warp = (fbm(W, H, 6, 6, 11) - .5) * .08
bandv = np.sin((y + warp) * np.pi * 6.2) * .5 + .5
bandv2 = np.sin((y + warp * 1.6) * np.pi * 17) * .5 + .5
c1 = np.array([226, 206, 176]); c2 = np.array([170, 120, 84]); c3 = np.array([240, 232, 214])
j = mix(c2, c1, cl(bandv * 1.35 - .1)); j = mix(j, c3, cl(bandv2 - .55) * .7)
j *= (0.9 + 0.2 * fbm(W, H, 6, 16, 13))[..., None]
cx, cy = 1350, int((90 + 22) / 180 * H); rx, ry = 120, 62
d = ((LO * W / 360 + W / 2 - cx) / rx) ** 2 + ((np.arange(H)[:, None] - cy) / ry) ** 2
j = mix(j, np.array([196, 98, 66]), cl(1.2 - d) * .9)
j = mix(j, np.array([150, 92, 70]), cl(1 - d * .55) * cl(d - .9) * .5)
Image.fromarray(np.clip(j, 0, 255).astype(np.uint8)).save(f"{out}/jupiter.jpg", quality=92)
print("dokular hazır")
# donmuş Dünya: kıtalar beyaz-mavi, okyanus soluk buz, çatlak dokusu
cat = cl((np.abs(fbm(W, H, 7, 24, 31) - .5) < .02).astype(float) + 0)
gri = img.mean(2) / 255
buzl = mix(np.array([150, 186, 220]), np.array([238, 246, 255]), cl(gri * 1.6 + land * .45))
buzl = mix(buzl, np.array([110, 150, 196]), cat * .55)
Image.fromarray(np.clip(buzl, 0, 255).astype(np.uint8)).save(f"{out}/dunya_buz.jpg", quality=90)
print("buz dokusu hazır")
