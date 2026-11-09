# Ömür Dediğin: kodla çizilmiş 2D illüstrasyonlar (SVG → PNG, 1920x1080). Sıcak sepya palet, düz vektör, kâğıt dokusu.
# python3 sahneler.py <çıktı klasörü>
import os, sys, random, math, asyncio
OUT = sys.argv[1]; os.makedirs(OUT, exist_ok=True)
random.seed(4)
P = dict(krem="#f3e4c6", krem2="#e9d3a8", kum="#d9b98a", toprak="#a8754a", kahve="#6e4a33", koyu="#3d2a1f", turuncu="#d9893b",
         kirmizi="#b5442f", yesil="#6f8a5a", yesil2="#4f6b45", camgok="#8fb3b0", mavi="#4e7a8c", gece="#2b3550", altin="#e8b65a", beyaz="#fbf4e4")
W, H = 1920, 1080

def doku():  # kâğıt dokusu + vinyet
    return f'''<filter id="kagit"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="3" seed="7"/><feColorMatrix values="0 0 0 0 0.35  0 0 0 0 0.25  0 0 0 0 0.15  0 0 0 0.10 0"/></filter>
<radialGradient id="vin" cx="50%" cy="50%" r="75%"><stop offset="60%" stop-color="#000" stop-opacity="0"/><stop offset="100%" stop-color="#2a1a10" stop-opacity="0.45"/></radialGradient>'''
def bitir(): return f'<rect width="{W}" height="{H}" filter="url(#kagit)"/><rect width="{W}" height="{H}" fill="url(#vin)"/>'
def gok(ust, alt, gid="g"):
    return f'<defs><linearGradient id="{gid}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="{ust}"/><stop offset="1" stop-color="{alt}"/></linearGradient>{doku()}</defs><rect width="{W}" height="{H}" fill="url(#{gid})"/>'
def ev(x, y, w, h, renk, cati=None, pencere=2, kapi=True, isik=False):
    c = cati or P["kirmizi"]; s = f'<rect x="{x}" y="{y}" width="{w}" height="{h}" fill="{renk}" stroke="{P["koyu"]}" stroke-width="3"/>'
    s += f'<polygon points="{x-15},{y} {x+w/2},{y-h*0.45} {x+w+15},{y}" fill="{c}" stroke="{P["koyu"]}" stroke-width="3"/>'
    pr = P["altin"] if isik else P["camgok"]
    for i in range(pencere):
        px = x + w * (i + 1) / (pencere + 1) - 22
        s += f'<rect x="{px}" y="{y+h*0.18}" width="44" height="54" fill="{pr}" stroke="{P["koyu"]}" stroke-width="3"/><line x1="{px+22}" y1="{y+h*0.18}" x2="{px+22}" y2="{y+h*0.18+54}" stroke="{P["koyu"]}" stroke-width="2"/>'
    if kapi: s += f'<rect x="{x+w/2-24}" y="{y+h-80}" width="48" height="80" fill="{P["kahve"]}" stroke="{P["koyu"]}" stroke-width="3"/>'
    return s
def cocuk(x, y, olc=1.0, renk=None, kol=0, yon=1):
    r = renk or P["mavi"]; o = olc
    return (f'<g transform="translate({x},{y}) scale({o*yon},{o})"><circle cx="0" cy="-118" r="22" fill="{P["kum"]}" stroke="{P["koyu"]}" stroke-width="3"/>'
            f'<path d="M-22,-124 Q0,-150 22,-124 Z" fill="{P["koyu"]}"/><rect x="-20" y="-96" width="40" height="52" rx="10" fill="{r}" stroke="{P["koyu"]}" stroke-width="3"/>'
            f'<line x1="-10" y1="-44" x2="-16" y2="0" stroke="{P["koyu"]}" stroke-width="9" stroke-linecap="round"/><line x1="10" y1="-44" x2="18" y2="0" stroke="{P["koyu"]}" stroke-width="9" stroke-linecap="round"/>'
            f'<line x1="-18" y1="-88" x2="-38" y2="{-60-kol}" stroke="{P["kum"]}" stroke-width="8" stroke-linecap="round"/><line x1="18" y1="-88" x2="40" y2="{-60+kol}" stroke="{P["kum"]}" stroke-width="8" stroke-linecap="round"/></g>')
