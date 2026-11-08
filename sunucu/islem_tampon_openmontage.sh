#!/bin/bash
# Tampon bölge: OpenMontage (calesthio/OpenMontage, AGPL-3.0) yalıtılmış kapsayıcıda kurulur ve denenir.
# Diğer uygulamalara (aesun, gesfin, epixa, mirsoft, agrosev, caddy) dokunmaz. Port açmaz. Sır okumaz.
# Yer: /opt/tampon/openmontage  ·  Kapsayıcı: tampon-openmontage (her çalıştırmada --rm, kalıcı süreç yok)
set -u
KOK=/opt/tampon/openmontage
IMAJ=tampon-openmontage:1

echo "NOT: sunucu: $(nproc) çekirdek · bellek kullanılabilir $(free -m | awk '/Mem/{print $7}') MB · disk boş $(df -h / | tail -1 | awk '{print $4}')"
BOS_GB=$(df -BG / | tail -1 | awk '{gsub("G","",$4); print $4}')
if [ "${BOS_GB:-0}" -lt 8 ]; then echo "NOT: HATA disk boş alanı 8 GB altında, kurulum durduruldu"; exit 1; fi
command -v docker >/dev/null || { echo "NOT: HATA docker yok"; exit 1; }

# Kaynak sınırı: belleğin yarısı (en çok 6 GB), çekirdeğin yarısı (en az 1)
TOPLAM_MB=$(free -m | awk '/Mem/{print $2}')
BELLEK_MB=$(( TOPLAM_MB / 2 )); [ $BELLEK_MB -gt 6144 ] && BELLEK_MB=6144
CEKIRDEK=$(( $(nproc) / 2 )); [ $CEKIRDEK -lt 1 ] && CEKIRDEK=1
echo "NOT: tampon sınırı: ${BELLEK_MB} MB bellek, ${CEKIRDEK} çekirdek"

mkdir -p "$KOK"
if [ -d "$KOK/repo/.git" ]; then
  git -C "$KOK/repo" fetch --depth 1 origin main -q && git -C "$KOK/repo" reset --hard -q origin/main
else
  git clone --depth 1 -q https://github.com/calesthio/OpenMontage.git "$KOK/repo"
fi
echo "NOT: sürüm: $(git -C "$KOK/repo" log -1 --format='%h %cs %s' | cut -c1-90)"
echo "NOT: lisans: $(head -3 "$KOK/repo/LICENSE" | tr '\n' ' ' | tr -s ' ' | cut -c1-60)"

# Güvenlik ön taraması (salt okuma): şüpheli kalıp sayıları
R="$KOK/repo"
say() { grep -rIl --exclude-dir=.git --exclude-dir=node_modules -E "$1" "$R" 2>/dev/null | wc -l; }
echo "NOT: tarama: curl|sh=$(say 'curl[^|]*\|[[:space:]]*(ba)?sh') · base64-çöz+çalıştır=$(say 'base64[^\n]*(exec|eval)\(') · eval(=$(say '[^a-z_]eval\(') · ssh-anahtar okuma=$(say '\.ssh/id_') · tarayıcı-çerez=$(say 'Cookies|Login Data')"
echo "NOT: npm kurulum betikleri: $(grep -E '"(pre|post)?install"' "$R/remotion-composer/package.json" 2>/dev/null | tr -d ' ' | tr '\n' ' ' || echo yok)"
echo "NOT: telemetri izi: $(grep -rIl --exclude-dir=.git -iE 'posthog|segment\.io|mixpanel|sentry_sdk|telemetry' "$R/tools" "$R/lib" "$R/backlot" 2>/dev/null | wc -l) dosya"

# Yalıtılmış imaj (node 22 + python3.11 + ffmpeg + Remotion için tarayıcı kütüphaneleri)
cat > "$KOK/Dockerfile" <<'EOF'
FROM node:22-bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 python3-venv python3-pip python3-dev build-essential git make ffmpeg ca-certificates \
    libnss3 libdbus-1-3 libatk1.0-0 libatk-bridge2.0-0 libgbm1 libasound2 libxrandr2 libxkbcommon0 \
    libxfixes3 libxcomposite1 libxdamage1 libpango-1.0-0 libcairo2 libcups2 fonts-dejavu fonts-noto-color-emoji \
 && rm -rf /var/lib/apt/lists/*
RUN useradd -m -u 1500 tampon
USER tampon
WORKDIR /work
EOF
docker build -q -t "$IMAJ" "$KOK" >/dev/null 2>"$KOK/build.err" || { echo "NOT: HATA imaj kurulamadı: $(tail -3 "$KOK/build.err" | tr '\n' ' ' | cut -c1-200)"; exit 1; }
echo "NOT: imaj hazır: $(docker image inspect "$IMAJ" --format '{{.Size}}' | awk '{printf "%.1f GB", $1/1e9}')"

chown -R 1500:1500 "$KOK/repo"
CALIS="docker run --rm --name tampon-openmontage --memory ${BELLEK_MB}m --cpus ${CEKIRDEK} --pids-limit 512 --security-opt no-new-privileges --cap-drop ALL -v $KOK/repo:/work $IMAJ"

$CALIS bash -lc 'make setup' > "$KOK/setup.log" 2>&1
echo "NOT: kurulum çıkış kodu: $? · son satır: $(grep -v '^\s*$' "$KOK/setup.log" | tail -1 | cut -c1-120)"
grep -E 'runtime_available|\[skip\]|ERROR|Successfully installed piper' "$KOK/setup.log" | cut -c1-160 | head -8 | sed 's/^/NOT: kurulum: /'

$CALIS bash -lc '.venv/bin/python -m pytest tests/contracts/ -q 2>&1 | tail -2' > "$KOK/test.log" 2>&1
echo "NOT: sözleşme testleri: $(tail -1 "$KOK/test.log" | cut -c1-140)"

$CALIS bash -lc '.venv/bin/python -c "from tools.tool_registry import registry; registry.discover(); e=registry.support_envelope(); import json; print(json.dumps(e)[:2000])"' > "$KOK/zarf.json" 2>&1
echo "NOT: araç zarfı (ilk 300): $(head -c 300 "$KOK/zarf.json" | tr '\n' ' ')"

$CALIS bash -lc '.venv/bin/python render_demo.py --list' > "$KOK/demo_liste.log" 2>&1
echo "NOT: demo listesi: $(tr '\n' ' ' < "$KOK/demo_liste.log" | tr -s ' ' | cut -c1-300)"

du -sh "$KOK" | awk '{print "NOT: tampon toplam boyut: "$1}'
echo "NOT: tampon kurulumu tamam"
