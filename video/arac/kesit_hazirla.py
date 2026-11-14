"""Fotoğraftan nesne kesme (sticker) + boşalan yeri doldurma. Vox kolaj "fotoğraftan çıkan nesne" efekti için.
python3 kesit_hazirla.py <proje klasörü> <ad1,ad2,...>
Girdi: <proje>/img/<ad>.jpg, isteğe bağlı <proje>/renkli/<ad>.jpg (renklendirilmiş), <proje>/maske/<ad>.png (yoksa rembg ile üretilir).
Çıktı: <proje>/kesit/<ad>.png (renkli, beyaz kenarlı), <proje>/kesit/<ad>_sb.png (siyah-beyaz, beyaz kenarlı),
       <proje>/img/<ad>_bos.jpg (nesne çıkarılmış, yeri doldurulmuş fotoğraf). Kenar, görüntü boyunun %1,1'i."""
import os, sys, numpy as np, cv2
from PIL import Image
P, adlar = sys.argv[1], sys.argv[2].split(",")
os.makedirs(f"{P}/kesit", exist_ok=True); os.makedirs(f"{P}/maske", exist_ok=True)
for ad in adlar:
    src = np.array(Image.open(f"{P}/img/{ad}.jpg").convert("RGB"))
    mp = f"{P}/maske/{ad}.png"
    if not os.path.exists(mp):
        from rembg import remove, new_session
        remove(Image.fromarray(src), session=new_session("isnet-general-use"), only_mask=True).save(mp)
    m = np.array(Image.open(mp).convert("L").resize((src.shape[1], src.shape[0])))
    m = (m > 110).astype(np.uint8)
    n, lab, st, _ = cv2.connectedComponentsWithStats(m, 8)       # küçük kırıntıları at
    big = max(1, st[1:, cv2.CC_STAT_AREA].max() if n > 1 else 1)
    keep = np.zeros_like(m)
    for i in range(1, n):
        if st[i, cv2.CC_STAT_AREA] > big * 0.06: keep[lab == i] = 1
    keep = cv2.morphologyEx(keep, cv2.MORPH_CLOSE, np.ones((7, 7), np.uint8))
    b = max(6, int(0.011 * max(src.shape[:2])))
    dis = cv2.dilate(keep, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2 * b + 1, 2 * b + 1)))
    dis = cv2.GaussianBlur(dis.astype(np.float32), (0, 0), 1.2)
    ic = cv2.GaussianBlur(keep.astype(np.float32), (0, 0), 0.8)
    renk = f"{P}/renkli/{ad}.jpg"
    rk = np.array(Image.open(renk).convert("RGB").resize((src.shape[1], src.shape[0]))) if os.path.exists(renk) else src
    gri = cv2.cvtColor(cv2.cvtColor(src, cv2.COLOR_RGB2GRAY), cv2.COLOR_GRAY2RGB)
    for son, kaynak in (("", rk), ("_sb", gri)):
        rgb = kaynak.astype(np.float32) * ic[..., None] + 251 * (1 - ic[..., None])   # dışı beyaz kenar
        a = np.clip(dis, 0, 1) * 255
        Image.fromarray(np.dstack([rgb.clip(0, 255), a]).astype(np.uint8), "RGBA").save(f"{P}/kesit/{ad}{son}.png")
    # boşalan yeri doldur (küçültüp doldur, büyüt; nesnenin hayaleti kalmasın diye maske geniş)
    k = 900 / max(src.shape[:2]); sm = cv2.resize(src, None, fx=k, fy=k, interpolation=cv2.INTER_AREA)
    mm = cv2.dilate(cv2.resize(keep, (sm.shape[1], sm.shape[0]), interpolation=cv2.INTER_NEAREST), np.ones((15, 15), np.uint8))
    dol = cv2.inpaint(cv2.cvtColor(sm, cv2.COLOR_RGB2BGR), mm * 255, 9, cv2.INPAINT_TELEA)
    dol = cv2.cvtColor(cv2.resize(dol, (src.shape[1], src.shape[0]), interpolation=cv2.INTER_CUBIC), cv2.COLOR_BGR2RGB)
    mb = cv2.GaussianBlur(cv2.resize(mm, (src.shape[1], src.shape[0])).astype(np.float32), (0, 0), 3)[..., None]
    Image.fromarray((src * (1 - mb) + dol * mb).astype(np.uint8)).save(f"{P}/img/{ad}_bos.jpg", quality=88)
    print(ad, "kesit tamam", "renkli" if rk is not src else "siyah-beyaz")
