#!/usr/bin/env bash
# aesun — Pi nabzı. crontab her 10 dakikada çalıştırır.
# Nabız GitHub epias-ptf/n8n/pi_nabiz.json'a yazılır (n8n webhook'u artık kullanılmıyor, kredi harcamaz).
# Ardından Pi şefi (sef_pi.py) bir tur atar: takılan toplayıcı, kod güncellemesi, disk.
D="$(cd "$(dirname "$0")" && pwd)"
python3 "$D/nabiz.py"
timeout 300 python3 "$D/sef_pi.py" >> "$D/../sef_pi.log" 2>&1 || true
