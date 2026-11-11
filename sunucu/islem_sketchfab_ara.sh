#!/bin/bash
# Kozmos Lab · Midong filmi: Sketchfab'da indirilebilir, ticari kullanıma uygun (CC0 / CC-BY / CC-BY-SA) 3D model arar.
# Salt okuma: yalnız arama yapar, sonuç listesini /opt/tampon/kozmos/modeller/aday.json'a yazar. Anahtar ekrana basılmaz.
set -uo pipefail
D=/opt/tampon/kozmos/modeller; mkdir -p $D
K=$(/opt/aesun/kasa_coz.sh sketchfab_api 2>/dev/null) || { echo "NOT: HATA kasada sketchfab_api yok"; exit 1; }
[ -n "$K" ] || { echo "NOT: HATA anahtar boş"; exit 1; }
code=$(curl -s -o /dev/null -w '%{http_code}' -H "Authorization: Token $K" https://api.sketchfab.com/v3/me)
echo "NOT: anahtar kontrolü HTTP $code"
python3 - "$D/aday.json" <<'PY'
import json, sys, urllib.request, urllib.parse
out = sys.argv[1]
Q = {
 "kazik_makinesi": ["pile driver", "piling rig", "pile driving machine"],
 "paletli_vinc": ["crawler crane", "mobile crane"],
 "tir": ["semi truck trailer", "flatbed truck"],
 "isci": ["construction worker", "worker hard hat"],
 "trafo": ["power transformer", "electrical substation"],
 "forklift": ["telehandler", "forklift"],
 "ekskavator": ["excavator"],
 "pikap": ["pickup truck"],
}
ok = {"cc0", "by", "by-sa"}
res = {}
for k, qs in Q.items():
    seen, items = set(), []
    for q in qs:
        for lic in ("by", "cc0", "by-sa"):
            u = "https://api.sketchfab.com/v3/search?" + urllib.parse.urlencode({"type": "models", "q": q, "downloadable": "true", "license": lic, "sort_by": "-likeCount", "count": 24})
            try:
                d = json.load(urllib.request.urlopen(u, timeout=30))
            except Exception as e:
                print("NOT: arama hatası", k, q, str(e)[:80]); continue
            for m in d.get("results", []):
                if m["uid"] in seen: continue
                L = (m.get("license") or {}).get("slug") or lic
                if L not in ok: continue
                seen.add(m["uid"])
                items.append({"uid": m["uid"], "ad": m["name"][:70], "yazar": m["user"]["username"], "lisans": L,
                              "yuz": m.get("faceCount"), "begeni": m.get("likeCount"), "url": m.get("viewerUrl"),
                              "anim": m.get("animationCount", 0)})
    items.sort(key=lambda x: -(x["begeni"] or 0))
    res[k] = items[:12]
    print(f"NOT: {k}: {len(items)} aday; ilk 5:")
    for it in items[:5]:
        print(f"NOT:   {it['uid']} | {it['ad']} | {it['yazar']} | {it['lisans']} | {it['yuz']} yüz | {it['begeni']} beğeni | anim {it['anim']}")
json.dump(res, open(out, "w"), ensure_ascii=False, indent=1)
PY
echo "NOT: liste $D/aday.json"
