# Kara Kutu Dosya 03 v2 — ABD dijital krizi (Microsoft 12.11 · FAA 13.11 · bankalar 16.11), sebep/sonuç kartlı kurgu: harita açılışı, canlı duman/ateş/su, toz, film dokusu, renk tonlama, vurgu yakınlaşması,
# kelime kelime altyazı, animasyonlu 3 katlı başlık, kapanış kartı. Kullanım: DIL=tr|en|es [KURU=1] python3 karma_kriz.py
import os, sys, subprocess, json, math, re, random
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter
from fontTools.ttLib import TTFont

K = os.path.dirname(os.path.abspath(__file__)); DIL = os.environ.get("DIL", "tr"); KURU = os.environ.get("KURU") == "1"
W, H, FPS = 1080, 1920, 25
F = os.path.join(K, "..", "..", "icerik", "nazar", "karma")
FONT = {"cinzel7": f"{F}/cinzel-700.ttf", "cinzel9": f"{F}/cinzel-900.ttf", "alfa": f"{F}/alfa-400.ttf",
        "inter": "/usr/share/fonts/opentype/inter/Inter-Black.otf", "interb": "/usr/share/fonts/opentype/inter/Inter-ExtraBold.otf"}
CMAP = {k: set(TTFont(v).getBestCmap().keys()) for k, v in FONT.items()}
_FC = {}
def font(ad, px, metin=""):
    if ad != "inter" and any(ord(c) not in CMAP[ad] for c in metin): ad = "inter"
    if (ad, px) not in _FC: _FC[(ad, px)] = ImageFont.truetype(FONT[ad], px)
    return _FC[(ad, px)]
def ease(p): return 1 - (1 - p) ** 3
random.seed(7)

