#!/bin/bash
# AI motoru Normal girişi: ücretsiz deneme videosu (Gemini metin, Edge ses, Pixabay görüntü, müziksiz).
# Konu: $KONU (yoksa Granada 1492). Video kalite kapısından geçer; küçük önizleme günlüğe aktarılır.
set -u
KONU=${KONU:-"La caída de Granada en 1492"}
R=/opt/tampon/mpt/repo; API=http://127.0.0.1:8180/api/v1
# 1) Metin: kısa cümleler (ekranda az yazı: her altyazı en çok ~7 kelime)
ISTEM="Escribe frases muy cortas, de 4 a 7 palabras, cada una termina en punto. Nombra lugares, personas y objetos concretos. Sin introducción."
METIN=$(KONU="$KONU" ISTEM="$ISTEM" python3 -c '
import json,os,urllib.request
b=json.dumps({"video_subject":os.environ["KONU"],"video_language":"es","paragraph_number":2,"video_script_prompt":os.environ["ISTEM"]}).encode()
r=urllib.request.Request("http://127.0.0.1:8180/api/v1/scripts",data=b,headers={"Content-Type":"application/json"})
print((json.load(urllib.request.urlopen(r,timeout=120)).get("data") or {}).get("video_script",""))')
[ -n "$METIN" ] || { echo "NOT: HATA metin yazılamadı"; exit 1; }
# 2) Görüntü arama terimleri: metnin sırasıyla, somut (İngilizce)
TERIM=$(KONU="$KONU" METIN="$METIN" python3 -c '
import json,os,urllib.request
b=json.dumps({"video_subject":os.environ["KONU"],"video_script":os.environ["METIN"],"amount":10,"match_materials_to_script":True}).encode()
r=urllib.request.Request("http://127.0.0.1:8180/api/v1/terms",data=b,headers={"Content-Type":"application/json"})
print(json.dumps((json.load(urllib.request.urlopen(r,timeout=120)).get("data") or {}).get("video_terms",[])))')
echo "NOT: arama terimleri: $TERIM"
GOVDE=$(KONU="$KONU" METIN="$METIN" TERIM="$TERIM" python3 -c '
import json,os
print(json.dumps({"video_subject":os.environ["KONU"],"video_script":os.environ["METIN"],"video_terms":json.loads(os.environ["TERIM"] or "[]"),
 "match_materials_to_script":True,"video_language":"es","video_aspect":"9:16","video_source":"pixabay",
 "voice_name":"es-ES-AlvaroNeural-Male","voice_rate":1.0,"bgm_type":"","subtitle_enabled":True,
 "font_name":"BeVietnamPro-Bold.ttf","font_size":58,"stroke_width":2.5,"video_clip_duration":4,"video_count":1,"n_threads":2}))')
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
