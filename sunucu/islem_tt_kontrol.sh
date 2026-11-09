#!/bin/bash
# TikTok sunucu oturumu kontrolü: tt-tarayici kapsayıcısındaki Chromium'a (CDP 9222) bağlanır, TikTok Studio içerik sayfasını açar,
# hesap adını ve son gönderileri okur; ekran görüntüsünü /opt/aesun/tiktok/kontrol.png'ye yazar. Sır yazdırmaz.
set -u
KOK=/opt/aesun/tiktok; IMAJ=mcr.microsoft.com/playwright/python:v1.47.0-jammy
docker ps --format '{{.Names}}' | grep -q '^tt-tarayici$' || { echo "NOT: HATA tt-tarayici çalışmıyor"; exit 1; }
cat > "$KOK/kontrol.py" <<'PY'
import json, time
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    b = p.chromium.connect_over_cdp("http://127.0.0.1:9222")
    ctx = b.contexts[0]; pg = ctx.new_page()
    pg.goto("https://www.tiktok.com/tiktokstudio/content", wait_until="domcontentloaded", timeout=60000); time.sleep(8)
    pg.screenshot(path="/work/kontrol.png")
    t = pg.inner_text("body")[:3000]
    giris = "login" not in pg.url and ("Gönderiler" in t or "Posts" in t or "Yükle" in t)
    sat = [l.strip() for l in t.splitlines() if l.strip()]
    print("NOT: oturum", "AÇIK" if giris else "KAPALI", "·", pg.url[:80])
    for l in sat[:40]: print("NOT: |", l[:100])
    pg.close()
PY
docker run --rm --cpus 2 --memory 2g --network container:tt-tarayici -v "$KOK":/work "$IMAJ" bash -c "python3 -c 'import playwright' 2>/dev/null || pip install -q playwright==1.47.0; python3 /work/kontrol.py" 2>&1 | grep "^NOT:" | head -45
