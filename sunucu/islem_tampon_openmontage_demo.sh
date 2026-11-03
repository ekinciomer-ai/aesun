#!/bin/bash
# Tampon bölge: OpenMontage ikinci adım — eksik test paketi, tarama ayrıntısı, araç kaydı hatası, ücretsiz demo videosu.
# Yalnız /opt/tampon/openmontage içinde çalışır; port açmaz, sır okumaz, diğer uygulamalara dokunmaz.
set -u
KOK=/opt/tampon/openmontage; R=$KOK/repo; IMAJ=tampon-openmontage:1
[ -d "$R/.venv" ] || { echo "NOT: HATA önce tampon_openmontage çalıştırılmalı"; exit 1; }
TOPLAM_MB=$(free -m | awk '/Mem/{print $2}'); BELLEK_MB=$(( TOPLAM_MB / 2 )); [ $BELLEK_MB -gt 6144 ] && BELLEK_MB=6144
CEKIRDEK=$(( $(nproc) / 2 )); [ $CEKIRDEK -lt 1 ] && CEKIRDEK=1
CALIS="docker run --rm --name tampon-openmontage --memory ${BELLEK_MB}m --cpus ${CEKIRDEK} --pids-limit 512 --security-opt no-new-privileges --cap-drop ALL -v $R:/work $IMAJ"

# Tarama ayrıntısı: hangi dosyalar
echo "NOT: curl|sh dosyası: $(grep -rIl --exclude-dir=.git --exclude-dir=node_modules -E 'curl[^|]*\|[[:space:]]*(ba)?sh' "$R" | sed "s#$R/##" | tr '\n' ' ')"
grep -rIn --exclude-dir=.git --exclude-dir=node_modules -E 'curl[^|]*\|[[:space:]]*(ba)?sh' "$R" | sed "s#$R/##" | cut -c1-200 | head -3 | sed 's/^/NOT: curl satırı: /'
echo "NOT: eval( dosyaları: $(grep -rIl --exclude-dir=.git --exclude-dir=node_modules -E '[^a-z_]eval\(' "$R" | sed "s#$R/##" | tr '\n' ' ')"
echo "NOT: telemetri dosyaları: $(grep -rIl --exclude-dir=.git -iE 'posthog|segment\.io|mixpanel|sentry_sdk|telemetry' "$R/tools" "$R/lib" "$R/backlot" | sed "s#$R/##" | tr '\n' ' ')"
grep -rIn --exclude-dir=.git -iE 'posthog|segment\.io|mixpanel|sentry_sdk|telemetry' "$R/tools" "$R/lib" "$R/backlot" | sed "s#$R/##" | cut -c1-180 | head -4 | sed 's/^/NOT: telemetri satırı: /'

# Test paketi ve sözleşme testleri
$CALIS bash -lc '.venv/bin/python -m pip install -q -r requirements-dev.txt' > "$KOK/dev.log" 2>&1
$CALIS bash -lc '.venv/bin/python -m pytest tests/contracts/ -q -p no:cacheprovider 2>&1 | tail -3' > "$KOK/test.log" 2>&1
echo "NOT: sözleşme testleri: $(tail -1 "$KOK/test.log" | cut -c1-160)"

# Araç kaydı: hatanın kendisi
$CALIS bash -lc '.venv/bin/python -c "from tools.tool_registry import registry; registry.discover(); import json; m=registry.provider_menu(); print(json.dumps(m)[:1500])"' > "$KOK/zarf.log" 2>&1
echo "NOT: araç kaydı: $(grep -E 'Error|error' "$KOK/zarf.log" | tail -2 | tr '\n' ' ' | cut -c1-260)"
echo "NOT: sağlayıcı menüsü (ilk 400): $(grep -v Traceback "$KOK/zarf.log" | tail -1 | cut -c1-400)"

# Ücretsiz demo videosu (API anahtarı yok)
rm -rf "$R/demo_cikti"
$CALIS bash -lc 'timeout 1500 .venv/bin/python render_demo.py world-in-numbers' > "$KOK/demo.log" 2>&1
echo "NOT: demo çıkış: $? · $(grep -v '^\s*$' "$KOK/demo.log" | tail -2 | tr '\n' ' ' | cut -c1-220)"
MP4=$(find "$R" -newer "$KOK/dev.log" -name '*.mp4' -not -path '*/node_modules/*' -size +10k 2>/dev/null | head -1)
if [ -n "$MP4" ]; then
  echo "NOT: video: ${MP4#$R/} · $(du -h "$MP4" | cut -f1) · $(ffprobe -v error -show_entries format=duration:stream=width,height -of csv=p=0 "$MP4" 2>/dev/null | tr '\n' ' ' || true)"
  KUCUK=$KOK/demo_kucuk.mp4
  docker run --rm --cap-drop ALL -v "$(dirname "$MP4")":/g -v "$KOK":/c "$IMAJ" ffmpeg -y -v error -i "/g/$(basename "$MP4")" -vf "scale=-2:720" -c:v libx264 -preset veryfast -crf 30 -c:a aac -b:a 96k /c/demo_kucuk.mp4
  echo "NOT: aktarılacak boyut: $(du -h "$KUCUK" | cut -f1)"
  echo "VIDEO_BASLA"; base64 -w 0 "$KUCUK"; echo; echo "VIDEO_BITIS"
else
  echo "NOT: video bulunamadı"
fi
echo "NOT: ikinci adım tamam"
