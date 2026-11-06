#!/bin/bash
# TikTok bağlantısına sunucu oturumuyla bakar (salt okunur): hesap, açıklama, ses adı. sunucu/tt_bak.txt içindeki adres.
set -u
KOK=/opt/aesun/tiktok; IMAJ=mcr.microsoft.com/playwright/python:v1.47.0-jammy
docker ps --format '{{.Names}}' | grep -q '^tt-tarayici$' || { echo "NOT: HATA tt-tarayici çalışmıyor"; exit 1; }
cp sunucu/tt_bak.txt "$KOK/bak.txt"
cat > "$KOK/bak.py" <<'PY'
import time, re, json
from playwright.sync_api import sync_playwright
U = open("/work/bak.txt").read().strip()
with sync_playwright() as p:
    b = p.chromium.connect_over_cdp("http://127.0.0.1:9222", timeout=30000); ctx = b.contexts[0]; pg = ctx.new_page()
    pg.goto(U, wait_until="domcontentloaded", timeout=60000); time.sleep(8)
    print("NOT: url:", pg.url[:160])
    s = [l.strip() for l in pg.inner_text("body").splitlines() if l.strip()]
    print("NOT: metin:", " | ".join(s[:60])[:1500])
    for sel in ("[data-e2e='browse-music']", "[data-e2e='video-music']", "a[href*='/music/']"):
        try:
            if pg.locator(sel).count(): print("NOT: ses:", pg.locator(sel).first.inner_text()[:200], "|", pg.locator(sel).first.get_attribute("href"))
        except Exception: pass
    pg.screenshot(path="/work/adim/bak.png"); pg.close()
PY
docker run --rm --network container:tt-tarayici -v "$KOK":/work "$IMAJ" bash -c "python3 -c 'import playwright' 2>/dev/null || pip install -q playwright==1.47.0; python3 /work/bak.py" 2>&1 | grep "^NOT:"
