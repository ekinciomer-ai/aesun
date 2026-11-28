#!/bin/bash
# SALT OKUNUR: 27.11.2026 09:43 'davalar_yukle' öncesi restic kopyasında Depolama grubunun durumunu inceler.
# Canlı sunuma hiçbir şey yazmaz; kopya geçici klasöre açılır, özet basılır, klasör silinir.
set -euo pipefail
D=/opt/aesun/ozel/davalar; S="$D/sunum"
export RESTIC_REPOSITORY=/var/yedek/restic RESTIC_PASSWORD_FILE=/opt/aesun/sir/restic.pass
echo "NOT: KOPYALAR $(restic snapshots --json 2>/dev/null | python3 -c 'import sys,json;L=json.load(sys.stdin);print(" ".join(s["short_id"]+"@"+s["time"][:16]+"#"+",".join(s.get("tags") or []) for s in L if "2026-11-26T12"<=s["time"][:13]<="2026-11-27T10"))')"
SNAP=$(restic snapshots --json 2>/dev/null | python3 -c 'import sys,json,datetime as t
L=json.load(sys.stdin); K=t.datetime(2026,11,27,9,43,tzinfo=t.timezone.utc)
f=lambda s: t.datetime.fromisoformat(s["time"][:19]+s["time"][-6:] if s["time"][-6] in "+-" else s["time"][:19]+"+00:00")
L=[s for s in L if f(s)<K]; L.sort(key=f); print(L[-1]["short_id"] if L else "")')
[ -n "$SNAP" ] || { echo "NOT: HATA uygun kopya yok"; exit 1; }
echo "NOT: SECILEN $SNAP"
T=$(mktemp -d /root/dep_bak.XXXXXX); trap 'rm -rf "$T"' EXIT
restic restore "$SNAP" --target "$T" --include "$S/dizin.sifreli" --include "$S/depolama_yorumlar.sifreli" --include "$S/depolama_bekleyen.sifreli" >/dev/null 2>&1 || true
O="$T$S"
ls "$O" >/dev/null 2>&1 || { echo "NOT: HATA kopyada sunum yok"; exit 1; }
echo "NOT: KOPYADA $(ls "$O" | tr '\n' ' ')"
cat > "$T/b.py" <<'P'
import json
from pathlib import Path
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
a = AESGCM(Path("/k").read_bytes()[:32])
def coz(p): b = Path(p).read_bytes(); return json.loads(a.decrypt(b[:12], b[12:], None))
eski = coz("/eski/dizin.sifreli"); yeni = coz("/sunum/dizin.sifreli")
dep = [d for d in eski.get("davalar", []) if d.get("gkod") == "depolama"]
ids = [e.get("id") for d in dep for k in d.get("klasorler", []) for e in k.get("evraklar", [])]
var = sum(1 for i in ids if Path("/sunum/e/%s.sifreli" % i).is_file())
print(json.dumps({"eski_toplam_dava": len(eski.get("davalar", [])), "eski_toplam_evrak": len(eski.get("evrak", {})),
  "depolama_dava": [(d.get("baslik") or "")[:45] for d in dep], "depolama_evrak": len(ids),
  "evrak_dosyasi_canlida_var": var, "canli_dava": len(yeni.get("davalar", [])), "canli_evrak": len(yeni.get("evrak", {}))}, ensure_ascii=False))
P
chmod -R a+rX "$T"
IMG=$(docker inspect -f '{{.Image}}' aesun-api)
echo "NOT: KARSILASTIRMA $(docker run --rm --network none --user 1001 -v "$D/anahtar.bin":/k:ro -v "$S":/sunum:ro -v "$O":/eski:ro -v "$T/b.py":/b.py:ro "$IMG" python /b.py)"
echo "NOT: CANLI_NOTLAR $(ls "$S" | grep -E '^depolama_' | tr '\n' ' ')"
