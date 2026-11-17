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
echo "NOT: seslendirme başlıyor"
timeout 1080 docker run --rm --memory 1g --cpus 2 -v "$PWD:/work" "$IMAJ" python /work/uret.py 2>&1 | grep -E '^NOT:' | head -60
exit 0
