#!/bin/bash
# Görüntü + anlatım + müzik (müzik anlatım altında kısılır), -14 LUFS. karistir.sh <video> <anlatim> <muzik> <toplam sn> <cikti>
set -e;V=$1;N=$2;MZ=$3;T=$4;O=$5;FS=$(python3 -c "print($T-3)")
ffmpeg -v error -y -i "$V" -i "$N" -i "$MZ" -filter_complex "\
[1:a]aformat=sample_rates=48000:channel_layouts=stereo,highpass=f=70,acompressor=threshold=-20dB:ratio=3:attack=5:release=120,asplit[n1][n2];\
[2:a]aformat=sample_rates=48000:channel_layouts=stereo,atrim=0:$T,afade=t=in:d=0.8,afade=t=out:st=$FS:d=3,volume=0.42[m];\
[m][n1]sidechaincompress=threshold=0.04:ratio=6:attack=20:release=350[md];[md][n2]amix=inputs=2:normalize=0,loudnorm=I=-14:TP=-1.5:LRA=9[a]" \
-map 0:v -map "[a]" -c:v libx264 -preset slow -crf 20 -c:a aac -b:a 192k -ar 48000 -shortest -movflags +faststart "$O"
