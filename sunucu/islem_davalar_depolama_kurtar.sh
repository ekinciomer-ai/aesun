#!/bin/bash
# Davalar: 27.11.2026 'davalar_yukle' (komple değiştirme) ile dizinden düşen Depolama grubunu geri getirir.
# Kaynak: restic kopyası f18c2388 (27.11 09:37 UTC, on_degisiklik). Yalnız EKLER:
#  - kopyadaki gkod=depolama davaları canlı dizinde (başlığa göre) yoksa eklenir,
#  - bu davaların evrak kayıtları ve şifreli evrak dosyaları canlıda yoksa geri konur,
#  - depolama_yorumlar notu canlıda yoksa geri konur (canlıdaki daha yeni notlara dokunulmaz).
# Samet ve diğer gruplar, canlı notlar değişmez. İş akışı öncesinde otomatik ön yedek alır.
set -euo pipefail
SNAP=f18c2388
D=/opt/aesun/ozel/davalar; S="$D/sunum"
export RESTIC_REPOSITORY=/var/yedek/restic RESTIC_PASSWORD_FILE=/opt/aesun/sir/restic.pass
T=$(mktemp -d /root/dep_kurtar.XXXXXX); trap 'rm -rf "$T"' EXIT
restic restore "$SNAP" --target "$T" --include "$S/dizin.sifreli" --include "$S/depolama_yorumlar.sifreli" --include "$S/e" >/dev/null 2>&1 || true
O="$T$S"
[ -f "$O/dizin.sifreli" ] || { echo "NOT: HATA kopyada dizin yok"; exit 1; }
cat > "$T/k.py" <<'P'
import os, json, shutil
from pathlib import Path
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
a = AESGCM(Path("/k").read_bytes()[:32])
def coz(p): b = Path(p).read_bytes(); return json.loads(a.decrypt(b[:12], b[12:], None))
def sif(b): n = os.urandom(12); return n + a.encrypt(n, b, None)
E, S = Path("/eski"), Path("/sunum")
eski, canli = coz(E / "dizin.sifreli"), coz(S / "dizin.sifreli")
canli.setdefault("davalar", []); canli.setdefault("evrak", {})
var = {d.get("baslik") for d in canli["davalar"]}
oz = {"eklenen_dava": [], "evrak_kaydi": 0, "evrak_dosyasi": 0, "eksik_dosya": 0, "not": []}
for d in eski.get("davalar", []):
    if d.get("gkod") != "depolama" or d.get("baslik") in var:
        continue
    canli["davalar"].append(d); oz["eklenen_dava"].append((d.get("baslik") or "")[:30])
    for k in d.get("klasorler", []):
        for e in k.get("evraklar", []):
            i = e.get("id")
            if i not in canli["evrak"] and i in eski.get("evrak", {}):
                canli["evrak"][i] = eski["evrak"][i]; oz["evrak_kaydi"] += 1
            src, dst = E / "e" / (i + ".sifreli"), S / "e" / (i + ".sifreli")
            if not dst.is_file():
                if src.is_file(): shutil.copyfile(src, dst); oz["evrak_dosyasi"] += 1
                else: oz["eksik_dosya"] += 1
n = "depolama_yorumlar.sifreli"
if not (S / n).is_file() and (E / n).is_file():
    shutil.copyfile(E / n, S / n); oz["not"].append(n)
tmp = S / "dizin.sifreli.yeni"
tmp.write_bytes(sif(json.dumps(canli, ensure_ascii=False).encode()))
try: (S / "dizin.sifreli").replace(S / "dizin.sifreli.onceki")
except Exception: pass
tmp.replace(S / "dizin.sifreli")
oz["toplam_dava"] = len(canli["davalar"]); oz["toplam_evrak"] = len(canli["evrak"])
print(json.dumps(oz, ensure_ascii=False))
P
chmod -R a+rX "$T"
IMG=$(docker inspect -f '{{.Image}}' aesun-api)
OUT=$(docker run --rm --network none --user 1001 -v "$D/anahtar.bin":/k:ro -v "$S":/sunum -v "$O":/eski:ro -v "$T/k.py":/k.py:ro "$IMG" python /k.py)
echo "NOT: kurtarma sonucu $OUT"
chown -R 1001:1001 "$S"; chmod 700 "$S" "$S/e"
docker restart aesun-api >/dev/null && sleep 6
echo "NOT: yetkisiz istek: $(curl -s -o /dev/null -w '%{http_code}' --max-time 10 https://api.aksarayenerji.net/v1/davalar/dizin) (401 beklenir)"
