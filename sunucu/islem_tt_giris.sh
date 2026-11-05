#!/bin/bash
# TikTok sunucu oturumu: QR ile giriş (şifre yok). Yalıtılmış kapsayıcıda tarayıcı açılır, TikTok'un QR kodu
# /opt/aesun/tiktok/qr.png'ye yazılır; Ömer telefondaki TikTok uygulamasıyla okutunca oturum /opt/aesun/tiktok/profil'de kalır.
# Port açmaz, sır yazdırmaz. Diğer uygulamalara dokunmaz.
set -u
KOK=/opt/aesun/tiktok; IMAJ=mcr.microsoft.com/playwright/python:v1.47.0-jammy
mkdir -p "$KOK/profil" "$KOK/is"; chmod 700 "$KOK"; rm -f "$KOK/qr.png" "$KOK/giris.json"
docker image inspect "$IMAJ" >/dev/null 2>&1 || docker pull -q "$IMAJ" >/dev/null 2>&1 || { echo "NOT: HATA tarayıcı imajı indirilemedi"; exit 1; }
cat > "$KOK/giris.py" <<'PY'
import json, time, os, sys, traceback
K = "/work"
def yaz0(d): json.dump(d, open(f"{K}/giris.json", "w"), ensure_ascii=False)
yaz0({"ok": False, "durum": "tarayıcı açılıyor"})
try:
    from playwright.sync_api import sync_playwright
except Exception as e:
    yaz0({"ok": False, "durum": f"playwright yok: {e}"}); raise
def yaz(d): json.dump(d, open(f"{K}/giris.json.tmp", "w"), ensure_ascii=False); os.replace(f"{K}/giris.json.tmp", f"{K}/giris.json")
with sync_playwright() as p:
    ctx = p.chromium.launch_persistent_context(f"{K}/profil", headless=True, locale="tr-TR", timezone_id="Europe/Istanbul",
        viewport={"width": 1280, "height": 900}, user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
        args=["--disable-blink-features=AutomationControlled"])
    pg = ctx.pages[0] if ctx.pages else ctx.new_page()
    def oturum_var(): return any(c["name"] == "sessionid" for c in ctx.cookies("https://www.tiktok.com"))
    if oturum_var():
        pg.goto("https://www.tiktok.com/tiktokstudio/content", wait_until="domcontentloaded", timeout=60000); time.sleep(4)
        if "login" not in pg.url:
            yaz({"ok": True, "zaten": True, "url": pg.url}); print("NOT: oturum zaten açık"); ctx.close(); raise SystemExit(0)
    pg.goto("https://www.tiktok.com/login/qrcode?lang=tr-TR", wait_until="domcontentloaded", timeout=60000)
    time.sleep(6)
    basla = time.time(); son = 0
    yaz({"ok": False, "durum": "QR bekleniyor", "baslangic": basla})
    while time.time() - basla < 420:
        if oturum_var():
            time.sleep(3); pg.goto("https://www.tiktok.com/tiktokstudio/content", wait_until="domcontentloaded", timeout=60000); time.sleep(4)
            yaz({"ok": True, "url": pg.url}); print("NOT: TikTok oturumu açıldı"); break
        if time.time() - son > 15:
            try:
                # QR kutusu süresi dolduysa yenile düğmesi çıkar
                for sec in ("text=Yenile", "text=Refresh", "[data-e2e='qr-refresh']"):
                    if pg.locator(sec).count(): pg.locator(sec).first.click(); time.sleep(2); break
                qr = pg.locator("canvas, img[src^='data:image'], [data-e2e='qrcode']").first
                (qr.screenshot(path=f"{K}/qr.png.tmp") if qr.count() else pg.screenshot(path=f"{K}/qr.png.tmp"))
                os.replace(f"{K}/qr.png.tmp", f"{K}/qr.png"); son = time.time()
                yaz({"ok": False, "durum": "QR hazır", "qr_zaman": son, "url": pg.url})
            except Exception as e:
                yaz({"ok": False, "durum": f"QR alınamadı: {type(e).__name__}", "url": pg.url}); son = time.time()
        time.sleep(3)
    else:
        yaz({"ok": False, "durum": "süre doldu (7 dk), QR okutulmadı"}); print("NOT: süre doldu")
    ctx.close()
PY
docker rm -f tampon-tiktok >/dev/null 2>&1
docker run -d --name tampon-tiktok --memory 2048m --cpus 2 --pids-limit 256 --security-opt no-new-privileges \
  -v "$KOK":/work -w /work "$IMAJ" bash -c "python3 -c 'import playwright' 2>/dev/null || pip install -q playwright==1.47.0; python3 /work/giris.py" >/dev/null && echo "NOT: tarayıcı başladı, QR bekleniyor"
