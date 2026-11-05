#!/bin/bash
# TikTok: planlı/yayında gönderiyi "Yalnızca ben"e alır (silmez). Hedef: /tmp paketindeki hedef.txt (açıklamanın ilk kelimeleri) ya da ortam TT_HEDEF.
set -u
KOK=/opt/aesun/tiktok; IMAJ=mcr.microsoft.com/playwright/python:v1.47.0-jammy
HEDEF="${TT_HEDEF:-$(cat sunucu/tt_hedef.txt 2>/dev/null)}"; [ -n "$HEDEF" ] || { echo "NOT: HATA hedef yok"; exit 1; }
docker ps --format '{{.Names}}' | grep -q '^tt-tarayici$' || { echo "NOT: HATA tt-tarayici çalışmıyor"; exit 1; }
printf '%s' "$HEDEF" > "$KOK/hedef.txt"
cat > "$KOK/gizle.py" <<'PY'
import time, re
from playwright.sync_api import sync_playwright
H = open("/work/hedef.txt", encoding="utf-8").read().strip()
with sync_playwright() as p:
    b = p.chromium.connect_over_cdp("http://127.0.0.1:9222"); ctx = b.contexts[0]; pg = ctx.new_page()
    pg.set_viewport_size({"width": 1400, "height": 1000})
    pg.goto("https://www.tiktok.com/tiktokstudio/content", wait_until="domcontentloaded", timeout=60000); time.sleep(8)
    satir = pg.get_by_text(H, exact=False).first.locator("xpath=ancestor::*[.//button or .//*[@role='button']][1]")
    if not satir.count(): print("NOT: gönderi bulunamadı"); raise SystemExit(1)
    # satırdaki gizlilik açılır kutusu (Herkes) → Yalnızca ben
    try:
        secici = satir.get_by_text(re.compile(r"^(Herkes|Everyone)$")).first
        if secici.count():
            secici.click(timeout=4000); time.sleep(1.5)
            pg.get_by_text(re.compile(r"^(Yalnızca ben|Only me|Sadece ben)$")).first.click(timeout=4000); time.sleep(2)
            for m in ("Onayla", "Kaydet", "Confirm", "Save"):
                try: pg.get_by_role("button", name=m).first.click(timeout=1500); time.sleep(1); break
                except Exception: pass
    except Exception as e:
        print(f"NOT: satır içi seçici olmadı: {type(e).__name__}")
    pg.goto("https://www.tiktok.com/tiktokstudio/content", wait_until="domcontentloaded", timeout=60000); time.sleep(6)
    satir = pg.get_by_text(H, exact=False).first.locator("xpath=ancestor::*[.//button or .//*[@role='button']][1]")
    t = satir.inner_text() if satir.count() else ""
    pg.screenshot(path="/work/adim/gizle.png")
    print("NOT: sonuç:", " | ".join(x.strip() for x in t.splitlines() if x.strip())[:200])
    pg.close()
PY
docker run --rm --network container:tt-tarayici -v "$KOK":/work "$IMAJ" bash -c "python3 -c 'import playwright' 2>/dev/null || pip install -q playwright==1.47.0; python3 /work/gizle.py" 2>&1 | grep "^NOT:"
