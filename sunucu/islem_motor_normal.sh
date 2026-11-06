#!/bin/bash
# AI motoru · Normal giriş (ücretsiz) · tarih videosu:
# Gemini kısa cümleli metin → Wikimedia Commons serbest lisanslı tarihi görseller (yazılı olanlar elenir) →
# MoneyPrinterTurbo: Edge ses + altyazı + yavaş yakınlaşma → kalite kapısı → önizleme + kaynak listesi.
set -u
KONU=${KONU:-"La caída de Granada en 1492"}; DIL=${DIL:-es}; SES=${SES:-es-ES-AlvaroNeural-Male}
R=/opt/tampon/mpt/repo; API=http://127.0.0.1:8180/api/v1; M=/opt/aesun/motor
command -v tesseract >/dev/null || { apt-get install -y -qq tesseract-ocr >/dev/null 2>&1; echo "NOT: tesseract kuruldu"; }
mkdir -p $M && cp /tmp/aesun_paket/sunucu/aesun/motor/commons_gorsel.py $M/ && cp /tmp/aesun_paket/sunucu/aesun/kalite_kapisi.py /opt/aesun/kalite_kapisi.py
post() { curl -s -m 180 -X POST "$API/$1" -H 'Content-Type: application/json' -d "$2"; }
# 1) Metin
ISTEM="Escribe frases muy cortas, de 4 a 7 palabras, cada una termina en punto. Nombra lugares, personas y objetos concretos. Sin introducción."
METIN=$(post scripts "$(KONU="$KONU" DIL="$DIL" ISTEM="$ISTEM" python3 -c 'import json,os;print(json.dumps({"video_subject":os.environ["KONU"],"video_language":os.environ["DIL"],"paragraph_number":2,"video_script_prompt":os.environ["ISTEM"]}))')" \
  | python3 -c 'import json,sys;print((json.load(sys.stdin).get("data") or {}).get("video_script",""))')
[ -n "$METIN" ] || { echo "NOT: HATA metin yazılamadı"; exit 1; }
# 2) Cümle sırasına göre görsel arama terimleri (İngilizce)
TERIM=$(post terms "$(KONU="$KONU" METIN="$METIN" python3 -c 'import json,os;print(json.dumps({"video_subject":os.environ["KONU"],"video_script":os.environ["METIN"],"amount":10,"match_materials_to_script":True}))')" \
  | python3 -c 'import json,sys;print("\n".join((json.load(sys.stdin).get("data") or {}).get("video_terms",[])))')
echo "NOT: terimler: $(echo "$TERIM" | tr '\n' ';')"
# 3) Commons görselleri
IS=$(date +%Y%m%d_%H%M%S); G=$R/storage/local_videos/$IS
mapfile -t TL <<< "$TERIM"
GEMINI_KEY="$(/opt/aesun/kasa_coz.sh gemini_api_key 2>/dev/null)" KONU="$KONU" python3 $M/commons_gorsel.py "$G" "${TL[@]}" 2> /tmp/commons_uyari.txt | sed 's/^/NOT: görseller: /'
grep -v "^$" /tmp/commons_uyari.txt | sort | uniq -c | head -5 | sed "s/^/NOT: uyarı: /"; grep -c uyarı /tmp/commons_uyari.txt | sed 's/^/NOT: bulunamayan terim: /'
N=$(ls $G/*.png 2>/dev/null | wc -l); [ "$N" -ge 3 ] || { echo "NOT: HATA yeterli görsel yok ($N)"; exit 1; }
# 4) Video (yerel görseller, sırayla)
GOVDE=$(KONU="$KONU" METIN="$METIN" DIL="$DIL" SES="$SES" IS="$IS" python3 -c '
import json,os,glob
g=sorted(glob.glob(f"/opt/tampon/mpt/repo/storage/local_videos/{os.environ["IS"]}/g*.png"))
mat=[{"provider":"local","url":"/MoneyPrinterTurbo/storage/local_videos/"+os.environ["IS"]+"/"+os.path.basename(x)} for x in g]
print(json.dumps({"video_subject":os.environ["KONU"],"video_script":os.environ["METIN"],"video_source":"local","video_materials":mat,
 "video_concat_mode":"sequential","image_motion":"zoom","video_language":os.environ["DIL"],"video_aspect":"9:16",
 "voice_name":os.environ["SES"],"bgm_type":"","subtitle_enabled":True,"font_name":"BeVietnamPro-Bold.ttf","font_size":58,
 "stroke_width":2.5,"video_clip_duration":4,"video_count":1,"n_threads":2}))')
T=$(post videos "$GOVDE" | python3 -c 'import json,sys;print((json.load(sys.stdin).get("data") or {}).get("task_id",""))')
[ -n "$T" ] || { echo "NOT: HATA görev başlamadı"; exit 1; }
echo "NOT: görev $T"
for i in $(seq 1 90); do
  S=$(curl -s -m 20 $API/tasks/$T | python3 -c 'import json,sys;d=json.load(sys.stdin).get("data") or {};print(d.get("state"),d.get("progress"))')
  case "$S" in 1\ *|-1\ *) break;; esac; echo "ilerleme $S"; sleep 10
done
MP4=$R/storage/tasks/$T/final-1.mp4
[ -f "$MP4" ] || { docker logs --since 20m tampon-mpt 2>&1 | grep -iE 'error|skip' | tail -4 | cut -c1-240 | sed 's/^/NOT: günlük: /'; exit 1; }
cp $G/kaynaklar.json $R/storage/tasks/$T/kaynaklar.json
echo "NOT: video: $(ffprobe -v error -show_entries format=duration:stream=width,height -of csv=p=0 "$MP4" | tr '\n' ' ')"
echo "NOT: metin: $(echo "$METIN" | tr '\n' ' ' | cut -c1-400)"
python3 -c "import json;k=json.load(open('$G/kaynaklar.json'));print('NOT: kaynaklar: '+' | '.join(f\"{x['baslik'][5:60]} ({x['lisans']})\" for x in k))"
python3 -c "import json;print(json.dumps({'sentetik':False,'kaynaklar':json.load(open('$G/kaynaklar.json'))}))" > /tmp/kayit.json
python3 /opt/aesun/kalite_kapisi.py "$MP4" /tmp/kayit.json | sed 's/^/NOT: kalite kapısı: /'
mkdir -p $M/cikti && cp "$MP4" $M/cikti/normal_$T.mp4
ffmpeg -y -v error -i "$MP4" -vf "scale=-2:854" -c:v libx264 -preset veryfast -crf 30 -c:a aac -b:a 96k /tmp/onizleme.mp4
echo "VIDEO_BASLA"; base64 -w 0 /tmp/onizleme.mp4; echo; echo "VIDEO_BITIS"; rm -f /tmp/onizleme.mp4 /tmp/kayit.json
