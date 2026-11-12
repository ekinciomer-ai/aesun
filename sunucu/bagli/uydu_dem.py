"""Bağlıkaya sahası: Esri World Imagery (z19) + AWS Terrarium DEM (z15) karolarını indirip
yerel metrik eksene (orijin 38.497350 K, 33.919770 D; +x doğu, +y kuzey) yeniden örnekler.
Çıktı: uydu.jpg (0,25 m/px, kuzey yukarı) + dem.json (2 m ızgara, kot m) + bilgi.json"""
import math, io, json, sys, os, urllib.request
import numpy as np
from PIL import Image
OUT = sys.argv[1]; os.makedirs(OUT, exist_ok=True)
LAT0, LON0, R = 38.497350, 33.919770, 6371008.8
COS = math.cos(math.radians(38.499735))
X0, X1, Y0, Y1 = -40.0, 560.0, 60.0, 520.0
def ll(x, y): return LON0 + math.degrees(x / (R * COS)), LAT0 + math.degrees(y / R)
def merc(lon, lat, z):
    n = 2 ** z; return (lon + 180) / 360 * n * 256, (1 - math.log(math.tan(math.radians(lat)) + 1 / math.cos(math.radians(lat))) / math.pi) / 2 * n * 256
def get(url):
    for k in range(4):
        try:
            r = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (aesun-bagli)'}); return urllib.request.urlopen(r, timeout=40).read()
        except Exception as e: err = e
    raise err
def mozaik(z, url, mode):
    lo0, la0 = ll(X0, Y0); lo1, la1 = ll(X1, Y1)
    px0, py1 = merc(lo0, la0, z); px1, py0 = merc(lo1, la1, z)
    tx0, tx1, ty0, ty1 = int(px0 // 256) - 1, int(px1 // 256) + 1, int(py0 // 256) - 1, int(py1 // 256) + 1
    M = Image.new(mode, ((tx1 - tx0 + 1) * 256, (ty1 - ty0 + 1) * 256))
    for tx in range(tx0, tx1 + 1):
        for ty in range(ty0, ty1 + 1):
            im = Image.open(io.BytesIO(get(url.format(z=z, x=tx, y=ty)))).convert(mode); M.paste(im, ((tx - tx0) * 256, (ty - ty0) * 256))
    return M, tx0 * 256, ty0 * 256
def ornekle(M, ox, oy, z, step, bilinear=True):
    xs = np.arange(X0, X1 + 1e-6, step); ys = np.arange(Y1, Y0 - 1e-6, -step)
    XX, YY = np.meshgrid(xs, ys)
    lon = LON0 + np.degrees(XX / (R * COS)); lat = LAT0 + np.degrees(YY / R); n = 2 ** z
    px = (lon + 180) / 360 * n * 256 - ox; py = (1 - np.log(np.tan(np.radians(lat)) + 1 / np.cos(np.radians(lat))) / np.pi) / 2 * n * 256 - oy
    A = np.asarray(M).astype(np.float32)
    x0 = np.floor(px).astype(int); y0 = np.floor(py).astype(int); fx = (px - x0)[..., None] if A.ndim == 3 else px - x0; fy = (py - y0)[..., None] if A.ndim == 3 else py - y0
    g = lambda yy, xx: A[np.clip(yy, 0, A.shape[0] - 1), np.clip(xx, 0, A.shape[1] - 1)]
    return g(y0, x0) * (1 - fx) * (1 - fy) + g(y0, x0 + 1) * fx * (1 - fy) + g(y0 + 1, x0) * (1 - fx) * fy + g(y0 + 1, x0 + 1) * fx * fy, xs, ys
# uydu
M, ox, oy = mozaik(19, 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', 'RGB')
U, xs, ys = ornekle(M, ox, oy, 19, 0.25)
Image.fromarray(np.clip(U, 0, 255).astype(np.uint8)).save(os.path.join(OUT, 'uydu.jpg'), quality=78, optimize=True, progressive=True)
# DEM (Terrarium: (R*256 + G + B/256) - 32768); karoyu RGB olarak al, yüksekliğe çevir sonra örnekle
D, dx, dy = mozaik(15, 'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png', 'RGB')
a = np.asarray(D).astype(np.float64); H = a[..., 0] * 256 + a[..., 1] + a[..., 2] / 256 - 32768
E, exs, eys = ornekle(Image.fromarray(H.astype(np.float32), mode='F'), dx, dy, 15, 2.0)
json.dump({'x0': X0, 'y1': Y1, 'step': 2.0, 'nx': len(exs), 'ny': len(eys), 'kot_dm': [int(round(v * 10)) for v in E.flatten()]}, open(os.path.join(OUT, 'dem.json'), 'w'), separators=(',', ':'))
json.dump({'uydu': {'x0': X0, 'x1': X0 + (len(xs) - 1) * 0.25, 'y0': Y1 - (len(ys) - 1) * 0.25, 'y1': Y1, 'px': [len(xs), len(ys)], 'kaynak': 'Esri World Imagery (Esri, Maxar, Earthstar Geographics)', 'z': 19},
           'dem': {'kaynak': 'AWS Terrain Tiles (Terrarium; SRTM/ALOS/Copernicus karışımı)', 'z': 15, 'min': float(E.min()), 'max': float(E.max())}}, open(os.path.join(OUT, 'bilgi.json'), 'w'), ensure_ascii=False, indent=1)
print('UYDU_DEM_BITTI', U.shape, E.shape, E.min(), E.max())
