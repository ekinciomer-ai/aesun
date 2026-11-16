#!/usr/bin/env python3
"""Eski fotoğraftan nesne ayırma (ücretsiz canlandırma için).
Kullanım: nesne_ayir.py <foto> <cikti_klasoru> <ad> <x0,y0,x1,y1> [<x0,y0,x1,y1> ...]
  Kutu: nesneyi çevreleyen alan, fotoğrafa göre 0..1 oranında.
Çıktı: <ad>.jpg  (nesneler silinmiş, yerleri doldurulmuş "boş plaka")
       <ad>_n1.png, <ad>_n2.png ... (şeffaf nesne kesitleri)
       <ad>_nesne.json  (her nesnenin fotoğraftaki yeri: sx,sy,sw,sh oran olarak) -> sahne öğesinde foto.nesneler
Gerekli: rembg (isnet-general-use), opencv. Hepsi sunucuda/çalışma ortamında, ücretsiz."""
import json, os, sys
import numpy as np, cv2
from PIL import Image
from rembg import remove, new_session
foto, cikti, ad = sys.argv[1], sys.argv[2], sys.argv[3]
kutular = [tuple(map(float, k.split(','))) for k in sys.argv[4:]]
os.makedirs(cikti, exist_ok=True)
im = Image.open(foto).convert('RGB'); W, H = im.size; arr = np.array(im)
ses = new_session('isnet-general-use'); maske_top = np.zeros((H, W), np.uint8); kayit = []
for i, (x0, y0, x1, y1) in enumerate(kutular, 1):
    X0, Y0, X1, Y1 = int(x0 * W), int(y0 * H), int(x1 * W), int(y1 * H)
    kes = im.crop((X0, Y0, X1, Y1)); o = remove(kes, session=ses)
    a = np.array(o)[:, :, 3]; a = np.where(a > 40, a, 0).astype(np.uint8)
    bb = Image.fromarray(a).getbbox()
    if not bb: print(f'{ad}_n{i}: nesne bulunamadı, atlandı'); continue
    o = o.crop(bb); o.save(f'{cikti}/{ad}_n{i}.png')
    m = np.zeros((H, W), np.uint8); m[Y0:Y1, X0:X1] = (a > 0).astype(np.uint8) * 255
    maske_top = np.maximum(maske_top, cv2.dilate(m, np.ones((15, 15), np.uint8)))
    kayit.append({'img': f'{ad}_n{i}', 'sx': (X0 + bb[0]) / W, 'sy': (Y0 + bb[1]) / H, 'sw': (bb[2] - bb[0]) / W, 'sh': (bb[3] - bb[1]) / H})
    print(f'{ad}_n{i}: {bb[2]-bb[0]}x{bb[3]-bb[1]} px')
# Doku ile doldurma: boşluğu, nesnenin solundaki/sağındaki gerçek dokudan (buz, su, zemin) yatay kaydırarak kopyala;
# kenarları yumuşat. Bulanık leke bırakan klasik doldurmaya göre çok daha doğal görünür. Kopyalanamayan kalıntı TELEA ile kapanır.
bgr = cv2.cvtColor(arr, cv2.COLOR_RGB2BGR); plaka = bgr.copy(); kalan = maske_top.copy()
ys, xs = np.where(maske_top > 0)
if len(xs):
    for (x0, y0, x1, y1) in kutular:
        X0, Y0, X1, Y1 = int(x0 * W), int(y0 * H), int(x1 * W), int(y1 * H)
        alan = np.zeros_like(maske_top); alan[max(0,Y0-12):Y1+12, max(0,X0-12):X1+12] = 1
        m = (maske_top > 0) & (alan > 0)
        gen = (X1 - X0) + 24
        for dx in (-gen, gen, -2 * gen, 2 * gen):
            yy, xx = np.where(m & (kalan > 0))
            if not len(xx): break
            kx = xx + dx; ok = (kx >= 0) & (kx < W)
            ok &= maske_top[yy.clip(0, H-1), kx.clip(0, W-1)] == 0
            plaka[yy[ok], xx[ok]] = bgr[yy[ok], kx[ok]]; kalan[yy[ok], xx[ok]] = 0
    plaka = cv2.inpaint(plaka, kalan, 5, cv2.INPAINT_TELEA)
    yum = cv2.GaussianBlur((maske_top > 0).astype(np.float32), (0, 0), 6)
    ic = cv2.erode(maske_top, np.ones((9, 9), np.uint8)) > 0
    kenar = ((yum > .05) & ~ic).astype(np.float32)[..., None]
    plaka = (plaka * (1 - kenar * .5) + cv2.GaussianBlur(plaka, (0, 0), 2) * (kenar * .5)).astype(np.uint8)
cv2.imwrite(f'{cikti}/{ad}.jpg', plaka, [cv2.IMWRITE_JPEG_QUALITY, 92])
json.dump(kayit, open(f'{cikti}/{ad}_nesne.json', 'w'), indent=1); print('plaka:', f'{cikti}/{ad}.jpg')
