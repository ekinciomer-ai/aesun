#!/bin/bash
# TikTok: planlı gönderiyi SİLER. Yalnız Ömer'in açık onayıyla çalıştırılır (sunucu/tt_hedef.txt: açıklamanın başı). Tek gönderi, tam eşleşme.
# Tüm çıktı NOT: satırı olarak akar (hata ayıklama için); görüntüler /opt/aesun/tiktok/adim/sil_*.png
set -u
KOK=/opt/aesun/tiktok; IMAJ=mcr.microsoft.com/playwright/python:v1.47.0-jammy
HEDEF="$(cat sunucu/tt_hedef.txt 2>/dev/null)"; [ -n "$HEDEF" ] || { echo "NOT: HATA hedef yok"; exit 1; }
docker ps --format '{{.Names}}' | grep -q '^tt-tarayici$' || { echo "NOT: HATA tt-tarayici çalışmıyor"; exit 1; }
mkdir -p "$KOK/adim"; printf '%s' "$HEDEF" > "$KOK/hedef.txt"
cat > "$KOK/sil.py" <<'PY'
import time, re, traceback
from playwright.sync_api import sync_playwright
H = open("/work/hedef.txt", encoding="utf-8").read().strip()
pg = None
def ss(n):
    try: pg.screenshot(path=f"/work/adim/sil_{n}.png")
    except Exception: pass
try:
    with sync_playwright() as p:
        b = p.chromium.connect_over_cdp("http://127.0.0.1:9222", timeout=30000); ctx = b.contexts[0]; pg = ctx.new_page()
        pg.set_viewport_size({"width": 1400, "height": 1000})
        pg.goto("https://www.tiktok.com/tiktokstudio/content", wait_until="domcontentloaded", timeout=60000); time.sleep(10)
        ss(0)
        es = pg.get_by_text(H, exact=False)
        n_es = es.count(); print(f"NOT: eşleşme {n_es} (url {pg.url})")
        if n_es < 1: print("NOT: HATA hedef listede yok"); raise SystemExit(1)
        # satır: eylem simgelerini (… menüsü) içeren en yakın ata; tt_gizle denemesinde 2 düğme / 7 svg'li satır doğruydu
        hucre = None
        for k in range(1, 9):
            a = es.first.locator(f"xpath=ancestor::*[{k}]")
            try: n = a.locator("svg").count()
            except Exception: n = 0
            if n >= 4: hucre = a; break
        if hucre is None: print("NOT: HATA satır bulunamadı"); ss(8); raise SystemExit(1)
        hucre.hover(); time.sleep(1); n = hucre.locator("svg").count(); print(f"NOT: satırda {n} simge (ata {k})")
        hucre.locator("svg").nth(n - 1).click(timeout=5000, force=True); time.sleep(2); ss(1)
        menu = " | ".join(x.strip() for x in pg.inner_text("body").splitlines() if x.strip())[-120:]; print(f"NOT: menü: {menu}")
        pg.get_by_text(re.compile(r"^\s*(Sil|Delete)\s*$")).last.click(timeout=5000); time.sleep(2); ss(2)
        try: pg.get_by_role("button", name=re.compile(r"^(Sil|Delete|Onayla|Confirm)$")).last.click(timeout=4000); time.sleep(4)
        except Exception as e: print(f"NOT: onay düğmesi: {type(e).__name__}")
        ss(3)
        pg.goto("https://www.tiktok.com/tiktokstudio/content", wait_until="domcontentloaded", timeout=60000); time.sleep(8)
        print("NOT: silindi" if pg.get_by_text(H, exact=False).count() == 0 else "NOT: hâlâ listede")
        ss(4); pg.close()
except SystemExit: raise
except Exception as e:
    print(f"NOT: HATA {type(e).__name__}: {str(e)[:200]}"); ss(9); traceback.print_exc(); raise SystemExit(1)
PY
docker run --rm --network container:tt-tarayici -v "$KOK":/work "$IMAJ" bash -c "python3 -c 'import playwright' 2>/dev/null || pip install -q playwright==1.47.0; python3 /work/sil.py" 2>&1 \
  | awk '/^NOT:/{print; next} {print "NOT: çıktı: " substr($0,1,200)}'
exit "${PIPESTATUS[0]}"
