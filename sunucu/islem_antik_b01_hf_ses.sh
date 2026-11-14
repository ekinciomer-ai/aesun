#!/bin/bash
# Antik B01 karma (Shorts Studio): kanca + kapanış ses parçalarını (ElevenLabs Ümit Doğan) Higgsfield'a yükler.
# Yükleme adresleri şifreli gelir (sunucu açık anahtarı), çözülür, kullanılır, yazdırılmaz. Şifreli dosya iş bitince depodan silinir.
set -u
KOK=/opt/tampon/antik_b01; T=$(mktemp -d); chmod 755 $T; trap 'rm -rf $T' EXIT
python3 - sunucu/antik_b01/hf_yukleme.sifreli "$T" <<'PY'
import base64, json, sys
d = json.load(open(sys.argv[1])); t = sys.argv[2]
open(t + "/ak", "wb").write(base64.b64decode(d["ak"])); open(t + "/ct", "wb").write(base64.b64decode(d["ct"])); open(t + "/iv", "w").write(d["iv"])
PY
openssl pkeyutl -decrypt -inkey /opt/aesun/sir/ozel.pem -pkeyopt rsa_padding_mode:oaep -pkeyopt rsa_oaep_md:sha256 -in $T/ak -out $T/k || { echo "NOT: HATA anahtar çözülemedi"; exit 1; }
openssl enc -d -aes-256-cbc -K "$(xxd -p -c 64 $T/k)" -iv "$(cat $T/iv)" -in $T/ct -out $T/u.json || { echo "NOT: HATA çözülemedi"; exit 1; }
cp $KOK/ses/p1.mp3 $T/kanca.mp3
BAS=$(python3 - $KOK/ses/p5.json <<'PY'
import json, sys
a = json.load(open(sys.argv[1])); s = "".join(a["characters"]); i = s.find("Sence")
print(max(0, a["character_start_times_seconds"][i] - 0.05) if i >= 0 else -1)
PY
)
[ "$BAS" = "-1" ] && { echo "NOT: HATA kapanış cümlesi bulunamadı"; exit 1; }
docker run --rm --user 0 -v $KOK/ses:/s:ro -v $T:/t tampon-video15:2 ffmpeg -v error -y -ss $BAS -i /s/p5.mp3 -c:a libmp3lame -b:a 192k /t/kapanis.mp3
for p in ${PARCALAR:-kapanis}; do
  U=$(python3 -c "import json,sys;print(json.load(open('$T/u.json'))['$p'])")
  d=$(docker run --rm -v $T:/t tampon-video15:2 ffprobe -v error -show_entries format=duration -of csv=p=0 /t/$p.mp3)
  k=$(curl -s -o /dev/null -w "%{http_code}" -X PUT -H "Content-Type: audio/mpeg" --data-binary @$T/$p.mp3 "$U")
  [ "$k" = 200 ] || k=$(curl -s -o /dev/null -w "%{http_code}" -X PUT -H "Content-Type: audio/mpeg" -H "If-None-Match: *" --data-binary @$T/$p.mp3 "$U")
  echo "NOT: $p · süre ${d} sn · yükleme HTTP $k"
done
