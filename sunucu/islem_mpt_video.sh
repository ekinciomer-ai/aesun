#!/bin/bash
# AI motoru Normal girişi: ücretsiz deneme videosu (Gemini metin, Edge ses, Pixabay görüntü, müziksiz).
# Konu: $KONU (yoksa Granada 1492). Video kalite kapısından geçer; küçük önizleme günlüğe aktarılır.
set -u
KONU=${KONU:-"La caída de Granada en 1492"}
R=/opt/tampon/mpt/repo; API=http://127.0.0.1:8180/api/v1
GOVDE=$(KONU="$KONU" python3 -c '
import json,os
print(json.dumps({"video_subject":os.environ["KONU"],"video_language":"es","video_aspect":"9:16","paragraph_number":2,
 "video_source":"pixabay","voice_name":"es-ES-AlvaroNeural-Male","voice_rate":1.0,"bgm_type":"","subtitle_enabled":True,
 "font_name":"BeVietnamPro-Bold.ttf","font_size":64,"stroke_width":2.5,"video_clip_duration":4,"video_count":1,"n_threads":2}))')
T=$(curl -s -m 60 -X POST $API/videos -H 'Content-Type: application/json' -d "$GOVDE" | python3 -c 'import json,sys;print((json.load(sys.stdin).get("data") or {}).get("task_id",""))')
[ -n "$T" ] || { echo "NOT: HATA görev başlamadı"; exit 1; }
echo "NOT: görev $T başladı"
for i in $(seq 1 120); do
  D=$(curl -s -m 20 $API/tasks/$T)
  S=$(echo "$D" | python3 -c 'import json,sys;d=json.load(sys.stdin).get("data") or {};print(d.get("state"),d.get("progress"))')
  case "$S" in 1\ *|-1\ *) break;; esac; sleep 10
done
echo "NOT: durum (1=tamam, -1=hata): $S"
MP4=$(ls -t $R/storage/tasks/$T/final-*.mp4 2>/dev/null | head -1)
if [ -z "$MP4" ]; then docker logs --since 25m tampon-mpt 2>&1 | grep -iE 'error|exception' | tail -4 | cut -c1-260 | sed -E 's/AIza[0-9A-Za-z_-]+/***/g; s/^/NOT: günlük: /'; exit 1; fi
echo "NOT: video: $(ffprobe -v error -show_entries format=duration:stream=width,height -of csv=p=0 "$MP4" | tr '\n' ' ') · $(du -h "$MP4" | cut -f1)"
echo "NOT: metin: $(python3 -c "import json;print(json.load(open('$R/storage/tasks/$T/script.json')).get('script','')[:400].replace(chr(10),' '))" 2>/dev/null)"
python3 /opt/aesun/kalite_kapisi.py "$MP4" | sed 's/^/NOT: kalite kapısı: /'
mkdir -p /opt/aesun/motor/cikti && cp "$MP4" /opt/aesun/motor/cikti/normal_$T.mp4
ffmpeg -y -v error -i "$MP4" -vf "scale=-2:854" -c:v libx264 -preset veryfast -crf 30 -c:a aac -b:a 96k /tmp/mpt_onizleme.mp4
echo "NOT: önizleme $(du -h /tmp/mpt_onizleme.mp4 | cut -f1)"
echo "VIDEO_BASLA"; base64 -w 0 /tmp/mpt_onizleme.mp4; echo; echo "VIDEO_BITIS"; rm -f /tmp/mpt_onizleme.mp4