# ---------- metin, ses, zaman ----------
M = [l.strip() for l in open(f"{K}/metin_{DIL}.txt", encoding="utf-8") if l.strip()]
SES = [f"{K}/ses/KK_KRZ_{DIL.upper()}__s{i+1}.mp3" for i in range(len(M))]
def sure(p): return float(subprocess.check_output(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", p]))
D = [sure(p) for p in SES]; ARA = 0.25; KUYRUK = 1.6
T = []; t = 0.0
for d in D: T.append((t, t + d)); t += d + ARA
TOPLAM = t - ARA + KUYRUK; N = int(TOPLAM * FPS)

# ---------- sahne planı: (görsel | UC | RADAR | ABD | AR | SORU | KAP, yön, (küçük, büyük, vurgulu), panel) ----------
# panel: [(tür, metin)] tür: "S" sebep (sarı) / "N" sonuç (kırmızı) / "D" ders (kanal rengi)
B = {"tr": [
    ("UC", 1, ("ABD · 12–16 KASIM 2026", "5 GÜN", "3 ÇÖKÜŞ"), []),
    ("m1", 1, ("12 KASIM · 1. ÇÖKÜŞ", "MICROSOFT", "DÜNYA GENELİNDE"), []),
    ("m1", -1, ("MICROSOFT", "SEBEP", "VE SONUÇ"), [("S", "Teknik arıza · siber saldırı değil"), ("N", "Outlook, Teams, Copilot 2 gün aksadı")]),
    ("RADAR", 1, ("13 KASIM · 2. ÇÖKÜŞ", "3.500 UÇAK", "HAVADA"), []),
    ("AR", 1, ("FAA · SEBEP", "TEK ROUTER", "AĞI BOĞDU"), [("S", "Bakır→fiber geçişinde yeni router")]),
    ("ABD", 1, ("FAA · SONUÇ", "KALKIŞLAR", "DURDU"), [("N", "17/22 merkez · 12.000+ uçuş iptal")]),
    ("b1", 1, ("16 KASIM · 3. ÇÖKÜŞ", "BANKALAR", "KİLİTLENDİ"), []),
    ("b1", -1, ("CHASE", "SEBEP", "VE SONUÇ"), [("S", "Teknik hata · siber saldırı değil"), ("N", "Giriş, bakiye, Zelle durdu")]),
    ("SORU", 1, ("SİBER SALDIRI MI?", "KANIT", "YOK"), []),
    ("a1", -1, ("ORTAK DERS", "TEK NOKTA", "TEK ÇÖKÜŞ"), [("D", "En riskli an: yenileme"), ("N", "50 milyar $ talep edildi")]),
    ("KAP", 1, ("KABLOLAR YENİLENİYOR", "TEK KUTU", "YETER"), []),
], "en": [
    ("UC", 1, ("USA · NOV 12–16, 2026", "5 DAYS", "3 CRASHES"), []),
    ("m1", 1, ("NOV 12 · CRASH #1", "MICROSOFT", "WORLDWIDE"), []),
    ("m1", -1, ("MICROSOFT", "CAUSE", "& EFFECT"), [("S", "Technical failure · not a cyberattack"), ("N", "Outlook, Teams, Copilot down 2 days")]),
    ("RADAR", 1, ("NOV 13 · CRASH #2", "3,500 PLANES", "IN THE AIR"), []),
    ("AR", 1, ("FAA · CAUSE", "ONE ROUTER", "FLOODED THE NETWORK"), [("S", "New router in copper→fiber upgrade")]),
    ("ABD", 1, ("FAA · EFFECT", "ALL DEPARTURES", "STOPPED"), [("N", "17/22 centers · 12,000+ flights canceled")]),
    ("b1", 1, ("NOV 16 · CRASH #3", "BANKS", "LOCKED OUT"), []),
    ("b1", -1, ("CHASE", "CAUSE", "& EFFECT"), [("S", "Technical glitch · not a cyberattack"), ("N", "Logins, balances, Zelle froze")]),
    ("SORU", 1, ("A CYBERATTACK?", "NO", "EVIDENCE"), []),
    ("a1", -1, ("THE COMMON LESSON", "ONE POINT", "ONE CRASH"), [("D", "Riskiest moment: the upgrade"), ("N", "$50 billion requested")]),
    ("KAP", 1, ("NEW WIRES", "ONE BOX", "IS ENOUGH"), []),
], "es": [
    ("UC", 1, ("EE. UU. · 12–16 NOV 2026", "5 DÍAS", "3 CAÍDAS"), []),
    ("m1", 1, ("12 NOV · CAÍDA 1", "MICROSOFT", "EN TODO EL MUNDO"), []),
    ("m1", -1, ("MICROSOFT", "CAUSA", "Y CONSECUENCIA"), [("S", "Falla técnica · no fue ciberataque"), ("N", "Outlook, Teams, Copilot: 2 días")]),
    ("RADAR", 1, ("13 NOV · CAÍDA 2", "3.500 AVIONES", "EN EL AIRE"), []),
    ("AR", 1, ("FAA · CAUSA", "UN ROUTER", "AHOGÓ LA RED"), [("S", "Router nuevo en cambio cobre→fibra")]),
    ("ABD", 1, ("FAA · CONSECUENCIA", "DESPEGUES", "PARADOS"), [("N", "17/22 centros · +12.000 vuelos cancelados")]),
    ("b1", 1, ("16 NOV · CAÍDA 3", "BANCOS", "BLOQUEADOS"), []),
    ("b1", -1, ("CHASE", "CAUSA", "Y CONSECUENCIA"), [("S", "Error técnico · no fue ciberataque"), ("N", "Accesos, saldos y Zelle congelados")]),
    ("SORU", 1, ("¿CIBERATAQUE?", "SIN", "PRUEBAS"), []),
    ("a1", -1, ("LA LECCIÓN", "UN PUNTO", "UNA CAÍDA"), [("D", "Momento más riesgoso: la renovación"), ("N", "50.000 millones $ pedidos")]),
    ("KAP", 1, ("CABLES NUEVOS", "UNA CAJA", "BASTA"), []),
]}[DIL]
assert len(B) == len(M)
ALT = {"tr": "Temsili illüstrasyon (yapay zekâ) · Harita: Natural Earth · Animasyon: kod · Ses: yapay zekâ",
       "en": "Illustrations: AI generated · Map: Natural Earth · Animation: code · Voice: AI",
       "es": "Ilustraciones: generadas por IA · Mapa: Natural Earth · Animación: código · Voz: IA"}[DIL]
KANAL = {"tr": "KARA KUTU", "en": "BLACK BOX FILES", "es": "CAJA NEGRA"}[DIL]
RENK = {"tr": (255, 140, 0), "en": (40, 150, 255), "es": (255, 210, 0)}[DIL]
KAPANIS = {"tr": "KARA KUTU'YU TAKİP ET", "en": "FOLLOW BLACK BOX FILES", "es": "SIGUE A CAJA NEGRA"}[DIL]
SINYAL = {"tr": "SİNYAL YOK", "en": "SIGNAL LOST", "es": "SIN SEÑAL"}[DIL]
ETK = {"tr": ("17 / 22 MERKEZ", "ROUTER", "", ""), "en": ("17 / 22 CENTERS", "ROUTER", "", ""), "es": ("17 / 22 CENTROS", "ROUTER", "", "")}[DIL]
PET = {"tr": {"S": "SEBEP", "N": "SONUÇ", "D": "DERS"}, "en": {"S": "CAUSE", "N": "EFFECT", "D": "LESSON"}, "es": {"S": "CAUSA", "N": "EFECTO", "D": "LECCIÓN"}}[DIL]
UC = {"tr": [("12 KAS", "MICROSOFT", "E-POSTA"), ("13 KAS", "FAA", "UÇUŞLAR"), ("16 KAS", "CHASE", "BANKALAR")],
      "en": [("NOV 12", "MICROSOFT", "EMAIL"), ("NOV 13", "FAA", "FLIGHTS"), ("NOV 16", "CHASE", "BANKS")],
      "es": [("12 NOV", "MICROSOFT", "CORREO"), ("13 NOV", "FAA", "VUELOS"), ("16 NOV", "CHASE", "BANCOS")]}[DIL]
COKTU = {"tr": "ÇÖKTÜ", "en": "DOWN", "es": "CAÍDO"}[DIL]
SORU = {"tr": ("SİBER SALDIRI?", "KANIT YOK", ["Microsoft: hayır", "FAA / İç Güvenlik: hayır", "Chase: hayır"]),
        "en": ("CYBERATTACK?", "NO EVIDENCE", ["Microsoft: no", "FAA / DHS: no", "Chase: no"]),
        "es": ("¿CIBERATAQUE?", "SIN PRUEBAS", ["Microsoft: no", "FAA / DHS: no", "Chase: no"])}[DIL]
OLAY = {"tr": ["12 KAS · MICROSOFT", "13 KAS · FAA", "16 KAS · CHASE"], "en": ["NOV 12 · MICROSOFT", "NOV 13 · FAA", "NOV 16 · CHASE"],
        "es": ["12 NOV · MICROSOFT", "13 NOV · FAA", "16 NOV · CHASE"]}[DIL]
EF = {"a1": {"ates": [(0.51, 0.65, 0.04)]}}

# ---------- altyazı: kelime zamanları (karakter oranı) ----------
def tr_upper(s): return (s.replace("i", "İ").replace("ı", "I") if DIL == "tr" else s).upper()
KEL = []  # (t0, t1, grup_idx, kelime_idx_in_group, grup_kelimeleri)
for i, s in enumerate(M):
    w = s.split(); g = [w[k:k+3] for k in range(0, len(w), 3)]
    if len(g) > 1 and len(g[-1]) == 1: g[-2] += g[-1]; g.pop()
    t0, t1 = T[i]; top = sum(len(x) + 1 for x in w); c = t0
    for gi, grp in enumerate(g):
        for wi, x in enumerate(grp):
            d = (t1 - t0) * (len(x) + 1) / top; KEL.append((c, c + d, i, gi, wi, [tr_upper(y) for y in grp])); c += d

# ---------- görseller ----------
IMG = {}
def gorsel(ad):
    if ad not in IMG:
        im = Image.open(f"{K}/img/{ad}.png").convert("RGB")
        r = max(W * 1.14 / im.width, H * 1.14 / im.height); im = im.resize((int(im.width * r), int(im.height * r)), Image.LANCZOS)
        IMG[ad] = np.asarray(im).astype(np.float32)
    return IMG[ad]

# duman dokusu (procedural, bir kez)
def gurultu(w, h, oktav=4):
    a = np.zeros((h, w), np.float32)
    for o in range(oktav):
        s = 2 ** (o + 3); n = np.random.rand(h // s + 2, w // s + 2).astype(np.float32)
        im = Image.fromarray((n * 255).astype(np.uint8)).resize((w, h), Image.BICUBIC); a += np.asarray(im).astype(np.float32) / 255 / (2 ** o)
    a -= a.min(); a /= a.max(); return a
np.random.seed(3); DUMAN = gurultu(512, 1024)
DUST = [(random.random(), random.random(), random.uniform(1.5, 3.5), random.uniform(0.004, 0.012), random.random() * 6.28) for _ in range(70)]

def efektler(arr, ad, tz):
    e = EF.get(ad, {}); h, w = arr.shape[:2]
    if "su" in e:
        y0, y1 = int(e["su"][0] * h), int(e["su"][1] * h); band = arr[y0:y1].copy(); n = y1 - y0
        for k in range(0, n, 2):
            f = (k / n); amp = 2.5 * math.sin(f * 3.14); dx = int(round(amp * math.sin(tz * 2.1 + k * 0.35)))
            band[k:k+2] = np.roll(band[k:k+2], dx, axis=1)
        # ışıltı
        par = (np.sin(np.linspace(0, 40, w)[None, :] + tz * 3.0) * np.sin(np.linspace(0, 9, n)[:, None] * 2 + tz)) > 0.985
        band[par] = np.minimum(band[par] + 60, 255); arr[y0:y1] = band
    if "duman" in e:
        cx, cy, rx, ry = e["duman"]; cx, cy, rx, ry = int(cx * w), int(cy * h), int(rx * w), int(ry * h)
        x0, y0 = max(0, cx - rx), max(0, cy - ry); x1, y1 = min(w, cx + rx), min(h, cy + ry)
        yy, xx = np.mgrid[y0:y1, x0:x1]; mask = np.clip(1 - ((xx - cx) / rx) ** 2 - ((yy - cy) / ry) ** 2, 0, 1) ** 1.5
        oy = int((tz * 55) % 512); ox = int((tz * 12) % 100)
        tex = np.tile(DUMAN, (3, 3))[oy:oy + (y1 - y0), ox:ox + (x1 - x0)]
        a = (mask * (0.25 + 0.45 * tex))[..., None]; arr[y0:y1, x0:x1] = arr[y0:y1, x0:x1] * (1 - a) + np.array([205, 200, 195]) * a
    for (cx, cy, r) in e.get("ates", []):
        cx, cy, r = int(cx * w), int(cy * h), int(r * w); x0, y0, x1, y1 = max(0, cx - r), max(0, cy - r), min(w, cx + r), min(h, cy + r)
        yy, xx = np.mgrid[y0:y1, x0:x1]; m = np.clip(1 - ((xx - cx) ** 2 + (yy - cy) ** 2) / (r * r), 0, 1)
        f = 1 + (0.18 * math.sin(tz * 23) + 0.12 * math.sin(tz * 37 + 1) + 0.06 * math.sin(tz * 61)) * m
        arr[y0:y1, x0:x1] = np.clip(arr[y0:y1, x0:x1] * f[..., None] * np.array([1.0, 0.97, 0.9]) + (m * 18)[..., None] * np.array([1, 0.5, 0.1]), 0, 255)
    return arr

# ---------- açılış: radar animasyonu (tamamen kod) ----------
random.seed(11)
BLIP = [(random.uniform(0, 6.283), random.uniform(0.15, 0.95)) for _ in range(46)]
RC, RR = (W // 2, 1010), 450
def radar_kare(tz, p):
    fr = Image.new("RGB", (W, H), (4, 10, 8)); d = ImageDraw.Draw(fr, "RGBA")
    cx, cy = RC; kop = p > 0.55  # "duyamaz oldu" anı
    for k in range(1, 5):
        r = RR * k / 4; d.ellipse((cx - r, cy - r, cx + r, cy + r), outline=(40, 160, 90, 150), width=2)
    d.line((cx - RR, cy, cx + RR, cy), fill=(40, 160, 90, 110), width=1); d.line((cx, cy - RR, cx, cy + RR), fill=(40, 160, 90, 110), width=1)
    ang = (tz * 2.4) % 6.283
    if not kop:
        for k in range(28):  # süpürme izi
            a0 = ang - k * 0.035; a1 = a0 - 0.035
            d.polygon([(cx, cy), (cx + RR * math.cos(a0), cy + RR * math.sin(a0)), (cx + RR * math.cos(a1), cy + RR * math.sin(a1))], fill=(60, 255, 120, int(110 * (1 - k / 28))))
    for i, (a, rr) in enumerate(BLIP):
        x, y = cx + RR * rr * math.cos(a), cy + RR * rr * math.sin(a)
        if kop:
            yan = 0.5 + 0.5 * math.sin(tz * 9 + i)  # donmuş, kırmızı yanıp sönen
            c = (255, 50, 40, int(120 + 135 * yan)); s = 6
        else:
            fark = (ang - a) % 6.283; c = (120, 255, 150, int(255 * max(0.18, 1 - fark / 5))); s = 6
        d.ellipse((x - s, y - s, x + s, y + s), fill=c)
    if kop:  # parazit + damga
        for _ in range(60):
            yy = random.randint(cy - RR, cy + RR); d.line((cx - RR, yy, cx + RR, yy), fill=(200, 255, 200, random.randint(10, 45)), width=random.randint(1, 3))
        g = ease(min(1, (p - 0.55) / 0.08)); ft = font("inter", 96); tw = d.textlength(SINYAL, font=ft)
        if int(tz * 4) % 2 == 0 or g < 1:
            d.rounded_rectangle(((W - tw) / 2 - 30, cy - 70, (W + tw) / 2 + 30, cy + 70), 16, fill=(160, 0, 0, int(200 * g)), outline=(255, 255, 255, int(255 * g)), width=4)
            d.text(((W - tw) / 2, cy - 58), SINYAL, font=ft, fill=(255, 255, 255, int(255 * g)))
    # ekran halkası
    d.ellipse((cx - RR - 14, cy - RR - 14, cx + RR + 14, cy + RR + 14), outline=(30, 60, 45, 255), width=12)
    return fr

# ---------- harita (Natural Earth, eşdikdörtgen) ----------
def harita_taban():
    dd = json.load(open(os.path.join(F, "geo", "land-50m.json"))); sc, trn = dd["transform"]["scale"], dd["transform"]["translate"]
    def arc(i):
        a = dd["arcs"][i if i >= 0 else ~i]; x = y = 0; pts = []
        for dx, dy in a: x += dx; y += dy; pts.append((x * sc[0] + trn[0], y * sc[1] + trn[1]))
        return pts if i >= 0 else pts[::-1]
    S = 24; x0, x1, y0, y1 = -175, -20, 82, -12  # ABD ve çevresi (kırpma taşmasın)
    im = Image.new("RGB", ((x1 - x0) * S, (y0 - y1) * S), (10, 20, 36)); dr = ImageDraw.Draw(im)
    def pr(lon, lat): return ((lon - x0) * S, (y0 - lat) * S)
    for g in dd["objects"]["land"]["geometries"]:
        polys = g["arcs"] if g["type"] == "MultiPolygon" else [g["arcs"]]
        for poly in polys:
            for ri, ring in enumerate(poly):
                pts = []
                for ai in ring: pts += arc(ai)
                if not any(x0 - 5 < p[0] < x1 + 5 and y1 - 5 < p[1] < y0 + 5 for p in pts): continue
                pts = [pr(*p) for p in pts]
                if len(pts) > 2: dr.polygon(pts, fill=(44, 58, 80) if ri == 0 else (10, 20, 36), outline=(110, 140, 175))
    return im, S, x0, y0
HAR = None
MERKEZ = [(-122.2, 47.3), (-122.0, 37.5), (-118.1, 34.6), (-111.9, 40.8), (-105.1, 40.2), (-106.6, 35.2), (-93.1, 44.6), (-94.8, 38.9),
          (-97.0, 32.8), (-95.3, 29.9), (-88.3, 41.8), (-86.3, 39.7), (-89.9, 35.1), (-82.2, 41.3), (-84.3, 33.4), (-81.9, 30.7),
          (-80.3, 25.8), (-77.5, 39.1), (-73.1, 40.8), (-71.5, 42.7)]  # kıta ABD'deki 20 yol merkezi (yaklaşık)
AR, AM, NY = (-92.3, 34.7), (-101.8, 35.2), (-74.0, 40.7)
def harita_kare(tur, tz, p, a):
    global HAR
    if HAR is None: HAR = harita_taban()
    im, S, x0, y0 = HAR
    hedef = {"ABD": ((-97, 37, 15.5), (-96, 37, 17.5)), "AR": ((-96, 37, 17.5), (-97.2, 35.0, 50)), "KAP": ((-84, 37.5, 26), (-84, 37.5, 22))}[tur]
    e = ease(min(1, p * 1.3)); (l0, b0, z0), (l1, b1, z1) = hedef
    clon, clat, z = l0 + (l1 - l0) * e, b0 + (b1 - b0) * e, z0 + (z1 - z0) * e
    cw, ch = W / z, H / z; px0 = (clon - cw / 2 - x0) * S; py0 = (y0 - (clat + ch / 2)) * S
    fr = im.crop((int(px0), int(py0), int(px0 + cw * S), int(py0 + ch * S))).resize((W, H), Image.BILINEAR)
    d = ImageDraw.Draw(fr, "RGBA")
    def pr(lon, lat): return (lon - clon) * z + W / 2, (clat - lat) * z + H / 2
    def nabiz(x, y, renk, R=60, hiz=1.0, g=1.0):
        for k in range(3):
            r = 10 + ((tz * hiz + k / 3) % 1) * R; aa = int(170 * (1 - (r - 10) / R) * g)
            d.ellipse((x - r, y - r, x + r, y + r), outline=renk + (aa,), width=3)
        d.ellipse((x - 9, y - 9, x + 9, y + 9), fill=renk + (int(255 * g),), outline=(255, 255, 255, int(255 * g)), width=2)
    def etiket(x, y, metin, renk, yon=1, dy=0, g=1.0, px=36):
        ft = font("interb", px); tw = d.textlength(metin, font=ft); bx = x + 22 if yon > 0 else x - 22 - tw - 26; by = y + dy
        d.rounded_rectangle((bx, by - 28, bx + tw + 26, by + 28), 10, fill=(0, 0, 0, int(190 * g)), outline=renk + (int(160 * g),))
        d.text((bx + 13, by - 24), metin, font=ft, fill=(255, 255, 255, int(255 * g)))
    if tur == "ABD":
        for i, (lon, lat) in enumerate(MERKEZ):
            x, y = pr(lon, lat); g = min(1, max(0, (tz - a - 0.2 - i * 0.07) / 0.3))
            if g <= 0: continue
            arz = tz - a > 1.6  # temsili: hangi merkezlerin etkilendiği gösterilmez, hepsi titrer
            renk = (255, 60, 50) if arz and int(tz * 5 + i) % 3 else (255, 190, 70)
            nabiz(x, y, renk, R=40, hiz=1.2 + i * 0.03, g=g)
        g = ease(min(1, max(0, (tz - a - 1.6) / 0.4)))
        if g > 0:
            ft = font("inter", 64); s = ETK[0]; tw = d.textlength(s, font=ft); by = 1180
            d.rounded_rectangle(((W - tw) / 2 - 30, by, (W + tw) / 2 + 30, by + 96), 18, fill=(150, 0, 0, int(220 * g)), outline=(255, 255, 255, int(255 * g)), width=3)
            d.text(((W - tw) / 2, by + 12), s, font=ft, fill=(255, 255, 255, int(255 * g)))
    elif tur == "AR":
        xa, ya = pr(*AR); xm, ym = pr(*AM)
        nabiz(xa, ya, (255, 60, 50), R=90, hiz=1.8); nabiz(xm, ym, (255, 60, 50), R=70, hiz=1.6, g=min(1, max(0, (tz - a - 1.2) / 0.4)))
        # saldırı gibi yayılan bağlantı denemeleri: router'dan çıkan noktalar
        for k in range(40):
            f = (tz * 1.5 + k / 40) % 1; ang = k * 2.4
            x, y = xa + math.cos(ang) * f * 520, ya + math.sin(ang) * f * 520
            d.ellipse((x - 4, y - 4, x + 4, y + 4), fill=(255, 210, 90, int(230 * (1 - f))))
        etiket(xa, ya, "ARKANSAS · " + ETK[1], (255, 80, 60), -1, -80)
        if tz - a > 1.2: etiket(xm, ym, "AMARILLO", (255, 80, 60), 1, 80)
        sayac = min(1000, int(max(0, tz - a) * 900)); ft = font("inter", 80); s = f"{sayac:,}".replace(",", "." if DIL != "en" else ",") + (" / 4-5 sn" if DIL == "tr" else " / 4-5 s")
        tw = d.textlength(s, font=ft); d.text(((W - tw) / 2, 1200), s, font=ft, fill=(255, 220, 90), stroke_width=6, stroke_fill=(0, 0, 0))
    else:  # KAP: üç çöküşün yeri (Microsoft merkezi Redmond, Arkansas router, Chase New York)
        yerler = [(-122.1, 47.7), AR, NY]; renkler = [(90, 170, 255), (255, 60, 50), (255, 190, 70)]
        for i, ((lon, lat), rk) in enumerate(zip(yerler, renkler)):
            g = ease(min(1, max(0, (tz - a - 0.3 - i * 0.5) / 0.4)))
            if g <= 0: continue
            x, y = pr(lon, lat); nabiz(x, y, rk, R=70, hiz=1.2 + i * 0.2, g=g)
            etiket(x, y, OLAY[i], rk, 1 if i == 0 else (-1 if i == 2 else 1), (-80, 80, -80)[i], g, 34)
    return fr

# ---------- açılış: üç sistem kartı sırayla çöker (kod) ----------
def ikon(d, tur, x, y, s, renk):
    if tur == 0:  # zarf
        d.rectangle((x - s, y - s * 0.65, x + s, y + s * 0.65), outline=renk, width=6); d.line((x - s, y - s * 0.65, x, y + s * 0.1, x + s, y - s * 0.65), fill=renk, width=6)
    elif tur == 1:  # uçak
        d.polygon([(x - s, y + s * 0.15), (x + s * 0.9, y - s * 0.15), (x + s, y), (x + s * 0.9, y + s * 0.15)], fill=renk)
        d.polygon([(x - s * 0.1, y), (x + s * 0.3, y - s * 0.9), (x + s * 0.45, y - s * 0.9), (x + s * 0.35, y)], fill=renk)
        d.polygon([(x - s * 0.1, y + s * 0.05), (x + s * 0.3, y + s * 0.9), (x + s * 0.45, y + s * 0.9), (x + s * 0.35, y + s * 0.05)], fill=renk)
        d.polygon([(x - s, y + s * 0.1), (x - s * 0.85, y - s * 0.5), (x - s * 0.7, y - s * 0.5), (x - s * 0.7, y)], fill=renk)
    else:  # banka
        d.polygon([(x - s, y - s * 0.35), (x, y - s), (x + s, y - s * 0.35)], fill=renk)
        for k in range(4): xx = x - s * 0.75 + k * s * 0.5; d.rectangle((xx - s * 0.1, y - s * 0.25, xx + s * 0.1, y + s * 0.6), fill=renk)
        d.rectangle((x - s, y + s * 0.65, x + s, y + s * 0.85), fill=renk)
def uc_kare(tz, p, a):
    fr = Image.new("RGB", (W, H), (8, 10, 16)); d = ImageDraw.Draw(fr, "RGBA")
    for yy in range(0, H, 6): d.line((0, yy, W, yy), fill=(255, 255, 255, 6))
    for i in range(3):
        y0 = 520 + i * 380; giris = ease(min(1, max(0, (tz - a - 0.15 * i) / 0.4))); x0 = 70 + (1 - giris) * -900
        cok = tz - a > 0.9 + i * 0.9; t_c = tz - a - (0.9 + i * 0.9)
        sars = int(14 * math.sin(t_c * 60) * math.exp(-t_c * 6)) if cok else 0
        x0 += sars; gl = (200, 30, 30) if cok else (40, 120, 70)
        d.rounded_rectangle((x0, y0, x0 + W - 140, y0 + 320), 28, fill=(18, 22, 30, 240), outline=gl + (255,), width=5)
        ikon(d, i, x0 + 150, y0 + 160, 85, (255, 90, 80) if cok else (120, 230, 150))
        d.text((x0 + 280, y0 + 50), UC[i][0], font=font("interb", 44), fill=(200, 200, 200))
        d.text((x0 + 280, y0 + 105), UC[i][1], font=font("inter", 84), fill=(255, 255, 255))
        d.text((x0 + 280, y0 + 205), UC[i][2], font=font("interb", 50), fill=RENK)
        if cok:
            g = ease(min(1, t_c / 0.15)); ft = font("inter", int(150 - 40 * g)); tw = d.textlength(COKTU, font=ft)
            cx, cy = x0 + (W - 140) - tw / 2 - 40, y0 + 160
            d.text((cx - tw / 2, cy - 70), COKTU, font=ft, fill=(230, 30, 30, int(255 * g)), stroke_width=6, stroke_fill=(255, 255, 255, int(255 * g)))
            if t_c < 0.35:
                for _ in range(8):
                    yy = random.randint(y0, y0 + 320); d.rectangle((x0, yy, x0 + W - 140, yy + random.randint(2, 10)), fill=(255, 40, 40, 70))
    return fr

# ---------- "siber saldırı mı?" animasyonu (kod) ----------
def soru_kare(tz, p, a):
    fr = Image.new("RGB", (W, H), (6, 6, 10)); d = ImageDraw.Draw(fr, "RGBA"); t = tz - a
    ft = font("inter", 110); s1 = SORU[0]; tw = d.textlength(s1, font=ft)
    while tw > W - 80: ft = font("inter", ft.size - 6); tw = d.textlength(s1, font=ft)
    d.text(((W - tw) / 2, 560), s1, font=ft, fill=(255, 255, 255), stroke_width=4, stroke_fill=(0, 0, 0))
    if t > 0.9:  # üstünü çiz
        g = ease(min(1, (t - 0.9) / 0.35)); d.line(((W - tw) / 2 - 20, 625, (W - tw) / 2 - 20 + (tw + 40) * g, 640), fill=(230, 30, 30), width=14)
    for i, sat in enumerate(SORU[2]):
        g = ease(min(1, max(0, (t - 1.3 - i * 0.45) / 0.3)))
        if g <= 0: continue
        ft2 = font("interb", 52); y = 780 + i * 95
        d.text((150, y), "✕" if False else "X", font=font("inter", 52), fill=(230, 40, 40, int(255 * g)))
        d.text((220, y), sat, font=ft2, fill=(235, 235, 235, int(255 * g)))
    if t > 2.9:
        g = ease(min(1, (t - 2.9) / 0.3)); ft3 = font("inter", 96); s3 = SORU[1]; tw3 = d.textlength(s3, font=ft3)
        d.rounded_rectangle(((W - tw3) / 2 - 36, 1120, (W + tw3) / 2 + 36, 1250), 20, fill=RENK + (int(240 * g),))
        d.text(((W - tw3) / 2, 1132), s3, font=ft3, fill=(0, 0, 0, int(255 * g)))
    return fr

# ---------- sebep / sonuç paneli ----------
def panel(d, pn, tz, a):
    y = 1060
    for i, (tur, metin) in enumerate(pn):
        g = ease(min(1, max(0, (tz - a - 0.6 - i * 1.3) / 0.35)))
        if g <= 0: continue
        renk = {"S": (255, 205, 0), "N": (230, 40, 40), "D": RENK}[tur]; et = PET[tur]
        fe = font("inter", 40); fm = font("interb", 44); ew = d.textlength(et, font=fe) + 40
        mw = d.textlength(metin, font=fm)
        while ew + mw + 60 > W - 60 and fm.size > 28: fm = font("interb", fm.size - 2); mw = d.textlength(metin, font=fm)
        x0 = 40 + (1 - g) * -700; w = ew + mw + 60
        d.rounded_rectangle((x0, y, x0 + w, y + 86), 16, fill=(10, 10, 14, int(225 * g)), outline=renk + (int(255 * g),), width=3)
        d.rounded_rectangle((x0, y, x0 + ew, y + 86), 16, fill=renk + (int(255 * g),))
        d.text((x0 + 20, y + 18), et, font=fe, fill=(0, 0, 0, int(255 * g)) if tur == "S" else (255, 255, 255, int(255 * g)))
        d.text((x0 + ew + 30, y + 18), metin, font=fm, fill=(255, 255, 255, int(255 * g)))
        y += 108

# ---------- katmanlar ----------
GOLGE = Image.new("RGBA", (W, H), (0, 0, 0, 0)); _g = np.zeros((H, W, 4), np.uint8)
yy = np.arange(H)[:, None]; a_top = (110 * np.clip(1 - yy / 640, 0, 1) ** 1.3); a_bot = (130 * np.clip((yy - (H - 560)) / 560, 0, 1) ** 1.3)
_g[..., 3] = np.clip(a_top + a_bot, 0, 255).astype(np.uint8); GOLGE = Image.fromarray(_g, "RGBA")
# vinyet + renk tonlama LUT
yy, xx = np.mgrid[0:H, 0:W]; VIN = (1 - 0.55 * np.clip(((xx - W / 2) / (W * 0.62)) ** 2 + ((yy - H / 2) / (H * 0.62)) ** 2, 0, 1) ** 1.6).astype(np.float32)[..., None]
xs = np.arange(256) / 255
LUT = np.stack([np.clip((xs - 0.5) * 1.12 + 0.5 + 0.03 * xs, 0, 1), np.clip((xs - 0.5) * 1.10 + 0.5, 0, 1), np.clip((xs - 0.5) * 1.06 + 0.5 + 0.03 * (1 - xs), 0, 1)], 1)
LUT = (LUT * 255).astype(np.uint8)

def kompoze(arr, tz):
    arr = np.clip(arr * VIN, 0, 255).astype(np.uint8)
    arr = np.stack([LUT[arr[..., 0], 0], LUT[arr[..., 1], 1], LUT[arr[..., 2], 2]], -1)
    # film grain
    arr = np.clip(arr.astype(np.int16) + np.random.randint(-7, 8, (H // 2, W // 2, 1)).repeat(2, 0).repeat(2, 1), 0, 255).astype(np.uint8)
    return Image.fromarray(arr)

def toz(d, tz):
    for (x, y, r, hz, f) in DUST:
        px = (x + 0.03 * math.sin(tz * 0.6 + f)) % 1 * W; py = ((y - tz * hz) % 1) * H; a = int(90 + 70 * math.sin(tz * 2 + f))
        d.ellipse((px - r, py - r, px + r, py + r), fill=(255, 240, 200, a))

def baslik(d, bas, tz, a):
    ysb = 140
    for j, (metin, fad, px, renk) in enumerate([(bas[0], "cinzel7", 44, (232, 196, 112)), (bas[1], "alfa", 112, (255, 255, 255)), (bas[2], "cinzel9", 82, (232, 196, 112))]):
        gec = ease(min(1, max(0, (tz - a - 0.18 * j) / 0.5))); ft = font(fad, px, metin)
        while d.textlength(metin, font=ft) > W - 80 and px > 30: px -= 4; ft = font(fad, px, metin)
        tw = d.textlength(metin, font=ft); x = (W - tw) / 2; y = ysb + (1 - gec) * 50
        d.text((x, y), metin, font=ft, fill=renk + (int(255 * gec),), stroke_width=5, stroke_fill=(0, 0, 0, int(235 * gec)))
        if j == 1:
            lw = tw * gec; d.rectangle(((W - lw) / 2, y + px + 8, (W + lw) / 2, y + px + 12), fill=(232, 196, 112, int(255 * gec)))
        ysb += px + 20

def altyazi(d, tz):
    for (t0, t1, i, gi, wi, grp) in KEL:
        if t0 <= tz < t1:
            px = 68; ft = font("inter", px); metin = " ".join(grp)
            while d.textlength(metin, font=ft) > W - 60 and px > 36: px -= 4; ft = font("inter", px)
            x = (W - d.textlength(metin, font=ft)) / 2; y = 1470
            for k, wd in enumerate(grp):
                fill = (255, 255, 255) if k == wi else RENK
                d.text((x, y), wd, font=ft, fill=fill, stroke_width=6, stroke_fill=(0, 0, 0)); x += d.textlength(wd + " ", font=ft)
            break

def kare(fi):
    tz = fi / FPS
    si = next((i for i, (a, b) in enumerate(T) if tz < b + ARA), len(T) - 1)
    ad, yon, bas, pn = B[si]; a, b = T[si]; p = min(1, max(0, (tz - a) / (b - a + ARA)))
    harita = ad in ("RADAR", "ABD", "AR", "KAP", "UC", "SORU")
    if ad == "RADAR": fr = radar_kare(tz, p)
    elif ad == "UC": fr = uc_kare(tz, p, a)
    elif ad == "SORU": fr = soru_kare(tz, p, a)
    elif harita: fr = harita_kare(ad, tz, p, a)
    else:
        arr = gorsel(ad).copy(); arr = efektler(arr, ad, tz)
        h, w = arr.shape[:2]; punch = 0.05 * math.exp(-max(0, tz - a) / 0.35)
        z = 1.0 + 0.09 * (ease(p) if yon > 0 else 1 - ease(p)) + punch
        cw, ch = int(W / z), int(H / z)
        cx = (w - cw) // 2 + int((w - cw) * 0.3 * math.sin(p * 3.14) * yon); cy = (h - ch) // 2 + int((h - ch) * 0.15 * (p - 0.5) * yon)
        fr = Image.fromarray(arr[cy:cy + ch, cx:cx + cw].astype(np.uint8)).resize((W, H), Image.BILINEAR)
    fr = kompoze(np.asarray(fr).astype(np.float32), tz)
    fr = Image.alpha_composite(fr.convert("RGBA"), GOLGE); d = ImageDraw.Draw(fr, "RGBA")
    if not harita: toz(d, tz)
    if si == len(B) - 1:
        g = ease(min(1, max(0, (tz - a - 0.8) / 0.5)))
        if g > 0:
            ft = font("inter", 50); tw = d.textlength(KAPANIS, font=ft); bx, by = (W - tw) / 2 - 36, 640
            d.rounded_rectangle((bx, by, bx + tw + 72, by + 96), 22, fill=RENK + (int(235 * g),), outline=(255, 255, 255, int(255 * g)), width=3)
            d.text(((W - tw) / 2, by + 20), KAPANIS, font=ft, fill=(0, 0, 0, int(255 * g)) if DIL != "en" else (255, 255, 255, int(255 * g)))
    baslik(d, bas, tz, a)
    if pn: panel(d, pn, tz, a)
    altyazi(d, tz)
    # kanal imzası: renkli şerit + ad
    ft = font("inter", 34); tw = d.textlength(KANAL, font=ft)
    d.rectangle(((W - tw) / 2 - 18, H - 78, (W + tw) / 2 + 18, H - 30), fill=(0, 0, 0, 200)); d.rectangle(((W - tw) / 2 - 18, H - 78, (W - tw) / 2 - 10, H - 30), fill=RENK)
    d.text(((W - tw) / 2 + 4, H - 74), KANAL, font=ft, fill=(255, 255, 255))
    ft = font("interb", 20); d.text((W - d.textlength(ALT, font=ft) - 20, H - 112), ALT, font=ft, fill=(220, 220, 220), stroke_width=2, stroke_fill=(0, 0, 0))
    for k, (a3, _) in enumerate(T[1:], 1):
        if abs(tz - a3) < 0.12:
            if k in (3, 6, 8): d.rectangle((0, 0, W, H), fill=(0, 0, 0, int(255 * (1 - abs(tz - a3) / 0.12))))
            else: d.rectangle((0, 0, W, H), fill=(250, 240, 220, int(170 * (1 - abs(tz - a3) / 0.12))))
    if tz > TOPLAM - 0.6: d.rectangle((0, 0, W, H), fill=(0, 0, 0, int(255 * (tz - (TOPLAM - 0.6)) / 0.6)))
    return fr.convert("RGB")

if KURU:
    print(json.dumps({"toplam": round(TOPLAM, 1), "sahne": [(B[i][0], round(T[i][0], 1), round(T[i][1], 1)) for i in range(len(T))]}, ensure_ascii=False))
    kareler = [kare(int((T[i][0] + (T[i][1] - T[i][0]) * 0.85) * FPS)) for i in range(len(T))]
    th = [k.resize((270, 480)) for k in kareler]; sheet = Image.new("RGB", (270 * 6, 480 * 2))
    for i, k in enumerate(th): sheet.paste(k, ((i % 6) * 270, (i // 6) * 480))
    sheet.save(f"{K}/temas_{DIL}.jpg", quality=85); sys.exit()
# ses: anlatım + açılışta telsiz paraziti ve uyarı bipi
lst = f"{K}/ses_{DIL}.txt"
subprocess.run(["ffmpeg", "-y", "-v", "error", "-f", "lavfi", "-i", "anullsrc=r=44100:cl=mono", "-t", str(ARA), f"{K}/sessiz.wav"], check=True)
subprocess.run(["ffmpeg", "-y", "-v", "error", "-f", "lavfi", "-i", "anullsrc=r=44100:cl=mono", "-t", str(KUYRUK), f"{K}/kuyruk.wav"], check=True)
with open(lst, "w") as f:
    for i, p in enumerate(SES):
        w = f"{K}/p_{DIL}_{i}.wav"; subprocess.run(["ffmpeg", "-y", "-v", "error", "-i", p, "-ar", "44100", "-ac", "1", w], check=True)
        f.write(f"file '{w}'\n" + (f"file '{K}/sessiz.wav'\n" if i < len(SES) - 1 else f"file '{K}/kuyruk.wav'\n"))
subprocess.run(["ffmpeg", "-y", "-v", "error", "-f", "concat", "-safe", "0", "-i", lst, "-ar", "44100", "-ac", "1", f"{K}/anlatim_{DIL}.wav"], check=True)
kop = T[3][0] + (T[3][1] - T[3][0] + ARA) * 0.55
damga = [T[0][0] + 0.9 + i * 0.9 for i in range(3)]
sfx = (f"anoisesrc=d={TOPLAM:.2f}:c=pink:a=0.5:r=44100,bandpass=f=1800:w=1400,volume='if(between(t,{kop:.2f},{kop+2.4:.2f}),0.22,if(between(t,{T[3][0]:.2f},{kop:.2f}),0.035,0))':eval=frame[n];"
       f"sine=f=880:d={TOPLAM:.2f}:r=44100,volume='if(lt(mod(t,0.5),0.12)*between(t,{kop:.2f},{kop+1.6:.2f}),0.18,0)':eval=frame[b];"
       f"sine=f=55:d={TOPLAM:.2f}:r=44100,volume=0.05[dr];"
       f"sine=f=70:d={TOPLAM:.2f}:r=44100,volume='{'+'.join(f'0.5*between(t,{x:.2f},{x+0.18:.2f})*exp(-(t-{x:.2f})*14)' for x in damga)}':eval=frame[th];"
       f"[n][b][dr][th]amix=inputs=4:normalize=0[s]")
subprocess.run(["ffmpeg", "-y", "-v", "error", "-filter_complex", sfx, "-map", "[s]", "-ac", "1", f"{K}/sfx_{DIL}.wav"], check=True)
subprocess.run(["ffmpeg", "-y", "-v", "error", "-i", f"{K}/anlatim_{DIL}.wav", "-i", f"{K}/sfx_{DIL}.wav", "-filter_complex",
                "[0][1]amix=inputs=2:normalize=0:duration=first,loudnorm=I=-15:TP=-1.5", "-ar", "44100", f"{K}/ses_{DIL}.m4a"], check=True)
OLC = os.environ.get("OLCEK", "1080")
out = f"{K}/KK_KRZ_{DIL.upper()}_{OLC}p.mp4"
vf = [] if OLC == "1080" else ["-vf", "scale=-2:854"]
ff = subprocess.Popen(["ffmpeg", "-y", "-v", "error", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-", "-i", f"{K}/ses_{DIL}.m4a",
                       *vf, "-c:v", "libx264", "-preset", "veryfast", "-crf", "21" if OLC == "1080" else "26", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "160k", "-shortest", "-movflags", "+faststart", out], stdin=subprocess.PIPE)
try:
    for fi in range(N):
        ff.stdin.write(kare(fi).tobytes())
        if fi % 250 == 0: print(f"kare {fi}/{N}", flush=True)
    ff.stdin.close()
except BrokenPipeError:
    pass  # ses bitti (-shortest): kalan birkaç kare gereksiz
ff.wait(); print("bitti", out, os.path.getsize(out) // 1024, "KB")
