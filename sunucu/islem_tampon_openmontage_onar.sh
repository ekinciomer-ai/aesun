#!/bin/bash
# Tampon bölge: OpenMontage onarım — sunucu işlemcisi x86-64-v2 desteklemediği için NumPy 2.3+ çalışmıyor; NumPy 2.2'ye sabitlenir.
# Sonra testler ve araç kaydı yeniden denenir, demo videosu aktarılır. Yalnız /opt/tampon/openmontage içinde çalışır.
set -u
KOK=/opt/tampon/openmontage; R=$KOK/repo; IMAJ=tampon-openmontage:1
TOPLAM_MB=$(free -m | awk '/Mem/{print $2}'); BELLEK_MB=$(( TOPLAM_MB / 2 )); [ $BELLEK_MB -gt 6144 ] && BELLEK_MB=6144
CEKIRDEK=$(( $(nproc) / 2 )); [ $CEKIRDEK -lt 1 ] && CEKIRDEK=1
CALIS="docker run --rm --name tampon-openmontage --memory ${BELLEK_MB}m --cpus ${CEKIRDEK} --pids-limit 512 --security-opt no-new-privileges --cap-drop ALL -v $R:/work $IMAJ"

echo "NOT: işlemci: $(grep -m1 'model name' /proc/cpuinfo | cut -d: -f2 | xargs) · sse4_2=$(grep -c -m1 sse4_2 /proc/cpuinfo) popcnt=$(grep -c -m1 popcnt /proc/cpuinfo)"
echo "NOT: eval satırları: $(grep -hn -E '[^a-z_]eval\(' "$R/lib/clip_embedder.py" "$R/tools/graphics/math_animate.py" "$R/.agents/skills/hyperframes-media/scripts/lib/bgm.mjs" | tr -s ' ' | cut -c1-70 | tr '\n' '|')"

$CALIS bash -lc '.venv/bin/python -m pip install -q "numpy<2.3" && .venv/bin/python -c "import numpy; print(numpy.__version__)"' > "$KOK/numpy.log" 2>&1
echo "NOT: numpy: $(tail -1 "$KOK/numpy.log" | cut -c1-120)"

$CALIS bash -lc '.venv/bin/python -m pytest tests/contracts/ -q -p no:cacheprovider 2>&1 | tail -3' > "$KOK/test.log" 2>&1
echo "NOT: sözleşme testleri: $(tail -1 "$KOK/test.log" | cut -c1-160)"

$CALIS bash -lc '.venv/bin/python -c "
from tools.tool_registry import registry; registry.discover()
m=registry.provider_menu(); import json
s=json.dumps(m)
print(len(s)); print(s[:1200])"' > "$KOK/zarf.log" 2>&1
echo "NOT: araç kaydı: $(grep -E 'Error' "$KOK/zarf.log" | tail -1 | cut -c1-200)"
echo "NOT: sağlayıcı menüsü: $(tail -1 "$KOK/zarf.log" | cut -c1-600)"

MP4=$R/projects/demos/renders/world-in-numbers.mp4
if [ -f "$MP4" ]; then
  echo "NOT: video aktarılıyor: $(du -h "$MP4" | cut -f1)"
  echo "VIDEO_BASLA"; base64 -w 0 "$MP4"; echo; echo "VIDEO_BITIS"
fi
echo "NOT: onarım tamam"
