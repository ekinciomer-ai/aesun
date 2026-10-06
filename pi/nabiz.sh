#!/usr/bin/env bash
# aesun — Pi nabzı. crontab her 10 dakikada çalıştırır.
# Nabız GitHub epias-ptf/n8n/pi_nabiz.json'a yazılır (n8n webhook'u artık kullanılmıyor, kredi harcamaz).
# n8n Ana döngü bu dosyayı okuyup aesun_nabiz tablosuna işler.
exec python3 "$(cd "$(dirname "$0")" && pwd)/nabiz.py"
