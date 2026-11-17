# Natural Earth (kamu malı) verisinden Nasıl Yapıldı motoru için geo.json üretir.
# python3 -I geo_hazirla.py <ne klasörü> <çıktı geo.json>
import json, sys, math
NE, OUT = sys.argv[1], sys.argv[2]
def yukle(f): return json.load(open(f"{NE}/{f}.geojson"))
def rdp(p, e):
    if len(p) < 3: return p
    (x1, y1), (x2, y2) = p[0], p[-1]; dx, dy = x2 - x1, y2 - y1; L = math.hypot(dx, dy) or 1e-12
    dm, im = 0, 0
    for i in range(1, len(p) - 1):
        d = abs(dy * p[i][0] - dx * p[i][1] + x2 * y1 - y2 * x1) / L
        if d > dm: dm, im = d, i
    return rdp(p[:im + 1], e)[:-1] + rdp(p[im:], e) if dm > e else [p[0], p[-1]]
def halkalar(g):
    ps = [g["coordinates"]] if g["type"] == "Polygon" else g["coordinates"]
    def halka(r):
        r = [c[:2] for c in r]; m = len(r) // 2
        return rdp(r[:m + 1], 0.006)[:-1] + rdp(r[m:], 0.006)
    return [[[round(x, 4), round(y, 4)] for x, y in halka(poly[0])] for poly in ps]
A = yukle("ne_10m_admin_0_countries")
ulke = {}
for f in A["features"]:
    k = f["properties"]["ADM0_A3"]
    if k in ("TUR", "GRC", "BGR", "GEO", "ARM", "AZE", "IRN", "IRQ", "SYR", "CYP", "CYN", "RUS", "LBN", "JOR", "ROU", "MKD", "UKR", "ISR", "SAU", "EGY", "PSX"):
        hs = [h for h in halkalar(f["geometry"]) if len(h) > 3]
        if k != "TUR": hs = [h for h in hs if any(20 < x < 50 and 30 < y < 46 for x, y in h)]
        ulke[k] = hs
def icinde(pt, poly):
    x, y = pt; c = False; n = len(poly)
    for i in range(n):
        x1, y1 = poly[i]; x2, y2 = poly[(i + 1) % n]
        if (y1 > y) != (y2 > y) and x < (x2 - x1) * (y - y1) / (y2 - y1) + x1: c = not c
    return c
def tr_icinde(p): return any(icinde(p, h) for h in ulke["TUR"])
segs = {}
for fn in ("ne_10m_rivers_lake_centerlines", "ne_10m_rivers_europe"):
    for f in yukle(fn)["features"]:
        n = (f["properties"].get("name") or "").lower().replace("?", "i").replace("ı", "i")
        g = f["geometry"]; cs = [g["coordinates"]] if g["type"] == "LineString" else g["coordinates"]
        for l in cs: segs.setdefault(n, []).append([p[:2] for p in l])
def zincir(adlar, kaynak, tol=0.25):
    S = [s for a in adlar for s in segs.get(a, [])]
    def yak(p, q): return math.hypot(p[0] - q[0], p[1] - q[1])
    # kaynağa en yakın uç noktadan başla
    i, s = min(((i, s) for i, s in enumerate(S)), key=lambda t: min(yak(t[1][0], kaynak), yak(t[1][-1], kaynak)))
    yol = s if yak(s[0], kaynak) <= yak(s[-1], kaynak) else s[::-1]; S.pop(i)
    while S:
        son = yol[-1]; en = None
        for i, s in enumerate(S):
            for j, p in enumerate(s):
                d = yak(p, son)
                if d < tol and (en is None or d < en[0]): en = (d, i, j)
        if not en: break
        _, i, j = en; s = S.pop(i)
        a, b = s[j:], s[:j + 1][::-1]
        yol += (a if len(a) >= len(b) else b)[1:]
    return [[round(x, 4), round(y, 4)] for x, y in rdp(yol, 0.004)]
nehir = {
    "kizilirmak": zincir(["kizilirmak"], (38.37, 39.86)),
    "firat": zincir(["firat", "al furat"], (41.46, 40.18)),
    "sakarya": zincir(["sakarya"], (30.72, 39.02)),
    "murat": zincir(["murat"], (43.58, 39.41)),
    "aras": zincir(["aras"], (41.33, 39.37)),
}
for k, v in nehir.items():
    v2 = [p + [1 if tr_icinde(p) else 0] for p in v]; nehir[k] = v2
    print(k, len(v2), v2[0][:2], v2[-1][:2], "TR nokta", sum(p[2] for p in v2))
gol = {}
for f in yukle("ne_10m_lakes")["features"]:
    n = f["properties"].get("name")
    if n in ("Lake Van", "Lake Tuz", "Eğirdir", "Beyşehir", "Keban Baraji", "Ataturk Barajt"):
        gol[n] = halkalar(f["geometry"])
json.dump({"ulke": ulke, "nehir": nehir, "gol": gol}, open(OUT, "w"), separators=(",", ":"))
print("tamam", OUT)
