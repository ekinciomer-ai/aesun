#!/bin/bash
# TikTok yükleme kuyruğu (sunucudan, bilgisayar gerekmez). tt-tarayici kapsayıcısındaki oturumla (CDP 9222) TikTok Studio'ya yükler ve planlar.
# Paket: kuyruk/<kod>.json (+ kuyruk/<kod>.mp4 ya da /opt/aesun/youtube/medya/<kod>.mp4)
#   json: {"kod","metin","planla":"2026-11-06T12:30","sentetik":true,"kapak":"<kod>_kapak.jpg" (opsiyonel)}
# Kurallar: aynı kod daha önce yüklendiyse atlar (/opt/aesun/tiktok/yuklenen.json); TikTok'u hiçbir uygulamaya API ile bağlamaz.
# Çıktı: '===TT===' ... '===SON===' JSON; adım görüntüleri /opt/aesun/tiktok/adim/<kod>_N.png (hata ayıklama için).
set -u
KOK=/opt/aesun/tiktok; IMAJ=mcr.microsoft.com/playwright/python:v1.47.0-jammy
mkdir -p "$KOK/adim" "$KOK/is"; rm -f "$KOK/is/"*
docker ps --format '{{.Names}}' | grep -q '^tt-tarayici$' || { echo "NOT: HATA tt-tarayici çalışmıyor"; echo "===TT==="; echo "[]"; echo "===SON==="; exit 1; }
cp kuyruk/* "$KOK/is/" 2>/dev/null
for j in "$KOK"/is/*.json; do [ -f "$j" ] || continue; k=$(basename "$j" .json); [ -f "$KOK/is/$k.mp4" ] || cp "/opt/aesun/youtube/medya/$k.mp4" "$KOK/is/$k.mp4" 2>/dev/null; done
cat > "$KOK/yukle.py" <<'PY'
import json, time, glob, os, re, sys
from datetime import datetime
from playwright.sync_api import sync_playwright
K = "/work"; IS = f"{K}/is"
yuk_yol = f"{K}/yuklenen.json"
yuklenen = json.load(open(yuk_yol, encoding="utf-8")) if os.path.exists(yuk_yol) else {}
sonuc = []
def ss(pg, kod, n):
    try: pg.screenshot(path=f"{K}/adim/{kod}_{n}.png")
    except Exception: pass
def tikla_metin(pg, metinler, zaman=4000):
    for m in metinler:
        try:
            loc = pg.get_by_text(m, exact=False).first
            if loc.count(): loc.click(timeout=zaman); return m
        except Exception: pass
    return None
with sync_playwright() as p:
    b = p.chromium.connect_over_cdp("http://127.0.0.1:9222"); ctx = b.contexts[0]
    for jf in sorted(glob.glob(f"{IS}/*.json")):
        it = json.load(open(jf, encoding="utf-8")); kod = it["kod"]; mp4 = f"{IS}/{kod}.mp4"
        if kod in yuklenen:
            sonuc.append({"kod": kod, "durum": "zaten yüklü", **yuklenen[kod]}); continue
        if not os.path.exists(mp4):
            sonuc.append({"kod": kod, "durum": "HATA video dosyası yok"}); continue
        pg = ctx.new_page()
        try:
            pg.set_viewport_size({"width": 1400, "height": 1000})
            pg.goto("https://www.tiktok.com/tiktokstudio/upload?from=webapp", wait_until="domcontentloaded", timeout=60000)
            inp = None
            for _ in range(30):   # dosya girişi hangi çerçevede olursa olsun bul
                for fr in pg.frames:
                    try:
                        if fr.locator("input[type=file]").count(): inp = fr.locator("input[type=file]").first; break
                    except Exception: pass
                if inp: break
                time.sleep(2)
            if not inp: raise RuntimeError("dosya girişi bulunamadı")
            inp.set_input_files(mp4, timeout=60000)
            for _ in range(60):   # yükleme bitsin (açıklama editörü gelir)
                if pg.locator("[contenteditable=true]").count(): break
                time.sleep(3)
            time.sleep(5); ss(pg, kod, 1)
            def kapat_popup():
                for _ in range(3):
                    if not tikla_metin(pg, ["Anladım", "Got it", "Tamam", "Kapat", "Daha sonra", "Not now"], 1500): break
                    time.sleep(1)
            kapat_popup()
            # açıklama
            ed = pg.locator("[contenteditable=true]").first; ed.scroll_into_view_if_needed(); ed.click(timeout=10000); time.sleep(1)
            pg.evaluate("""() => { const e=document.querySelector('[contenteditable=true]'); e.focus(); const s=getSelection(); s.selectAllChildren(e); }""")
            pg.keyboard.press("Delete"); time.sleep(0.5)
            pg.evaluate("""(t) => { const e=document.querySelector('[contenteditable=true]'); e.focus(); const dt=new DataTransfer(); dt.setData('text/plain', t);
                                   e.dispatchEvent(new ClipboardEvent('paste', {clipboardData: dt, bubbles: true, cancelable: true})); }""", it["metin"])
            time.sleep(2); ss(pg, kod, 2)
            # kapak (opsiyonel)
            kapak = it.get("kapak") and f"{IS}/{it['kapak']}"
            if kapak and os.path.exists(kapak):
                try:
                    tikla_metin(pg, ["Kapağı düzenle", "Edit cover"]); time.sleep(2)
                    pg.locator("input[type=file]").last.set_input_files(kapak); time.sleep(4)
                    tikla_metin(pg, ["Kaydet", "Save"]); time.sleep(2)
                except Exception: pass
            kapat_popup(); tikla_metin(pg, ["Daha fazla göster", "Show more"]); time.sleep(1)
            # Planla seçeneği (radyo)
            try: pg.get_by_text("Planla", exact=True).first.click(timeout=4000)
            except Exception: pg.locator("text=Planla").first.click(timeout=4000)
            time.sleep(1.5); tikla_metin(pg, ["İzin ver", "Allow"], 2000)
            # Yapay zekâ etiketi
            if it.get("sentetik"):
                try:
                    etiket = pg.get_by_text("AI ile oluşturulmuş içerik", exact=True).first
                    kutu = etiket.locator("xpath=ancestor::div[.//*[@role='switch'] or .//input[@type='checkbox'] or .//*[contains(@class,'witch')]][1]")
                    sw = kutu.locator("[role=switch], input[type=checkbox], [class*=witch]").first
                    if sw.count():
                        if (sw.get_attribute("aria-checked") or "false") != "true":
                            sw.click(timeout=3000, force=True); time.sleep(1.5)
                            try: pg.get_by_role("button", name=re.compile(r"^(Aç|Turn on)$")).first.click(timeout=3000)
                            except Exception: tikla_metin(pg, ["Aç", "Turn on"], 2000)
                    else:
                        # yedek: etiketin sağındaki anahtara koordinatla tıkla
                        bb = etiket.bounding_box(); pg.mouse.click(bb["x"] + bb["width"] + 28, bb["y"] + bb["height"] / 2); time.sleep(1.5)
                        try: pg.get_by_role("button", name=re.compile(r"^(Aç|Turn on)$")).first.click(timeout=3000)
                        except Exception: pass
                except Exception as e:
                    print(f"NOT: {kod} AI etiketi işaretlenemedi: {type(e).__name__}")
            ss(pg, kod, 3)
            # tarih / saat
            t = datetime.fromisoformat(it["planla"]); gun, saat, dk = t.day, f"{t.hour:02d}", f"{t.minute:02d}"
            time.sleep(1); ss(pg, kod, 31)
            tarih = pg.locator("input[value^='20']").first if pg.locator("input[value^='20']").count() else pg.get_by_text(re.compile(r"^20\d\d-\d\d-\d\d$")).first
            tarih.click(timeout=5000); time.sleep(1.5); ss(pg, kod, 32)
            pg.get_by_text(str(gun), exact=True).last.click(timeout=4000); time.sleep(1)
            saatk = pg.locator("input[value*=':']").first if pg.locator("input[value*=':']").count() else pg.get_by_text(re.compile(r"^\d\d:\d\d$")).first
            saatk.click(timeout=5000); time.sleep(1.5); ss(pg, kod, 33)
            try:
                pg.get_by_text(saat, exact=True).first.scroll_into_view_if_needed(); pg.get_by_text(saat, exact=True).first.click(timeout=3000); time.sleep(0.5)
                pg.get_by_text(dk, exact=True).last.scroll_into_view_if_needed(); pg.get_by_text(dk, exact=True).last.click(timeout=3000)
            except Exception: pass
            time.sleep(1); pg.mouse.click(10, 300); ss(pg, kod, 4)
            # kontroller bitsin
            for _ in range(40):
                if pg.locator("text=Sorun tespit edilmedi").count() >= 1 or pg.locator("text=No issues detected").count() >= 1: break
                time.sleep(3)
            time.sleep(2)
            # Planla düğmesi (sayfanın altındaki birincil)
            kapat_popup()
            btn = pg.get_by_role("button", name=re.compile(r"^(Planla|Schedule)$")).last; btn.scroll_into_view_if_needed(); btn.click(timeout=5000); time.sleep(4)
            if tikla_metin(pg, ["İptal", "Cancel"], 2000):
                time.sleep(8); btn.click(timeout=5000); time.sleep(4)
            ss(pg, kod, 5)
            # doğrula
            pg.goto("https://www.tiktok.com/tiktokstudio/content", wait_until="domcontentloaded", timeout=60000); time.sleep(8)
            govde = pg.inner_text("body"); ilk = it["metin"][:25]
            ok = ilk in govde
            ss(pg, kod, 6)
            if ok:
                yuklenen[kod] = {"planla": it["planla"], "zaman": datetime.now().isoformat(timespec="minutes")}
                json.dump(yuklenen, open(yuk_yol, "w", encoding="utf-8"), ensure_ascii=False)
                sonuc.append({"kod": kod, "durum": "yüklendi ve planlandı", "planla": it["planla"]}); print(f"NOT: {kod} TikTok'a planlandı {it['planla']}")
            else:
                sonuc.append({"kod": kod, "durum": "DOĞRULANAMADI (içerik listesinde görünmedi)"}); print(f"NOT: {kod} doğrulanamadı")
        except Exception as e:
            ss(pg, kod, 9); sonuc.append({"kod": kod, "durum": f"HATA {type(e).__name__}: {str(e)[:120]}"}); print(f"NOT: HATA {kod} {type(e).__name__}")
        finally:
            try: pg.close()
            except Exception: pass
print("===TT==="); print(json.dumps(sonuc, ensure_ascii=False)); print("===SON===")
PY
docker run --rm --cpus 2 --memory 2g --network container:tt-tarayici -v "$KOK":/work "$IMAJ" bash -c "python3 -c 'import playwright' 2>/dev/null || pip install -q playwright==1.47.0; python3 /work/yukle.py" 2>&1 | grep -v "^\s*$"
rm -f "$KOK/is/"*.mp4
