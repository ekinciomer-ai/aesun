#!/bin/bash
# TikTok QR ile giriş — kalıcı tarayıcının (tt-tarayici[-H]) KENDİ profiline. Port açmaz, şifre yok.
# Tarayıcı iç ağda çalışmıyorsa başlatır; CDP ile login/qrcode sayfasını açar, QR'ı 15 sn'de bir $KOK/qr.png'ye yazar (7 dk).
# Durum: $KOK/giris.json  ({"ok":true} = oturum açıldı). TT_HESAP=yr → @yolu.se.
set -u
H=${TT_HESAP:-}; KOK=/opt/aesun/tiktok${H:+_$H}; KAP=tt-tarayici${H:+-$H}; IMAJ=mcr.microsoft.com/playwright/python:v1.47.0-jammy
mkdir -p "$KOK"; chmod 700 "$KOK"; rm -f "$KOK/qr.png" "$KOK/giris.json"
if ! docker ps --format '{{.Names}}' | grep -qx "$KAP"; then
  TT_HESAP=$H bash "$(dirname "$0")/islem_tt_tarayici.sh" kapat || { echo "NOT: HATA $KAP başlatılamadı"; exit 1; }
  sleep 20
fi
docker image inspect "$IMAJ" >/dev/null 2>&1 || docker pull -q "$IMAJ" >/dev/null 2>&1
cat > "$KOK/qr.py" <<'PY'
import json, time, os
from playwright.sync_api import sync_playwright
K = "/work"
def yaz(d): json.dump(d, open(f"{K}/giris.json.tmp", "w"), ensure_ascii=False); os.replace(f"{K}/giris.json.tmp", f"{K}/giris.json")
yaz({"ok": False, "durum": "bağlanıyor"})
with sync_playwright() as p:
    b = None
    for _ in range(12):
        try: b = p.chromium.connect_over_cdp("http://127.0.0.1:9222", timeout=15000); break
        except Exception: time.sleep(5)
    if not b: yaz({"ok": False, "durum": "tarayıcıya bağlanılamadı"}); raise SystemExit(1)
    ctx = b.contexts[0]
    def oturum_var(): return any(c["name"] == "sessionid" for c in ctx.cookies("https://www.tiktok.com"))
    pg = ctx.new_page(); pg.set_viewport_size({"width": 1280, "height": 900})
    if oturum_var():
        pg.goto("https://www.tiktok.com/tiktokstudio/content", wait_until="domcontentloaded", timeout=60000); time.sleep(5)
        if "login" not in pg.url: yaz({"ok": True, "zaten": True}); print("NOT: oturum zaten açık"); pg.close(); raise SystemExit(0)
    pg.goto("https://www.tiktok.com/login/qrcode?lang=tr-TR", wait_until="domcontentloaded", timeout=60000); time.sleep(6)
    basla = time.time(); son = 0; yenile = time.time()
    while time.time() - basla < 600:
        if oturum_var():
            time.sleep(3); pg.goto("https://www.tiktok.com/tiktokstudio/content", wait_until="domcontentloaded", timeout=60000); time.sleep(5)
            yaz({"ok": True, "url": pg.url[:80]}); print("NOT: TikTok oturumu açıldı"); break
        if time.time() - son > 10:
            try:
                # QR'ı gereksiz yenileme: yalnız 100 sn'de bir sayfayı tazele (TikTok kodu ~2 dk geçerli)
                govde = pg.inner_text("body")[:4000].lower()
                pg.screenshot(path=f"{K}/sayfa.png")
                if any(x in govde for x in ("süresi doldu", "expired", "süresi geçti")) or time.time() - yenile > 300:
                    pg.goto("https://www.tiktok.com/login/qrcode?lang=tr-TR", wait_until="domcontentloaded", timeout=60000); time.sleep(6); yenile = time.time()
                qr = pg.locator("[data-e2e='qrcode-image'], canvas, img[src^='data:image']").first
                (qr.screenshot(path=f"{K}/qr.tmp.png") if qr.count() else pg.screenshot(path=f"{K}/qr.tmp.png"))
                os.replace(f"{K}/qr.tmp.png", f"{K}/qr.png"); son = time.time()
                yaz({"ok": False, "durum": "QR hazır", "qr_zaman": son})
            except Exception as e:
                yaz({"ok": False, "durum": f"QR alınamadı: {type(e).__name__}"}); son = time.time()
        time.sleep(3)
    else:
        yaz({"ok": False, "durum": "süre doldu (7 dk), QR okutulmadı"})
    pg.close()
PY
docker rm -f "tampon-qr${H:+-$H}" >/dev/null 2>&1
docker run -d --name "tampon-qr${H:+-$H}" --cpus 2 --memory 1536m --network container:$KAP -v "$KOK":/work "$IMAJ" \
  bash -c "python3 -c 'import playwright' 2>/dev/null || pip install -q playwright==1.47.0; python3 /work/qr.py" >/dev/null && echo "NOT: QR süreci başladı ($KAP)"