def yetiskin(x, y, renk, olc=1.4, sakal=False, yon=1, basortu=False):
    s = cocuk(0, 0, 1, renk)
    ek = f'<path d="M-26,-112 Q0,-160 26,-112 L22,-96 L-22,-96 Z" fill="{P["krem2"]}" stroke="{P["koyu"]}" stroke-width="3"/>' if basortu else ""
    ek += f'<path d="M-12,-104 Q0,-90 12,-104" stroke="{P["koyu"]}" stroke-width="6" fill="none"/>' if sakal else ""
    return f'<g transform="translate({x},{y}) scale({olc*yon},{olc})">{s}{ek}</g>'
def minare(x, y, h):
    return (f'<rect x="{x}" y="{y-h}" width="34" height="{h}" fill="{P["kahve"]}" opacity="0.85"/><rect x="{x-8}" y="{y-h*0.72}" width="50" height="12" fill="{P["kahve"]}" opacity="0.85"/>'
            f'<polygon points="{x-2},{y-h} {x+17},{y-h-80} {x+36},{y-h}" fill="{P["kahve"]}" opacity="0.85"/>')
def kubbe(x, y, r): return f'<path d="M{x-r},{y} A{r},{r} 0 0,1 {x+r},{y} Z" fill="{P["kahve"]}" opacity="0.85"/><rect x="{x-r-20}" y="{y}" width="{2*r+40}" height="120" fill="{P["kahve"]}" opacity="0.85"/>'
def bulut(x, y, s=1): return f'<g transform="translate({x},{y}) scale({s})" fill="{P["beyaz"]}" opacity="0.7"><ellipse cx="0" cy="0" rx="90" ry="32"/><ellipse cx="50" cy="-20" rx="60" ry="34"/><ellipse cx="-40" cy="-12" rx="50" ry="26"/></g>'
def yer(y, renk): return f'<rect x="0" y="{y}" width="{W}" height="{H-y}" fill="{renk}"/>'
def svg(ic): return f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}">{ic}{bitir()}</svg>'

S = {}
# 01 giriş: çay bardağı, masa, pencere
S["giris_cay"] = svg(gok(P["krem"], P["krem2"]) +
    f'<rect x="1150" y="140" width="560" height="460" fill="{P["camgok"]}" stroke="{P["kahve"]}" stroke-width="18"/><line x1="1430" y1="140" x2="1430" y2="600" stroke="{P["kahve"]}" stroke-width="12"/>'
    + minare(1300, 600, 300) + kubbe(1560, 600, 90) + yer(700, P["toprak"]) + f'<rect x="0" y="690" width="{W}" height="40" fill="{P["kahve"]}"/>'
    + f'<path d="M760,470 L800,690 L920,690 L960,470 Q930,560 860,560 Q790,560 760,470 Z" fill="#c4572e" opacity="0.9" stroke="{P["koyu"]}" stroke-width="5"/>'
    + f'<ellipse cx="860" cy="470" rx="100" ry="16" fill="{P["altin"]}" stroke="{P["koyu"]}" stroke-width="4"/><ellipse cx="860" cy="700" rx="150" ry="22" fill="{P["krem2"]}" stroke="{P["koyu"]}" stroke-width="4"/>'
    + ''.join(f'<path d="M{830+i*30},440 q-20,-40 0,-80 q20,-40 0,-80" stroke="{P["beyaz"]}" stroke-width="6" fill="none" opacity="0.7"/>' for i in range(3)))
# 02 akşam ezanı sokak
S["ezan_sokak"] = svg(gok("#e9a35b", "#f4d6a0") + f'<circle cx="1500" cy="560" r="120" fill="#f7c66b" opacity="0.9"/>' + minare(1380, 640, 380) + kubbe(1620, 640, 140)
    + ev(80, 470, 330, 260, P["krem2"], isik=True) + ev(450, 500, 280, 230, "#e7c690", P["toprak"], isik=True) + ev(780, 480, 300, 250, P["krem2"], isik=True)
    + yer(730, P["kum"]) + cocuk(520, 900, 1.6, P["kirmizi"], 20) + cocuk(680, 920, 1.5, P["mavi"], -20, -1) + cocuk(860, 905, 1.5, P["yesil"], 25)
    + yetiskin(260, 860, P["yesil2"], 1.7, basortu=True))
