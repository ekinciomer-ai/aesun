#!/bin/bash
# TikTok: planlı gönderiyi SİLER. Yalnız Ömer'in açık onayıyla çalıştırılır (sunucu/tt_hedef.txt: açıklamanın başı). Tek gönderi, tam eşleşme.
set -u
KOK=/opt/aesun/tiktok; IMAJ=mcr.microsoft.com/playwright/python:v1.47.0-jammy
HEDEF="$(cat sunucu/tt_hedef.txt 2>/dev/null)"; [ -n "$HEDEF" ] || { echo "NOT: HATA hedef yok"; exit 1; }
docker ps --format '{{.Names}}' | grep -q '^tt-tarayici$' || { echo "NOT: HATA tt-tarayici çalışmıyor"; exit 1; }
printf '%s' "$HEDEF" > "$KOK/hedef.txt"
cat > "$KOK/sil.py" <<'PY'
import time, re
from playwright.sync_api import sync_playwright
H = open("/work/hedef.txt", encoding="utf-8").read().strip()
with sync_playwright() as p:
    b = p.chromium.connect_over_cdp("http://127.0.0.1:9222"); ctx = b.contexts[0]; pg = ctx.new_page()
    pg.set_viewport_size({"width": 1400, "height": 1000})
    pg.goto("https://www.tiktok.com/tiktokstudio/content", wait_until="domcontentloaded", timeout=60000); time.sleep(8)
    es = pg.get_by_text(H, exact=False)
    if es.count() != 1: print(f"NOT: HATA eşleşme sayısı {es.count()} (tam 1 olmalı)"); raise SystemExit(1)
    hucre = es.first.locator("xpath=ancestor::*[contains(@class,'row') or contains(@class,'Row') or self::tr][1]")
    hucre.hover(); time.sleep(1); n = hucre.locator("svg").count()
    hucre.locator("svg").nth(n - 1).click(timeout=5000, force=True); time.sleep(2)
    pg.get_by_text(re.compile(r"^(Sil|Delete)$")).first.click(timeout=5000); time.sleep(2); pg.screenshot(path="/work/adim/sil_1.png")
    for m in (r"^(Sil|Delete|Onayla|Confirm)$",):
        try: pg.get_by_role("button", name=re.compile(m)).last.click(timeout=4000); time.sleep(4)
        except Exception as e: print(f"NOT: onay düğmesi: {type(e).__name__}")
    pg.goto("https://www.tiktok.com/tiktokstudio/content", wait_until="domcontentloaded", timeout=60000); time.sleep(6)
    print("NOT: silindi" if pg.get_by_text(H, exact=False).count() == 0 else "NOT: hâlâ listede")
    pg.screenshot(path="/work/adim/sil_2.png"); pg.close()
PY
docker run --rm --network container:tt-tarayici -v "$KOK":/work "$IMAJ" bash -c "python3 -c 'import playwright' 2>/dev/null || pip install -q playwright==1.47.0; python3 /work/sil.py" 2>&1 | grep "^NOT:"
