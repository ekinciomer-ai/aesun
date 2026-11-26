#!/bin/bash
# SALT OKUNUR: canlı davalar dizinini kapsayıcı içinde çözüp grup/gkod yapısını özetler.
# Hiçbir şey yazmaz/silmez; evrak içeriği basılmaz; yalnız sayım + not dosyası listesi.
set -euo pipefail
D=/opt/aesun/ozel/davalar; S="$D/sunum"
[ -s "$D/anahtar.bin" ] || { echo "NOT: HATA dava anahtarı yok"; exit 1; }
[ -f "$S/dizin.sifreli" ] || { echo "NOT: HATA dizin yok"; exit 1; }
T=$(mktemp -d /root/davalar_yapi.XXXXXX); trap 'rm -rf "$T"' EXIT
cat > "$T/yapi.py" <<'P'
import json
from pathlib import Path
from collections import OrderedDict
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
a = AESGCM(Path("/k").read_bytes()[:32])
b = Path("/sunum/dizin.sifreli").read_bytes()
veri = json.loads(a.decrypt(b[:12], b[12:], None))
davalar = veri.get("davalar", [])
grp = OrderedDict()
gkodsuz = []
for d in davalar:
    g = d.get("grup") or "(grup yok)"
    gk = d.get("gkod") or ""
    ev = sum(len(k.get("evraklar", [])) for k in d.get("klasorler", []))
    key = (g, gk)
    if key not in grp:
        grp[key] = {"dava": 0, "evrak": 0, "ornek": []}
    grp[key]["dava"] += 1
    grp[key]["evrak"] += ev
    if len(grp[key]["ornek"]) < 3:
        grp[key]["ornek"].append((d.get("baslik") or "")[:40])
    if not gk:
        gkodsuz.append((d.get("baslik") or "")[:40])
out = {"toplam_dava": len(davalar), "toplam_evrak": sum(s["evrak"] for s in grp.values()),
       "gruplar": [{"grup": g, "gkod": gk, "dava": s["dava"], "evrak": s["evrak"], "ornek": s["ornek"]}
                   for (g, gk), s in grp.items()],
       "gkodsuz_dava_sayisi": len(gkodsuz)}
print(json.dumps(out, ensure_ascii=False))
P
chmod -R a+rX "$T/yapi.py"
IMG=$(docker inspect -f '{{.Image}}' aesun-api)
OUT=$(docker run --rm --network none --user 1001 -v "$D/anahtar.bin":/k:ro -v "$S":/sunum:ro -v "$T/yapi.py":/y.py:ro "$IMG" python /y.py)
echo "NOT: YAPI $OUT"
echo "NOT: NOTLAR $(ls "$D" 2>/dev/null | grep -iE 'brifing|yorumlar|bekleyen' | tr '\n' ' ')"