# 03 çeşme
S["cesme"] = svg(gok("#bcd3cc", P["krem"]) + yer(760, P["kum"]) +
    f'<rect x="640" y="250" width="640" height="510" fill="{P["krem2"]}" stroke="{P["koyu"]}" stroke-width="5"/><path d="M700,760 L700,420 A260,170 0 0,1 1220,420 L1220,760" fill="#e2c48f" stroke="{P["koyu"]}" stroke-width="5"/>'
    f'<rect x="610" y="220" width="700" height="40" fill="{P["toprak"]}" stroke="{P["koyu"]}" stroke-width="5"/><rect x="900" y="560" width="120" height="30" fill="{P["kahve"]}"/>'
    f'<path d="M960,590 L960,700" stroke="{P["camgok"]}" stroke-width="12"/><rect x="760" y="700" width="400" height="60" fill="{P["toprak"]}" stroke="{P["koyu"]}" stroke-width="5"/>'
    + cocuk(1060, 760, 1.7, P["kirmizi"], -40, -1) + cocuk(560, 880, 1.5, P["mavi"], 10) + cocuk(1400, 890, 1.5, P["yesil"], 0, -1))
# 04 oyuncaklar: misket, çelik çomak, çorap top, rulmanlı araba
S["oyuncak"] = svg(gok(P["krem"], P["kum"]) + yer(640, "#cfa673") +
    ''.join(f'<circle cx="{300+i*70}" cy="{820+(i%2)*30}" r="26" fill="{c}" stroke="{P["koyu"]}" stroke-width="3"/><circle cx="{292+i*70}" cy="{812+(i%2)*30}" r="7" fill="#fff" opacity="0.6"/>' for i, c in enumerate([P["mavi"], P["kirmizi"], P["yesil"], P["altin"], P["camgok"]]))
    + f'<line x1="700" y1="760" x2="1000" y2="700" stroke="{P["kahve"]}" stroke-width="18" stroke-linecap="round"/><line x1="1040" y1="770" x2="1110" y2="760" stroke="{P["kahve"]}" stroke-width="14" stroke-linecap="round"/>'
    + f'<circle cx="1320" cy="760" r="70" fill="#9a8f84" stroke="{P["koyu"]}" stroke-width="4"/><path d="M1270,730 Q1320,700 1370,740 M1260,780 Q1320,800 1380,770" stroke="{P["koyu"]}" stroke-width="3" fill="none"/>'
    + f'<rect x="1450" y="820" width="330" height="40" fill="{P["toprak"]}" stroke="{P["koyu"]}" stroke-width="4"/>'
    + ''.join(f'<circle cx="{cx}" cy="875" r="26" fill="#8d8d8d" stroke="{P["koyu"]}" stroke-width="4"/><circle cx="{cx}" cy="875" r="9" fill="{P["koyu"]}"/>' for cx in (1490, 1740))
    + cocuk(1000, 600, 1.4, P["kirmizi"], 30) + cocuk(1200, 610, 1.4, P["mavi"], -30, -1))
