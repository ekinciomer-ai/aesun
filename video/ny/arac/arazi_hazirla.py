# dem.png + geo.json -> motor/arazi_<W>.bin (int16 yükseklik + uint8 Türkiye maskesi) ve arazi_<W>.json
import json, sys, numpy as np
from PIL import Image
from matplotlib.path import Path
M = sys.argv[1]; W = int(sys.argv[2]) if len(sys.argv) > 2 else 720
meta = json.load(open(f"{M}/dem.json")); a = np.asarray(Image.open(f"{M}/dem.png")).astype(np.int32)
e = (a[..., 0] * 256 + a[..., 1] - meta["ofset"]).astype(np.float32)
e = np.minimum(e, 5200)
H = int(round(W * e.shape[0] / e.shape[1]))
im = Image.fromarray(e, mode="F").resize((W, H), Image.BOX); E = np.asarray(im)
lon = meta["lon0"] + (np.arange(W) + .5) / W * (meta["lon1"] - meta["lon0"])
lat = meta["lat1"] - (np.arange(H) + .5) / H * (meta["lat1"] - meta["lat0"])
LON, LAT = np.meshgrid(lon, lat); P = np.c_[LON.ravel(), LAT.ravel()]
geo = json.load(open(f"{M}/geo.json")); mk = np.zeros(len(P), bool)
for h in geo["ulke"]["TUR"]: mk |= Path(h).contains_points(P)
mk = mk.reshape(H, W).astype(np.float32)
# kenarı yumuşat (3x3 bulanıklık)
from scipy.ndimage import gaussian_filter
mk = np.clip(gaussian_filter(mk, 1.2) * 255, 0, 255).astype(np.uint8)
ilid = np.zeros(len(P), np.uint8)
for k, ad in enumerate(geo.get("il_ad", [])):
    for h in geo["il"][ad]:
        hp_ = Path(h); bb = hp_.get_extents(); sec = (P[:, 0] >= bb.x0) & (P[:, 0] <= bb.x1) & (P[:, 1] >= bb.y0) & (P[:, 1] <= bb.y1)
        ii = np.where(sec)[0]; ilid[ii[hp_.contains_points(P[ii])]] = k + 1
open(f"{M}/arazi_{W}.bin", "wb").write(np.round(E).astype(np.int16).tobytes() + mk.tobytes() + ilid.tobytes())
json.dump({**{k: meta[k] for k in ("lon0", "lon1", "lat0", "lat1")}, "w": W, "h": H}, open(f"{M}/arazi_{W}.json", "w"))
print("arazi", W, H, E.min(), E.max())
