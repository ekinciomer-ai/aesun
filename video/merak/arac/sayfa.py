"""Seçilen kareleri tek görselde yan yana dizer: python3 sayfa.py <is_klasoru> <kare,kare,...> <cikti_on_eki>"""
import sys, os
from PIL import Image
d, ks, on = sys.argv[1], [int(x) for x in sys.argv[2].split(",")], sys.argv[3]
ims = [Image.open(f"{d}/kare_{k:05d}.jpg").resize((270, 480)) for k in ks]
for j in range(0, len(ims), 7):
    W = Image.new("RGB", (270 * 7, 480))
    for i, im in enumerate(ims[j:j + 7]): W.paste(im, (i * 270, 0))
    W.save(f"{on}{j // 7}.jpg", quality=85)
for f in os.listdir(d):
    if f.startswith("kare_"): os.remove(os.path.join(d, f))