# 05 siyah beyaz TV, komşular
S["tv"] = svg(gok("#5a4636", "#3b2c22") + f'<rect x="0" y="760" width="{W}" height="320" fill="#4a3426"/>'
    + f'<rect x="720" y="300" width="480" height="380" rx="30" fill="#6b4b31" stroke="{P["koyu"]}" stroke-width="6"/><rect x="760" y="340" width="330" height="270" rx="30" fill="#c9c9c3"/>'
    + ''.join(f'<rect x="770" y="{350+i*14}" width="310" height="6" fill="#9e9e98" opacity="{0.3+0.4*random.random()}"/>' for i in range(18))
    + f'<circle cx="1140" cy="400" r="18" fill="{P["altin"]}"/><circle cx="1140" cy="460" r="18" fill="{P["altin"]}"/><line x1="900" y1="300" x2="820" y2="170" stroke="{P["koyu"]}" stroke-width="6"/><line x1="1020" y1="300" x2="1110" y2="170" stroke="{P["koyu"]}" stroke-width="6"/>'
    + f'<rect x="760" y="680" width="400" height="80" fill="#5a3d28"/>'
    + yetiskin(350, 1030, P["yesil2"], 1.8, sakal=True) + yetiskin(560, 1050, P["kirmizi"], 1.7, basortu=True) + cocuk(1350, 1040, 1.8, P["mavi"]) + cocuk(1520, 1050, 1.7, P["altin"], 10, -1) + yetiskin(1720, 1040, P["mavi"], 1.8, sakal=True, yon=-1))
# 06 çatı anten
S["anten"] = svg(gok("#bcd3cc", P["krem"]) + ev(500, 520, 900, 560, P["krem2"], P["kirmizi"], 4, False)
    + f'<line x1="950" y1="120" x2="950" y2="330" stroke="{P["koyu"]}" stroke-width="10"/>' + ''.join(f'<line x1="{950-w}" y1="{140+i*40}" x2="{950+w}" y2="{140+i*40}" stroke="{P["koyu"]}" stroke-width="7"/>' for i, w in enumerate([140, 110, 80, 50]))
    + cocuk(1100, 340, 1.4, P["mavi"], 40) + cocuk(240, 1060, 1.7, P["kirmizi"], -40) + bulut(300, 200) + bulut(1600, 160, 1.2))
# 07 bakkal veresiye
S["bakkal"] = svg(gok(P["krem"], P["krem2"]) + f'<rect x="0" y="0" width="{W}" height="520" fill="#d6b47e"/>'
    + ''.join(f'<rect x="{80+i*220}" y="{70+j*140}" width="180" height="16" fill="{P["kahve"]}"/>' + ''.join(f'<rect x="{90+i*220+k*42}" y="{10+j*140}" width="32" height="60" rx="5" fill="{random.choice([P["kirmizi"],P["mavi"],P["altin"],P["yesil"]])}"/>' for k in range(4)) for i in range(8) for j in range(3))
    + f'<rect x="0" y="560" width="{W}" height="200" fill="{P["toprak"]}" stroke="{P["koyu"]}" stroke-width="5"/>'
    + f'<g transform="translate(860,470) rotate(-4)"><rect width="300" height="200" fill="{P["beyaz"]}" stroke="{P["koyu"]}" stroke-width="4"/>' + ''.join(f'<line x1="20" y1="{40+i*30}" x2="280" y2="{40+i*30}" stroke="{P["mavi"]}" stroke-width="2"/><text x="24" y="{36+i*30}" font-family="DejaVu Serif" font-size="20" fill="{P["koyu"]}">{t}</text>' for i, t in enumerate(["Ekmek 2", "Yağ 1", "Şeker", "Gazoz 3", "Sakız"])) + '</g>'
    + yetiskin(560, 560, P["beyaz"], 1.9, sakal=True) + cocuk(1450, 1000, 1.9, P["kirmizi"], 20, -1))
# 08 gazoz şişeleri
S["gazoz"] = svg(gok(P["krem"], "#e5c48c") + f'<rect x="0" y="720" width="{W}" height="360" fill="{P["toprak"]}"/>'
    + ''.join(f'<g transform="translate({380+i*240},300)"><path d="M40,0 L80,0 L80,90 Q120,130 120,190 L120,420 Q120,440 100,440 L20,440 Q0,440 0,420 L0,190 Q0,130 40,90 Z" fill="{c}" opacity="0.75" stroke="{P["koyu"]}" stroke-width="5"/><rect x="36" y="-14" width="48" height="18" fill="{P["altin"]}" stroke="{P["koyu"]}" stroke-width="3"/><rect x="18" y="230" width="84" height="90" fill="{P["beyaz"]}" opacity="0.85"/><rect x="28" y="140" width="10" height="250" fill="#fff" opacity="0.35"/></g>' for i, c in enumerate(["#7fae9b", "#7fae9b", "#c98a3f", "#7fae9b", "#b0563a", "#7fae9b"]))
    + f'<circle cx="1640" cy="880" r="34" fill="{P["altin"]}" stroke="{P["koyu"]}" stroke-width="4"/><circle cx="1720" cy="900" r="34" fill="{P["altin"]}" stroke="{P["koyu"]}" stroke-width="4"/>')
