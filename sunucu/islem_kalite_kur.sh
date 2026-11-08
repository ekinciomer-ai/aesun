#!/bin/bash
# Kalite kapısını sunucuya kurar (/opt/aesun/kalite_kapisi.py) ve ffmpeg'in varlığını garanti eder.
set -euo pipefail
command -v ffprobe >/dev/null || DEBIAN_FRONTEND=noninteractive apt-get install -y -qq ffmpeg >/dev/null 2>&1
install -m 755 sunucu/aesun/kalite_kapisi.py /opt/aesun/kalite_kapisi.py
echo "NOT: kalite kapısı kuruldu · ffprobe $(command -v ffprobe)"
