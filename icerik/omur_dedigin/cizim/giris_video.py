# Ömür Dediğin: ilk 5 saniyelik hareketli giriş (kodla çizim, 25 fps). python3 giris_video.py <çıktı.mp4>
import sys, math, asyncio, subprocess, os, tempfile
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import importlib.util
spec = importlib.util.spec_from_file_location("s", os.path.join(os.path.dirname(os.path.abspath(__file__)), "sahneler.py"))
OUT = sys.argv[1]; sys.argv = [sys.argv[0], tempfile.mkdtemp()]
# yalnız yardımcıları al (sahneleri çizmeden)
src = open(spec.origin).read().split("S = {}")[0]
G = {}; exec(src, G)
P, W, H = G["P"], G["W"], G["H"]
ev, cocuk, minare, kubbe, bulut, yer, doku, bitir = (G[k] for k in ("ev", "cocuk", "minare", "kubbe", "bulut", "yer", "doku", "bitir"))
FPS, SN = 25, 5.0
def lerp(a, b, t): return a + (b - a) * t
def kos(x, y, olc, renk, t, faz):  # koşan çocuk: bacak ve kol salınımı
    a = math.sin(t * 14 + faz) * 22
    return (f'<g transform="translate({x},{y}) scale({olc})"><circle cx="0" cy="-118" r="22" fill="{P["kum"]}" stroke="{P["koyu"]}" stroke-width="3"/><path d="M-22,-124 Q0,-150 22,-124 Z" fill="{P["koyu"]}"/>'
            f'<rect x="-20" y="-96" width="40" height="52" rx="10" fill="{renk}" stroke="{P["koyu"]}" stroke-width="3"/>'
            f'<line x1="-8" y1="-44" x2="{-8 - a*0.7}" y2="0" stroke="{P["koyu"]}" stroke-width="9" stroke-linecap="round"/><line x1="8" y1="-44" x2="{8 + a*0.7}" y2="0" stroke="{P["koyu"]}" stroke-width="9" stroke-linecap="round"/>'
            f'<line x1="-18" y1="-88" x2="{-30 + a}" y2="-58" stroke="{P["kum"]}" stroke-width="8" stroke-linecap="round"/><line x1="18" y1="-88" x2="{30 - a}" y2="-58" stroke="{P["kum"]}" stroke-width="8" stroke-linecap="round"/></g>')
def kare(t):
    p = t / SN
    ust = "#%02x%02x%02x" % (int(lerp(0xbc, 0xe9, p)), int(lerp(0xd3, 0xa3, p)), int(lerp(0xcc, 0x5b, p)))
    s = f'<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="{ust}"/><stop offset="1" stop-color="#f4d6a0"/></linearGradient>{doku()}</defs><rect width="{W}" height="{H}" fill="url(#g)"/>'
    s += f'<circle cx="1500" cy="{lerp(330, 560, p)}" r="120" fill="#f7c66b" opacity="0.9"/>'
    s += bulut(lerp(200, 420, p), 170) + bulut(lerp(1200, 1380, p), 130, 1.2)
    for i in range(4):  # kuşlar
        bx, by = lerp(-100, 2000, (p * 0.8 + i * 0.07) % 1.2), 220 + i * 25 + 10 * math.sin(t * 6 + i)
        k = 14 * math.sin(t * 10 + i)
        s += f'<path d="M{bx-24},{by} Q{bx-12},{by-10-k} {bx},{by} Q{bx+12},{by-10-k} {bx+24},{by}" stroke="{P["koyu"]}" stroke-width="4" fill="none"/>'
    s += minare(1380, 640, 380) + kubbe(1620, 640, 140)
    s += ev(80, 470, 330, 260, P["krem2"], isik=p > 0.6) + ev(450, 500, 280, 230, "#e7c690", P["toprak"], isik=p > 0.6) + ev(780, 480, 300, 250, P["krem2"], isik=p > 0.6)
    for i in range(3):  # bacadan duman
        dy = (t * 40 + i * 50) % 150
        s += f'<circle cx="{560 + 10*math.sin(t*2+i)}" cy="{430 - dy}" r="{14 + dy*0.12}" fill="#f6efe2" opacity="{max(0, 0.6 - dy/250)}"/>'
    s += yer(730, P["kum"])
    # çember çeviren çocuk + koşanlar (soldan sağa)
    cx = lerp(-150, 1250, p)
    s += kos(cx, 930, 1.6, P["kirmizi"], t, 0) + f'<circle cx="{cx+95}" cy="890" r="44" fill="none" stroke="{P["koyu"]}" stroke-width="6"/><line x1="{cx+30}" y1="840" x2="{cx+80}" y2="880" stroke="{P["kahve"]}" stroke-width="6"/>'
    s += kos(lerp(-400, 1000, p), 945, 1.5, P["mavi"], t, 1.3) + kos(lerp(-600, 820, p), 950, 1.45, P["yesil"], t, 2.1)
    # uçurtma
    ux, uy = 600 + 60 * math.sin(t * 1.3), 300 + 30 * math.sin(t * 2)
    s += f'<path d="M{ux},{uy-50} L{ux+40},{uy} L{ux},{uy+60} L{ux-40},{uy} Z" fill="{P["kirmizi"]}" stroke="{P["koyu"]}" stroke-width="3"/><path d="M{ux},{uy+60} Q{ux+40},{uy+140} {lerp(-400,1000,p)+30},{860}" stroke="{P["koyu"]}" stroke-width="2" fill="none"/>'
    z = 1 + 0.06 * p  # yavaş kamera yaklaşması
    ic = f'<g transform="translate({W/2},{H/2}) scale({z}) translate({-W/2},{-H/2})">{s}</g>'
    return f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}">{ic}{bitir()}</svg>'
async def main():
    from playwright.async_api import async_playwright
    d = tempfile.mkdtemp()
    async with async_playwright() as pw:
        b = await pw.chromium.launch(); pg = await b.new_page(viewport={"width": W, "height": H})
        for i in range(int(FPS * SN)):
            await pg.set_content(f'<html><body style="margin:0">{kare(i / FPS)}</body></html>'); await pg.screenshot(path=f"{d}/{i:04d}.png")
        await b.close()
    subprocess.run(["ffmpeg", "-y", "-v", "error", "-framerate", str(FPS), "-i", f"{d}/%04d.png", "-c:v", "libx264", "-crf", "18", "-pix_fmt", "yuv420p", OUT], check=True)
    print("tamam", OUT)
asyncio.run(main())
