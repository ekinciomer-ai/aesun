#!/bin/bash
# AI motoru Normal girişi: COP31 deneme videosu (TR). Metin elle doğrulandı (Gemini yazmaz → yanlış bilgi riski yok).
# Edge TTS Türkçe ses, Pixabay görüntü, müziksiz, 9:16. Tam video /opt/tampon/disari → GitHub iş çıktısı (3 gün).
set -u
R=/opt/tampon/mpt/repo; API=http://127.0.0.1:8180/api/v1
GOVDE=$(python3 - <<'PY'
import json
metin=("Dünya iklim için Antalya'da buluştu. "
"COP31, 9 ile 20 Kasım 2026 arasında yapılıyor. "
"Adres: Antalya EXPO Merkezi. "
"Ev sahibi Türkiye, zirve başkanı Murat Kurum. "
"Müzakereleri ise Avustralya yürütüyor. "
"Bu ortak başkanlık modeli bir ilk. "
"Liderler zirvesi 11 ve 12 Kasım'da toplandı. "
"95 ülke lideri katılım bildirdi. "
"Masada dört ana başlık var. "
"İklim finansmanı, adil geçiş, uyum ve emisyon azaltımı. "
"Güneş ve rüzgâr enerjisi bu dönüşümün kalbinde. "
"Sizce Antalya'dan nasıl bir karar çıkmalı?")
terim=["Antalya coast","climate conference","world leaders meeting","conference hall flags","solar panels field",
       "wind turbines","forest aerial","mediterranean sea sunset","earth from space","green city"]
print(json.dumps({"video_subject":"COP31 Antalya iklim zirvesi","video_script":metin,"video_terms":terim,
 "match_materials_to_script":True,"video_language":"tr","video_aspect":"9:16","video_source":"pixabay",
 "voice_name":"tr-TR-AhmetNeural-Male","voice_rate":1.0,"bgm_type":"","subtitle_enabled":True,
 "font_name":"BeVietnamPro-Bold.ttf","font_size":58,"stroke_width":2.5,"video_clip_duration":4,"video_count":1,"n_threads":2}))
PY
)
T=$(curl -s -m 60 -X POST $API/videos -H 'Content-Type: application/json' -d "$GOVDE" | python3 -c 'import json,sys;print((json.load(sys.stdin).get("data") or {}).get("task_id",""))')
[ -n "$T" ] || { echo "NOT: HATA görev başlamadı (kapsayıcı: $(docker ps --filter name=tampon-mpt --format '{{.Status}}'))"; exit 1; }
echo "NOT: görev $T başladı"
for i in $(seq 1 120); do
  S=$(curl -s -m 20 $API/tasks/$T | python3 -c 'import json,sys;d=json.load(sys.stdin).get("data") or {};print(d.get("state"),d.get("progress"))')
  case "$S" in 1\ *|-1\ *) break;; esac; echo "ilerleme $S"; sleep 10
done
echo "NOT: durum (1=tamam, -1=hata): $S"
MP4=$(ls -t $R/storage/tasks/$T/final-*.mp4 2>/dev/null | head -1)
if [ -z "$MP4" ]; then docker logs --since 25m tampon-mpt 2>&1 | grep -iE 'error|exception' | tail -4 | cut -c1-260 | sed -E 's/AIza[0-9A-Za-z_-]+/***/g; s/^/NOT: günlük: /'; exit 1; fi
echo "NOT: video: $(ffprobe -v error -show_entries format=duration:stream=width,height -of csv=p=0 "$MP4" | tr '\n' ' ') · $(du -h "$MP4" | cut -f1)"
python3 /opt/aesun/kalite_kapisi.py "$MP4" 2>&1 | sed 's/^/NOT: kalite kapısı: /'
mkdir -p /opt/aesun/motor/cikti && cp "$MP4" /opt/aesun/motor/cikti/cop31_$T.mp4
mkdir -p /opt/tampon/disari && tar czf /opt/tampon/disari/cop31_video.tgz -C "$(dirname "$MP4")" "$(basename "$MP4")"
echo "NOT: tam video iş çıktısına eklendi"
