#!/bin/bash
# Gizli seslendirme: iş dosyası sunucu açık anahtarıyla şifreli gelir; çıktı yalnız alıcının açık anahtarıyla şifreli döner.
# Düz metin ya da ses depoya girmez, günlüğe yazılmaz. Çalışma klasörü iş bitince silinir.
set -u
cd "$(dirname "$0")"
umask 077
python3 - is.sifreli <<'PY'
import base64, json, sys
d = json.load(open(sys.argv[1]))
open("ak", "wb").write(base64.b64decode(d["ak"])); open("ct", "wb").write(base64.b64decode(d["ct"])); open("iv", "w").write(d["iv"])
PY
openssl pkeyutl -decrypt -inkey /opt/aesun/sir/ozel.pem -pkeyopt rsa_padding_mode:oaep -pkeyopt rsa_oaep_md:sha256 -pkeyopt rsa_mgf1_md:sha256 -in ak -out k 2>/dev/null \
 || openssl pkeyutl -decrypt -inkey /opt/aesun/sir/ozel.pem -pkeyopt rsa_padding_mode:oaep -pkeyopt rsa_oaep_md:sha256 -in ak -out k || { echo "NOT: HATA anahtar çözülemedi"; exit 1; }
mkdir -p kuyruk cikti
openssl enc -d -aes-256-cbc -K "$(xxd -p -c 64 k)" -iv "$(cat iv)" -in ct -out kuyruk/is.json || { echo "NOT: HATA iş çözülemedi"; exit 1; }
rm -f ak ct iv k
umask 022
bash islem_tts_kuyruk.sh < /dev/null
umask 077
rm -rf kuyruk
N=$(ls cikti/*.mp3 2>/dev/null | wc -l); echo "NOT: ses dosyası: $N"
tar czf c.tgz cikti && rm -rf cikti
openssl rand 32 > k2; IV=$(openssl rand -hex 16)
openssl enc -aes-256-cbc -K "$(xxd -p -c 64 k2)" -iv "$IV" -in c.tgz -out c.ct
openssl pkeyutl -encrypt -pubin -inkey alici.pem -pkeyopt rsa_padding_mode:oaep -pkeyopt rsa_oaep_md:sha256 -pkeyopt rsa_mgf1_md:sha256 -in k2 -out k2.ak
python3 -c "import base64,json;print(json.dumps({'ak':base64.b64encode(open('k2.ak','rb').read()).decode(),'ct':base64.b64encode(open('c.ct','rb').read()).decode(),'iv':'$IV'}))" > cikti.sifreli
rm -f k2 k2.ak c.tgz c.ct
echo "NOT: şifreli çıktı hazır"
