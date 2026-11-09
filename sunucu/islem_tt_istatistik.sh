#!/bin/bash
# TikTok istatistik (salt okunur): sunucudaki oturumla Studio içerik listesini okur; her gönderi için izlenme/beğeni/yorum ve
# hesap 7 günlük özetini '===TT===' ... '===SON===' JSON olarak verir. Yayın Takibi'ne (yayin.json) tt_istatistik.yml işler.
set -u
KOK=/opt/aesun/tiktok; IMAJ=mcr.microsoft.com/playwright/python:v1.47.0-jammy
docker ps --format '{{.Names}}' | grep -q '^tt-tarayici$' || { echo "NOT: HATA tt-tarayici çalışmıyor"; echo "===TT==="; echo "{}"; echo "===SON==="; exit 1; }
cat > "$KOK/istatistik.py" <<'PY'
import time, re, json
from playwright.sync_api import sync_playwright
AY = {"Oca":1,"Şub":2,"Mar":3,"Nis":4,"May":5,"Haz":6,"Tem":7,"Ağu":8,"Eyl":9,"Eki":10,"Kas":11,"Ara":12}
def sat(pg): return [l.strip() for l in pg.inner_text("body").splitlines() if l.strip()]
out = {"gonderiler": [], "hesap": {}}
with sync_playwright() as p:
    b = p.chromium.connect_over_cdp("http://127.0.0.1:9222", timeout=30000); ctx = b.contexts[0]; pg = ctx.new_page()
    pg.set_viewport_size({"width": 1400, "height": 1600})
    pg.goto("https://www.tiktok.com/tiktokstudio/content", wait_until="domcontentloaded", timeout=60000); time.sleep(10)
    for _ in range(6):   # listeyi sonuna kadar kaydır (sayfalama/yükleme)
        pg.mouse.wheel(0, 3000); time.sleep(2)
    s = sat(pg)
    # kalıp: <süre 00:xx> <açıklama> <"6 Kas, 18:00"> <Herkes|Yalnızca ben|...> <izlenme> <beğeni> <yorum>
    i = 0
    while i < len(s) - 6:
        if re.fullmatch(r"\d\d:\d\d", s[i]) and re.fullmatch(r"\d{1,2} \w{3}, \d\d:\d\d", s[i+2]) and all(re.fullmatch(r"[\d.,KMB]+", s[i+k]) for k in (4,5,6)):
            m = re.match(r"(\d{1,2}) (\w{3}), (\d\d:\d\d)", s[i+2]); g, a, saat = int(m.group(1)), AY.get(m.group(2), 0), m.group(3)
            def n(x):
                x = x.replace(",", "."); 
                try: return int(float(x[:-1]) * {"K":1e3,"M":1e6,"B":1e9}[x[-1]]) if x[-1] in "KMB" else int(float(x))
                except Exception: return None
            out["gonderiler"].append({"sure": s[i], "metin": s[i+1][:120], "gun": g, "ay": a, "saat": saat, "gizlilik": s[i+3], "izlenme": n(s[i+4]), "begeni": n(s[i+5]), "yorum": n(s[i+6])})
            i += 7
        else: i += 1
    pg.goto("https://www.tiktok.com/tiktokstudio/analytics", wait_until="domcontentloaded", timeout=60000); time.sleep(8)
    s = sat(pg)
    for ad, anahtar in (("Video Görüntülemeleri","izlenme_7g"),("Profil Görüntülemeleri","profil_7g"),("Beğeniler","begeni_7g"),("Takipçiler","takipci")):
        for k, l in enumerate(s):
            if l == ad and k + 1 < len(s) and re.fullmatch(r"[\d.,KMB-]+", s[k+1]): out["hesap"][anahtar] = s[k+1]; break
    pg.close()
print(f"NOT: {len(out['gonderiler'])} gönderi okundu · hesap 7 gün: {out['hesap']}")
print("===TT==="); print(json.dumps(out, ensure_ascii=False)); print("===SON===")
PY
docker run --rm --cpus 2 --memory 2g --network container:tt-tarayici -v "$KOK":/work "$IMAJ" bash -c "python3 -c 'import playwright' 2>/dev/null || pip install -q playwright==1.47.0; python3 /work/istatistik.py" 2>&1 | grep -v "pip\|^\s*$"
