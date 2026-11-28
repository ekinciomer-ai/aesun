#!/bin/bash
# SALT OKUNUR: son restic kopyalarında davalar dizinindeki grupları (gkod, dava, evrak) listeler.
# MEDAŞ / diğer davalar gruplarının hangi kopyada var olduğunu bulmak için. Canlıya hiçbir şey yazmaz.
set -euo pipefail
D=/opt/aesun/ozel/davalar; S="$D/sunum"
export RESTIC_REPOSITORY=/var/yedek/restic RESTIC_PASSWORD_FILE=/opt/aesun/sir/restic.pass
T=$(mktemp -d /root/grp_bak.XXXXXX); trap 'rm -rf "$T"' EXIT
cat > "$T/b.py" <<'P'
import json,sys
from pathlib import Path
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
a = AESGCM(Path("/k").read_bytes()[:32])
b = Path("/eski/dizin.sifreli").read_bytes(); v = json.loads(a.decrypt(b[:12], b[12:], None))
g = {}
for d in v.get("davalar", []):
    k = d.get("gkod") or "-"; x = g.setdefault(k, [0, 0, d.get("grup", "")[:30]]); x[0] += 1
    x[1] += sum(len(kl.get("evraklar", [])) for kl in d.get("klasorler", []))
print(" ".join("%s:%d/%d" % (k, x[0], x[1]) for k, x in g.items()))
P
chmod -R a+rX "$T"
IMG=$(docker inspect -f '{{.Image}}' aesun-api)
restic snapshots --json 2>/dev/null | python3 -c 'import sys,json;L=json.load(sys.stdin);L=[s for s in L if s["time"][:10]>="2026-11-20"];L.sort(key=lambda s:s["time"]);print("\n".join(s["short_id"]+" "+s["time"][:16] for s in L))' > "$T/liste"
echo "NOT: KOPYA_SAYISI $(wc -l < "$T/liste")"
while read -r SID ZAMAN; do
  O="$T/r_$SID"; restic restore "$SID" --target "$O" --include "$S/dizin.sifreli" >/dev/null 2>&1 || true
  if [ -f "$O$S/dizin.sifreli" ]; then
    echo "NOT: $ZAMAN $SID $(docker run --rm --network none --user 1001 -v "$D/anahtar.bin":/k:ro -v "$O$S":/eski:ro -v "$T/b.py":/b.py:ro "$IMG" python /b.py 2>&1 | tail -1)"
  else echo "NOT: $ZAMAN $SID dizin yok"; fi
  rm -rf "$O"
done < "$T/liste"
echo "NOT: CANLI_NOTLAR $(ls "$S" | grep -v '^e$' | grep -v dizin | tr '\n' ' ')"
