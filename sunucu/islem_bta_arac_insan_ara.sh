#!/bin/bash
# BTA: Sketchfab'da indirilebilir, web'de kullanılabilir lisanslı (CC0 / CC-BY / CC-BY-SA) gerçekçi araç ve insan modelleri arar.
# Salt okuma: yalnız arama yapar, listeyi /opt/tampon/bta/modeller/arac_insan_aday.json'a yazar. Anahtar ekrana basılmaz.
set -uo pipefail
D=/opt/tampon/bta/modeller; mkdir -p $D
K=$(/opt/aesun/kasa_coz.sh sketchfab_api 2>/dev/null) || { echo "NOT: HATA kasada sketchfab_api yok"; exit 1; }
python3 - "$D/arac_insan_aday.json" <<'PY'
import json, sys, urllib.request, urllib.parse
out = sys.argv[1]
Q = {
 "arac": (["realistic sedan car", "suv car", "hatchback car", "station wagon car", "family car realistic"], 120000),
 "insan": (["realistic man standing", "realistic woman standing", "people scan photogrammetry", "casual man 3d scan", "woman walking", "child standing"], 90000),
}
ok = {"cc0", "by", "by-sa"}
res = {}
for k, (qs, maxf) in Q.items():
    seen, items = set(), []
    for q in qs:
        for lic in ("by", "cc0"):
            u = "https://api.sketchfab.com/v3/search?" + urllib.parse.urlencode({"type": "models", "q": q, "downloadable": "true", "license": lic, "sort_by": "-likeCount", "count": 24, "max_face_count": maxf})
            try:
                d = json.load(urllib.request.urlopen(u, timeout=30))
            except Exception as e:
                print("NOT: arama hatası", k, q, str(e)[:80]); continue
            for m in d.get("results", []):
                if m["uid"] in seen: continue
                L = (m.get("license") or {}).get("slug") or lic
                if L not in ok: continue
                seen.add(m["uid"])
                items.append({"uid": m["uid"], "ad": m["name"][:60], "yazar": m["user"]["username"], "lisans": L, "yuz": m.get("faceCount"),
                              "begeni": m.get("likeCount"), "anim": m.get("animationCount", 0), "q": q,
                              "resim": max((m.get("thumbnails") or {}).get("images", [{}]), key=lambda i: i.get("width", 0)).get("url", "")})
    items.sort(key=lambda x: -(x["begeni"] or 0))
    res[k] = items[:40]
    print(f"NOT: {k}: {len(items)} aday")
    for it in items[:40]:
        print(f"NOT: {k} | {it['uid']} | {it['ad']} | {it['yazar']} | {it['lisans']} | {it['yuz']} yüz | {it['begeni']} beğeni | anim {it['anim']} | {it['q']}")
json.dump(res, open(out, "w"), ensure_ascii=False, indent=1)
PY