# 09 mektup + postacı
S["mektup"] = svg(gok("#c9dbd3", P["krem"]) + yer(760, P["kum"]) + ev(80, 470, 380, 290, P["krem2"]) + ev(1480, 480, 380, 280, "#e7c690", P["toprak"])
    + yetiskin(860, 900, P["mavi"], 2.0, sakal=True) + f'<rect x="900" y="760" width="110" height="90" fill="{P["kahve"]}" stroke="{P["koyu"]}" stroke-width="4"/>'
    + ''.join(cocuk(1080 + i * 110, 930 + (i % 2) * 15, 1.4, c, 20 * (-1) ** i) for i, c in enumerate([P["kirmizi"], P["yesil"], P["altin"]]))
    + f'<g transform="translate(560,200) rotate(-8)"><rect width="300" height="190" fill="{P["beyaz"]}" stroke="{P["koyu"]}" stroke-width="5"/><path d="M0,0 L150,110 L300,0" fill="none" stroke="{P["koyu"]}" stroke-width="4"/><rect x="230" y="18" width="50" height="60" fill="{P["kirmizi"]}"/></g>')
# 10 telefon
S["telefon"] = svg(gok("#efe0c2", "#dcc39a") + f'<rect x="0" y="700" width="{W}" height="380" fill="{P["kahve"]}"/>'
    + f'<path d="M700,700 L760,470 L1160,470 L1220,700 Z" fill="#3c3c3c" stroke="{P["koyu"]}" stroke-width="6"/><circle cx="960" cy="590" r="95" fill="#d9d2c3" stroke="{P["koyu"]}" stroke-width="5"/>'
    + ''.join(f'<circle cx="{960+70*math.cos(a)}" cy="{590+70*math.sin(a)}" r="14" fill="#3c3c3c"/>' for a in [i * 0.55 - 2.6 for i in range(10)])
    + f'<path d="M690,440 Q690,370 760,370 L1160,370 Q1230,370 1230,440 L1150,470 L1110,420 L810,420 L770,470 Z" fill="#2c2c2c" stroke="{P["koyu"]}" stroke-width="6"/>'
    + f'<path d="M1220,620 C1400,640 1350,820 1540,800" stroke="#2c2c2c" stroke-width="10" fill="none"/>')
# 11 kamyon kasası
S["kamyon"] = svg(gok("#a9cfe0", P["krem"]) + bulut(300, 180) + bulut(1300, 140, 1.3) + f'<path d="M0,620 Q500,520 1000,600 T1920,560 L1920,1080 L0,1080 Z" fill="{P["yesil"]}"/>' + yer(860, "#b89466")
    + f'<rect x="1220" y="520" width="300" height="250" rx="20" fill="{P["mavi"]}" stroke="{P["koyu"]}" stroke-width="6"/><rect x="1300" y="560" width="160" height="100" fill="{P["camgok"]}" stroke="{P["koyu"]}" stroke-width="4"/>'
    + f'<rect x="500" y="580" width="720" height="190" fill="{P["toprak"]}" stroke="{P["koyu"]}" stroke-width="6"/>' + ''.join(f'<line x1="{540+i*70}" y1="580" x2="{540+i*70}" y2="770" stroke="{P["koyu"]}" stroke-width="3"/>' for i in range(10))
    + ''.join(cocuk(580 + i * 105, 600, 1.2, c, 40 * (-1) ** i) for i, c in enumerate([P["kirmizi"], P["altin"], P["yesil"], P["kirmizi"], P["mavi"], P["altin"]]))
    + yetiskin(1080, 600, P["yesil2"], 1.3, basortu=True) + ''.join(f'<circle cx="{cx}" cy="790" r="62" fill="#2c2c2c"/><circle cx="{cx}" cy="790" r="24" fill="#8d8d8d"/>' for cx in (640, 1040, 1400)))
