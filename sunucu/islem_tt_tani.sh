#!/bin/bash
# TikTok dağıtım tanısı (salt okunur): herkese açık profilde görünen videolar ve izlenmeleri; Studio'da son 3 yayındaki videonun
# analiz/durum metni (Senin İçin uygunluğu, inceleme, ihlal uyarısı). Hiçbir şeyi değiştirmez; sır yazdırmaz.
set -u
KOK=/opt/aesun/tiktok; IMAJ=mcr.microsoft.com/playwright/python:v1.47.0-jammy
docker ps --format '{{.Names}}' | grep -q '^tt-tarayici$' || { echo "NOT: HATA tt-tarayici çalışmıyor"; exit 1; }
mkdir -p "$KOK/adim"
cat > "$KOK/tani.py" <<'PY'
import time, re, json
from playwright.sync_api import sync_playwright
AN = re.compile(r"uygun değil|not eligible|inceleme|under review|ihlal|violat|kaldırıld|removed|Senin İçin|For You|kısıtl|restrict|görünürlük|visibility|topluluk|community", re.I)
def satirlar(pg): return [l.strip() for l in pg.inner_text("body").splitlines() if l.strip()]
with sync_playwright() as p:
    b = p.chromium.connect_over_cdp("http://127.0.0.1:9222", timeout=30000); ctx = b.contexts[0]; pg = ctx.new_page()
    pg.set_viewport_size({"width": 1400, "height": 1000})
    # 1) herkese açık profil
    pg.goto("https://www.tiktok.com/@antikstudyo", wait_until="domcontentloaded", timeout=60000); time.sleep(8)
    pg.screenshot(path="/work/adim/tani_profil.png")
    s = satirlar(pg); print("NOT: profil:", " | ".join(s[:25])[:600])
    vids = pg.locator("a[href*='/video/']"); n = vids.count(); print(f"NOT: profilde video bağlantısı: {n}")
    for i in range(min(n, 12)):
        try: print("NOT: video", vids.nth(i).get_attribute("href").split("/video/")[-1][:20], "|", vids.nth(i).inner_text().replace("\n", " ")[:60])
        except Exception: pass
    # 2) Studio: hesap durumu / bildirimler
    for u in ("https://www.tiktok.com/tiktokstudio/content", "https://www.tiktok.com/tiktokstudio/analytics"):
        pg.goto(u, wait_until="domcontentloaded", timeout=60000); time.sleep(8)
        s = satirlar(pg); ilg = [l for l in s if AN.search(l)]
        print(f"NOT: {u.split('/')[-1]} uyarı:", " | ".join(ilg)[:500] or "yok")
        if u.endswith("analytics"): print("NOT: analiz özeti:", " | ".join(s[:40])[:700])
    # 3) son 3 yayındaki videonun analiz sayfası
    pg.goto("https://www.tiktok.com/tiktokstudio/content", wait_until="domcontentloaded", timeout=60000); time.sleep(8)
    links = pg.locator("a[href*='/video/']"); hs = []
    for i in range(links.count()):
        h = links.nth(i).get_attribute("href") or ""
        if h not in hs: hs.append(h)
    print(f"NOT: içerik sayfasında video bağlantısı: {len(hs)}")
    for h in hs[:6]:
        vid = h.split("/video/")[-1].split("?")[0]
        pg.goto(f"https://www.tiktok.com/tiktokstudio/analytics/video/{vid}", wait_until="domcontentloaded", timeout=60000); time.sleep(8)
        s = satirlar(pg); ilg = [l for l in s if AN.search(l)]
        print(f"NOT: video {vid[:19]}:", " | ".join(s[:30])[:400])
        if ilg: print(f"NOT: video {vid[:19]} uyarı:", " | ".join(ilg)[:300])
    pg.screenshot(path="/work/adim/tani_son.png"); pg.close()
PY
docker run --rm --cpus 2 --memory 2g --network container:tt-tarayici -v "$KOK":/work "$IMAJ" bash -c "python3 -c 'import playwright' 2>/dev/null || pip install -q playwright==1.47.0; python3 /work/tani.py" 2>&1 | awk '/^NOT:/{print; next} {print "NOT: çıktı: " substr($0,1,200)}'
