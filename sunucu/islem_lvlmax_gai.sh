#!/bin/bash
# Tampon bölge: LVL MAX "Gerçek mi AI mı?" sinematik deneme videosu.
# Gerçek klipler: Pixabay (lisanslı, kasa anahtarı pixabay_anahtari; AI etiketli klipler elenir).
# AI klipler: plan dosyasındaki Higgsfield çıktıları. Kurgu: sunucu/lvlmax/kurgu_gai.py
# Yalnız /opt/tampon/lvlmax içinde çalışır; anahtar ekrana/günlüğe basılmaz.
set -u
P=${P:-p02}; KOK=/opt/tampon/lvlmax/$P; rm -rf $KOK/kaynak; mkdir -p $KOK/kaynak $KOK/cikti /opt/tampon/disari
PL=/tmp/aesun_paket/sunucu/lvlmax/${P}_plan.json; [ -f $PL ] || { echo "NOT: HATA plan yok"; exit 1; }
cp $PL $KOK/plan.json
command -v fc-list >/dev/null && fc-list | grep -qi dejavu || { apt-get install -y -qq fonts-dejavu-core >/dev/null 2>&1 && echo "NOT: font kuruldu"; }
PIX=$(/opt/aesun/kasa_coz.sh pixabay_anahtari 2>/dev/null || true)
[ -n "$PIX" ] || { echo "NOT: HATA pixabay anahtarı kasada yok"; exit 1; }
export PIX KOK
python3 - <<'PY' || exit 1
import json, os, urllib.request, urllib.parse
KOK = os.environ["KOK"]; key = os.environ["PIX"]
plan = json.load(open(f"{KOK}/plan.json", encoding="utf-8"))
YASAK = ("ai", "ai generated", "ai-generated", "generated", "generative", "artificial intelligence", "midjourney",
         "sora", "veo", "kling", "runway", "render", "3d", "cgi", "animation", "animated", "digital art", "illustration")
secim = []
def indir(url, yol):
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=180) as r, open(yol, "wb") as f:
        f.write(r.read())
for s in plan["seviye"]:
    indir(s["ai_url"], f"{KOK}/kaynak/{s['ai']}.mp4")
    q = urllib.parse.urlencode({"key": key, "q": s["sorgu"], "per_page": 40, "safesearch": "true", "order": "popular"})
    with urllib.request.urlopen(f"https://pixabay.com/api/videos/?{q}", timeout=60) as r:
        hits = json.load(r).get("hits", [])
    aday = []
    for h in hits:
        tags = [t.strip().lower() for t in h.get("tags", "").split(",")]
        if any(t in YASAK for t in tags) or h.get("duration", 0) < 6:
            continue
        v = h["videos"].get("large") or {}
        if not v.get("url") or v.get("width", 0) < 1280:
            v = h["videos"].get("medium") or {}
        if not v.get("url"):
            continue
        aday.append((h, v))
    if not aday:
        print(f"NOT: HATA {s['no']}: uygun gerçek klip yok ({s['sorgu']})"); raise SystemExit(1)
    h, v = aday[0]
    indir(v["url"], f"{KOK}/kaynak/{s['gercek']}.mp4")
    secim.append({"no": s["no"], "pixabay_id": h["id"], "sayfa": h["pageURL"], "yukleyen": h["user"], "etiketler": h["tags"]})
    print(f"NOT: seviye {s['no']} gerçek: pixabay {h['id']} ({h['user']}) · {v.get('width')}x{v.get('height')}")
json.dump(secim, open(f"{KOK}/cikti/kaynaklar.json", "w"), ensure_ascii=False, indent=1)
PY
unset PIX
cd $KOK
python3 /tmp/aesun_paket/sunucu/lvlmax/kurgu_gai.py plan.json kaynak cikti/${P}_onizleme.mp4 1 || exit 1
python3 /tmp/aesun_paket/sunucu/lvlmax/kurgu_gai.py plan.json kaynak cikti/${P}_1080.mp4 || exit 1
ls -la cikti | awk '{print "NOT: " $5 " " $9}' | tail -3
tar czf /opt/tampon/disari/lvlmax_gai.tgz -C $KOK/cikti ${P}_onizleme.mp4 ${P}_1080.mp4 kaynaklar.json
echo "NOT: önizleme hazır"
