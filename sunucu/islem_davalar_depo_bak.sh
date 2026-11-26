#!/bin/bash
# SALT OKUNUR: depolama grubu davalarının yapısını (esas/baslik/klasör adları/evrak sayısı) özetler. Evrak içeriği basılmaz.
set -euo pipefail
D=/opt/aesun/ozel/davalar; S="$D/sunum"
[ -s "$D/anahtar.bin" ] || { echo "NOT: HATA anahtar yok"; exit 1; }
T=$(mktemp -d /root/davalar_depo.XXXXXX); trap 'rm -rf "$T"' EXIT
cat > "$T/d.py" <<'P'
import json
from pathlib import Path
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
a=AESGCM(Path("/k").read_bytes()[:32]); b=Path("/sunum/dizin.sifreli").read_bytes()
v=json.loads(a.decrypt(b[:12],b[12:],None))
out=[]
for d in v.get("davalar",[]):
    if (d.get("gkod") or "")!="depolama": continue
    out.append({"baslik":d.get("baslik"),"esas":d.get("esas"),"birim":d.get("birim"),
                "gkod":d.get("gkod"),"guncelleme":d.get("guncelleme"),"yeni_sayi":d.get("yeni_sayi"),
                "son":len(d.get("son") or []),
                "klasorler":[{"ad":k.get("ad"),"evrak":len(k.get("evraklar") or [])} for k in d.get("klasorler",[])]})
print(json.dumps(out,ensure_ascii=False))
P
chmod -R a+rX "$T/d.py"
IMG=$(docker inspect -f '{{.Image}}' aesun-api)
echo "NOT: DEPO $(docker run --rm --network none --user 1001 -v "$D/anahtar.bin":/k:ro -v "$S":/sunum:ro -v "$T/d.py":/d.py:ro "$IMG" python /d.py)"