# 12 bayram: el öpme, mendil para
S["bayram"] = svg(gok(P["krem"], P["krem2"]) + yer(780, "#c99b66") + ev(1150, 380, 600, 400, P["krem2"], pencere=3)
    + yetiskin(1000, 1000, P["kahve"], 2.1, sakal=True, yon=-1) + cocuk(780, 1010, 1.9, P["kirmizi"], -50) + cocuk(560, 1000, 1.8, P["mavi"], 0)
    + f'<g transform="translate(250,880)"><path d="M0,0 L140,0 L120,90 L20,90 Z" fill="{P["beyaz"]}" stroke="{P["koyu"]}" stroke-width="4"/>' + ''.join(f'<circle cx="{30+i*25}" cy="{-10-(i%2)*14}" r="16" fill="{P["altin"]}" stroke="{P["koyu"]}" stroke-width="3"/>' for i in range(4)) + '</g>'
    + f'<path d="M300,700 l70,0 q20,0 20,20 l-110,0 z M420,700 l70,0 q20,0 20,20 l-110,0 z" fill="{P["koyu"]}"/>')
# 13 bisiklet kiralama
S["bisiklet"] = svg(gok("#bcd3cc", P["krem"]) + yer(780, P["kum"]) + ev(120, 420, 560, 360, "#e7c690", P["toprak"], 2)
    + f'<rect x="200" y="470" width="400" height="70" fill="{P["beyaz"]}" stroke="{P["koyu"]}" stroke-width="4"/><text x="400" y="520" text-anchor="middle" font-family="DejaVu Serif" font-weight="bold" font-size="40" fill="{P["kirmizi"]}">BİSİKLETÇİ</text>'
    + ''.join(f'<g transform="translate({x},880)"><circle cx="0" cy="0" r="80" fill="none" stroke="{P["koyu"]}" stroke-width="8"/><circle cx="220" cy="0" r="80" fill="none" stroke="{P["koyu"]}" stroke-width="8"/><path d="M0,0 L80,-110 L190,-110 L220,0 M80,-110 L110,0 L190,-110 M70,-140 L100,-140 M190,-110 L180,-160 L220,-160" stroke="{c}" stroke-width="10" fill="none"/></g>' for x, c in ((820, P["kirmizi"]), (1350, P["mavi"])))
    + cocuk(1200, 980, 1.6, P["altin"], 40) + yetiskin(720, 1000, P["kahve"], 1.8, sakal=True))
# 14 kuyruk (tüp)
S["kuyruk"] = svg(gok("#d7d2c4", "#c4b9a3") + yer(760, "#a8977d") + f'<rect x="1450" y="380" width="420" height="380" fill="{P["krem2"]}" stroke="{P["koyu"]}" stroke-width="5"/><rect x="1480" y="440" width="360" height="70" fill="{P["beyaz"]}" stroke="{P["koyu"]}" stroke-width="3"/><text x="1660" y="490" text-anchor="middle" font-family="DejaVu Serif" font-weight="bold" font-size="40" fill="{P["koyu"]}">TÜP · YAĞ</text>'
    + ''.join((cocuk(1350 - i * 120, 960, 1.6, random.choice([P["mavi"], P["kirmizi"], P["yesil"]])) if i % 3 == 1 else yetiskin(1350 - i * 120, 960, random.choice([P["kahve"], P["yesil2"], P["mavi"]]), 1.6, basortu=(i % 2 == 0))) for i in range(10))
    + ''.join(f'<rect x="{1290-i*240}" y="900" width="44" height="70" rx="12" fill="{P["kirmizi"]}" stroke="{P["koyu"]}" stroke-width="3"/>' for i in range(4)))
