#!/bin/bash
# Ücretsiz tonlu seslendirme kuyruğu (edge-tts, yedek gTTS). Anahtar/sır gerekmez, bilgisayar gerekmez.
# Yalıtılmış kapsayıcıda çalışır (--rm, port açmaz, sır okumaz, diğer uygulamalara dokunmaz).
# Girdi: ./kuyruk/<kod>.json, ./uret.py  →  Çıktı: ./cikti/<kod>__<ad>.mp3
set -u
IMAJ=aesun-tts:1; KOK=/opt/aesun/tts
mkdir -p "$KOK" cikti
if ! docker image inspect "$IMAJ" >/dev/null 2>&1; then
  cat > "$KOK/Dockerfile" <<'D'
FROM python:3.12-slim-bookworm
RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg ca-certificates && rm -rf /var/lib/apt/lists/*
RUN pip install --no-cache-dir "edge-tts>=7,<8" "gTTS>=2.5,<3"
RUN useradd -m -u 1502 tts
USER tts
WORKDIR /work
D
  timeout 900 docker build -q -t "$IMAJ" "$KOK" >/dev/null 2>"$KOK/build.err" || { echo "NOT: HATA imaj kurulamadı: $(tail -3 "$KOK/build.err" | tr '\n' ' ' | cut -c1-250)"; exit 1; }
  echo "NOT: seslendirme imajı kuruldu"
fi
chown -R 1502:1502 . 2>/dev/null
EF=$(mktemp); chmod 600 "$EF"; trap 'rm -f "$EF"' EXIT
K=$(/opt/aesun/kasa_coz.sh google_tts_anahtar 2>/dev/null) || K=""
[ -n "$K" ] && printf 'GOOGLE_TTS_KEY=%s\n' "$K" > "$EF" || echo "NOT: uyarı Google anahtarı yok, edge-tts kullanılacak"; unset K
G=$(/opt/aesun/kasa_coz.sh gemini_api_anahtar 2>/dev/null) || G=""
[ -n "$G" ] || G=$(/opt/aesun/kasa_coz.sh gemini_api_key 2>/dev/null) || G=""
[ -n "$G" ] && printf 'GEMINI_KEY=%s\n' "$G" >> "$EF" || echo "NOT: uyarı Gemini anahtarı yok"; unset G
echo "NOT: seslendirme başlıyor"
timeout 1080 docker run --rm --env-file "$EF" --memory 1g --cpus 2 -v "$PWD:/work" "$IMAJ" python /work/uret.py 2>&1 | grep -E '^NOT:' | head -60
exit 0
