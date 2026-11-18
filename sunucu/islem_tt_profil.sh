#!/bin/bash
# TikTok profil güncelleme (ad, biyografi, profil fotoğrafı) — o hesabın kalıcı tarayıcısındaki oturumla.
# Girdi: profil.json {"ad","bio","logo_url"(opsiyonel)} aynı klasörde. TT_HESAP=yr → @yolu.se.
# Önce/sonra ekran görüntüleri $KOK/adim/profil_*.png. Sır yazdırmaz.
set -u
H=${TT_HESAP:-}; KOK=/opt/aesun/tiktok${H:+_$H}; KAP=tt-tarayici${H:+-$H}; IMAJ=mcr.microsoft.com/playwright/python:v1.47.0-jammy
docker ps --format '{{.Names}}' | grep -qx "$KAP" || { echo "NOT: HATA $KAP çalışmıyor"; exit 1; }
mkdir -p "$KOK/adim"; rm -f "$KOK"/adim/profil_*
cp "$(dirname "$0")/profil.json" "$KOK/profil.json"
U=$(python3 -c "import json;print(json.load(open('$KOK/profil.json')).get('logo_url',''))")
rm -f "$KOK/profil_logo.jpg"; [ -n "$U" ] && curl -sSL --max-time 30 -o "$KOK/profil_logo.jpg" "$U" && echo "NOT: logo indirildi ($(stat -c %s $KOK/profil_logo.jpg) bayt)"
cat > "$KOK/profil.py" <<'PY'
import json, time, os
from playwright.sync_api import sync_playwright
K = "/work"; P = json.load(open(f"{K}/profil.json", encoding="utf-8"))
def ss(pg, n): pg.screenshot(path=f"{K}/adim/profil_{n}.jpg", type="jpeg", quality=55)
with sync_playwright() as p:
    b = p.chromium.connect_over_cdp("http://127.0.0.1:9222", timeout=30000); ctx = b.contexts[0]; pg = ctx.new_page()
    pg.set_viewport_size({"width": 1280, "height": 1000})
    pg.goto("https://www.tiktok.com/profile", wait_until="domcontentloaded", timeout=60000); time.sleep(8)
    print("NOT: profil sayfası", pg.url[:60]); ss(pg, "1_once")
    btn = pg.locator("[data-e2e='edit-profile-entrance'], button:has-text('Profili düzenle'), button:has-text('Edit profile')").first
    btn.click(timeout=15000); time.sleep(4); ss(pg, "2_pencere")
    if os.path.exists(f"{K}/profil_logo.jpg"):
        fi = pg.locator("input[type='file']").first
        fi.set_input_files(f"{K}/profil_logo.jpg"); time.sleep(5); ss(pg, "3_kirp")
        for t in ("Uygula", "Apply", "Kaydet"):
            loc = pg.get_by_role("button", name=t)
            if loc.count(): loc.last.click(); time.sleep(4); print("NOT: fotoğraf kırpma onaylandı"); break
    for el in pg.locator("input, textarea, [contenteditable='true']").all()[:40]:
        try: print("NOT: ÖĞE", el.evaluate("e=>e.tagName+' '+(e.type||'')+' e2e='+(e.getAttribute('data-e2e')||'')+' ph='+(e.placeholder||'')+' val='+(e.value||e.innerText||'').slice(0,30)"))
        except Exception: pass
    if P.get("bio"):
        bio = pg.locator("textarea[data-e2e='edit-profile-bio-input'], [data-e2e='edit-profile-bio-input'] textarea").first
        bio.fill(P["bio"], timeout=10000); print("NOT: biyografi yazıldı")
    if P.get("ad"):
        try:
            ad = pg.locator("input[data-e2e='edit-profile-name-input'], [data-e2e='edit-profile-name-input'] input, input[placeholder='Ad'], input[placeholder='Name']").first
            if ad.input_value(timeout=4000) != P["ad"]: ad.fill(P["ad"], timeout=6000); print("NOT: ad yazıldı")
            else: print("NOT: ad zaten doğru")
        except Exception as e: print("NOT: ad alanı bulunamadı, atlandı", type(e).__name__)
    time.sleep(2); ss(pg, "4_dolu")
    kaydet = pg.locator("[data-e2e='edit-profile-save']").first
    if not kaydet.count(): kaydet = pg.get_by_role("button", name="Kaydet").last
    kaydet.click(timeout=15000); time.sleep(6); ss(pg, "5_kaydedildi")
    pg.reload(wait_until="domcontentloaded"); time.sleep(6); ss(pg, "6_sonra")
    t = pg.inner_text("body")
    print("NOT: kontrol ad:", P.get("ad","") in t, "bio:", P.get("bio","")[:25] in t)
    pg.close()
PY
docker run --rm --cpus 2 --memory 2g --network container:$KAP -v "$KOK":/work "$IMAJ" bash -c "python3 -c 'import playwright' 2>/dev/null || pip install -q playwright==1.47.0; python3 /work/profil.py" 2>&1 | grep -E "^NOT:|Error|Timeout" | head -50