# 15 okul sınıfı
S["okul"] = svg(gok("#e6dcc6", "#d4c4a4") + f'<rect x="420" y="120" width="1080" height="420" fill="#2f4a3c" stroke="{P["kahve"]}" stroke-width="20"/><text x="960" y="300" text-anchor="middle" font-family="DejaVu Serif" font-size="70" fill="#e9e4d4">Cumhuriyet</text><text x="960" y="390" text-anchor="middle" font-family="DejaVu Serif" font-size="50" fill="#e9e4d4">2 + 3 = 5</text>'
    + yer(800, "#9a7a55") + yetiskin(300, 860, P["kahve"], 2.1, sakal=True) + ''.join(f'<rect x="{560+i*360}" y="760" width="300" height="40" fill="{P["toprak"]}" stroke="{P["koyu"]}" stroke-width="4"/>' + cocuk(640 + i * 360, 840, 1.3, P["koyu"]) + cocuk(780 + i * 360, 840, 1.3, P["koyu"]) for i in range(3)))
# 16 köy, dam, yıldızlar
S["koy_gece"] = svg(gok(P["gece"], "#5b5f74") + ''.join(f'<circle cx="{random.randint(0,W)}" cy="{random.randint(0,520)}" r="{random.choice([2,2,3,4])}" fill="#fff8de" opacity="{random.uniform(0.5,1)}"/>' for _ in range(180))
    + f'<circle cx="1550" cy="200" r="60" fill="#fff3cf"/>' + f'<path d="M0,700 Q400,560 900,660 T1920,620 L1920,1080 L0,1080 Z" fill="#3d4a3a"/>'
    + f'<rect x="480" y="560" width="760" height="300" fill="#a48460" stroke="#2b2b2b" stroke-width="5"/><rect x="440" y="540" width="840" height="30" fill="#7e6446"/><rect x="760" y="660" width="70" height="90" fill="{P["altin"]}"/>'
    + ''.join(f'<rect x="{560+i*180}" y="510" width="150" height="34" rx="16" fill="{c}"/>' for i, c in enumerate([P["kirmizi"], P["mavi"], P["altin"], P["yesil"]])) + yer(860, "#2f392d"))
# 17 köy gündüz harman, erik ağacı
S["koy_gun"] = svg(gok("#a9cfe0", P["krem"]) + f'<path d="M0,600 Q500,480 1000,580 T1920,540 L1920,1080 L0,1080 Z" fill="#c9a35b"/>' + yer(820, "#b88d4f")
    + f'<rect x="1450" y="420" width="40" height="300" fill="{P["kahve"]}"/><circle cx="1470" cy="400" r="150" fill="{P["yesil"]}"/>' + ''.join(f'<circle cx="{1400+random.randint(0,150)}" cy="{330+random.randint(0,150)}" r="12" fill="#7a3f6a"/>' for _ in range(16))
    + ''.join(f'<path d="M{300+i*160},820 l60,-120 l60,120 z" fill="{P["altin"]}" stroke="{P["kahve"]}" stroke-width="3"/>' for i in range(5)) + yetiskin(1250, 950, P["yesil2"], 1.9, sakal=True) + cocuk(1600, 950, 1.6, P["kirmizi"], 50) + bulut(400, 160))
# 18 kapanış mahalle
S["kapanis"] = svg(gok("#e2a067", "#f1d3a4") + f'<circle cx="960" cy="560" r="160" fill="#f7c66b" opacity="0.85"/>' + ''.join(ev(40 + i * 380, 470 + (i % 2) * 30, 330, 290 - (i % 2) * 30, random.choice([P["krem2"], "#e7c690", "#ead6b0"]), random.choice([P["kirmizi"], P["toprak"]]), 2, True, True) for i in range(5))
    + yer(760, P["kum"]) + ''.join(cocuk(500 + i * 220, 920, 1.4, c, 20 * (-1) ** i, (-1) ** i) for i, c in enumerate([P["kirmizi"], P["mavi"], P["altin"], P["yesil"], P["kirmizi"]])))

async def ciz():
    from playwright.async_api import async_playwright
    async with async_playwright() as p:
        b = await p.chromium.launch(); pg = await b.new_page(viewport={"width": W, "height": H})
        for ad, s in S.items():
            await pg.set_content(f'<html><body style="margin:0">{s}</body></html>'); await pg.screenshot(path=f"{OUT}/{ad}.png")
        await b.close()
asyncio.run(ciz()); print(len(S), "sahne")
