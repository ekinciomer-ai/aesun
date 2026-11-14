#!/bin/bash
# Kapsayıcı içinde çalışır (/work = /opt/tampon/antik_b01)
set -e
python3 -m venv /work/.home/venv >/dev/null 2>&1 || true
. /work/.home/venv/bin/activate
pip -q install "numpy==1.26.4" >/dev/null
python zamanla.py ses zaman.json
TOP=$(python -c 'import json;print(json.load(open("zaman.json"))["toplam"])')
BAS=$(python -c 'import json;print(",".join(str(s["bas"]) for s in json.load(open("zaman.json"))["sahneler"]))')
python muzik.py "$TOP" muzik.wav "$BAS"
python karistir.py zaman.json anlatim.wav
ffmpeg -v error -y -i anlatim.wav -i muzik.wav -filter_complex "[1:a]volume=-16dB[m];[m][0:a]sidechaincompress=threshold=0.03:ratio=8:attack=20:release=300[md];[0:a][md]amix=inputs=2:normalize=0,loudnorm=I=-14:TP=-1.5:LRA=11[o]" -map "[o]" -ar 44100 karisim.wav
node kayit.mjs index.html zaman.json goruntu.mp4 30
ffmpeg -v error -y -i goruntu.mp4 -i karisim.wav -map 0:v -map 1:a -c:v copy -c:a aac -b:a 192k -shortest -movflags +faststart cikti/antik_b01_1080.mp4
ffmpeg -v error -y -i cikti/antik_b01_1080.mp4 -vf scale=480:-2 -c:v libx264 -crf 28 -preset veryfast -c:a aac -b:a 96k -movflags +faststart cikti/antik_b01_480.mp4
echo "bitti $TOP sn"
