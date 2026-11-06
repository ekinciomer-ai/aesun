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
    # planlı gönderide satır içi seçici kapalı → düzenle (kalem) sayfasından gizlilik değiştir
    try:
        hucre = pg.get_by_text(H, exact=False).first.locator("xpath=ancestor::*[contains(@class,'row') or contains(@class,'Row') or self::tr][1]")
        if not hucre.count(): hucre = satir
        print("NOT: satırda düğme:", hucre.locator("button").count(), "svg:", hucre.locator("svg").count())
        hucre.hover(); time.sleep(1)
        n = hucre.locator("svg").count()
        hucre.locator("svg").nth(max(0, n - 4)).click(timeout=5000, force=True); time.sleep(6); pg.screenshot(path="/work/adim/gizle_1.png")
        print("NOT: url:", pg.url[:120])
        if "content" in pg.url and not pg.get_by_text(re.compile(r"kimler görebilir|Who can watch")).count():
            # düzenleme açılmadı: son ikon (…) menüsünü dene ve seçenekleri yaz
            hucre.locator("svg").nth(n - 1).click(timeout=5000, force=True); time.sleep(2); pg.screenshot(path="/work/adim/gizle_1b.png")
            print("NOT: menü:", " | ".join(x.strip() for x in pg.inner_text("body").splitlines() if x.strip())[-400:])
            try: pg.get_by_text(re.compile(r"^(Düzenle|Edit)$")).first.click(timeout=3000); time.sleep(6)
            except Exception: pass
        metin = pg.inner_text("body"); print("NOT: sayfa:", " | ".join(x.strip() for x in metin.splitlines() if x.strip())[:600])
        kutu = pg.get_by_text(re.compile(r"^(Herkes|Everyone)$")).first
        kutu.click(timeout=5000); time.sleep(1.5)
        pg.get_by_text(re.compile(r"^(Yalnızca ben|Only me|Sadece ben)$")).first.click(timeout=5000); time.sleep(1.5); pg.screenshot(path="/work/adim/gizle_2.png")
        for m in (r"^(Kaydet|Save|Güncelle|Update|Planla|Schedule)$",):
            try: pg.get_by_role("button", name=re.compile(m)).last.click(timeout=4000); time.sleep(4); break
            except Exception as e: print(f"NOT: kaydet düğmesi: {type(e).__name__}")
        for m in ("Onayla", "Confirm", "Evet", "Tamam"):
            try: pg.get_by_role("button", name=m).first.click(timeout=1500); time.sleep(2); break
            except Exception: pass
        pg.screenshot(path="/work/adim/gizle_3.png")
    except Exception as e:
        print(f"NOT: düzenleme sayfası: {type(e).__name__}: {str(e)[:100]}"); pg.screenshot(path="/work/adim/gizle_9.png")
    pg.goto("https://www.tiktok.com/tiktokstudio/content", wait_until="domcontentloaded", timeout=60000); time.sleep(6)
    satir = pg.get_by_text(H, exact=False).first.locator("xpath=ancestor::*[.//button or .//*[@role='button']][1]")
    t = satir.inner_text() if satir.count() else ""
    pg.screenshot(path="/work/adim/gizle.png")
    print("NOT: sonuç:", " | ".join(x.strip() for x in t.splitlines() if x.strip())[:200])
    pg.close()
PY
docker run --rm --network container:tt-tarayici -v "$KOK":/work "$IMAJ" bash -c "python3 -c 'import playwright' 2>/dev/null || pip install -q playwright==1.47.0; python3 /work/gizle.py" 2>&1 | grep "^NOT:"
