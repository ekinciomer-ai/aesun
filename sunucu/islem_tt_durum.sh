#!/bin/bash
# TikTok hesap durumu (salt okunur): Studio/ayarlar sayfalarında hesap durumu, ihlal, kısıtlama metnini okur. Değişiklik yapmaz.
set -u
KOK=/opt/aesun/tiktok; IMAJ=mcr.microsoft.com/playwright/python:v1.47.0-jammy
docker ps --format '{{.Names}}' | grep -q '^tt-tarayici$' || { echo "NOT: HATA tt-tarayici çalışmıyor"; exit 1; }
cat > "$KOK/durum.py" <<'PY'
import time, re
from playwright.sync_api import sync_playwright
AN = re.compile(r"durum|status|ihlal|violat|kısıt|restrict|askı|suspend|yasak|ban|inceleme|review|uyarı|warning|şüpheli|suspicious|otomatik|automat|doğrula|verif|topluluk|community|takip|follow", re.I)
with sync_playwright() as p:
    b = p.chromium.connect_over_cdp("http://127.0.0.1:9222", timeout=30000); ctx = b.contexts[0]; pg = ctx.new_page()
    pg.set_viewport_size({"width": 1400, "height": 1200})
    for u in ("https://www.tiktok.com/tiktokstudio/account-status", "https://www.tiktok.com/tiktokstudio/creator-center/account-status",
              "https://www.tiktok.com/setting?activeTab=account", "https://www.tiktok.com/tiktokstudio/inbox", "https://www.tiktok.com/tiktokstudio"):
        try:
            pg.goto(u, wait_until="domcontentloaded", timeout=60000); time.sleep(7)
            s = [l.strip() for l in pg.inner_text("body").splitlines() if l.strip()]
            ilg = [l for l in s if AN.search(l) and len(l) < 160]
            print(f"NOT: {u.split('.com/')[-1][:40]} → {pg.url.split('.com/')[-1][:50]} · " + (" | ".join(ilg)[:600] or "ilgili metin yok"))
            pg.screenshot(path=f"/work/adim/durum_{abs(hash(u))%1000}.png")
        except Exception as e: print(f"NOT: {u[-30:]} HATA {type(e).__name__}")
    pg.close()
PY
docker run --rm --network container:tt-tarayici -v "$KOK":/work "$IMAJ" bash -c "python3 -c 'import playwright' 2>/dev/null || pip install -q playwright==1.47.0; python3 /work/durum.py" 2>&1 | grep "^NOT:"
