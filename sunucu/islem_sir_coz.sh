#!/bin/bash
# epias-ptf'e yazılan şifreli sır paketini (sunucu/isler.env.sifreli) çözer → /opt/aesun/isler.env (root-only), isler kapsayıcısını yeniler.
set -euo pipefail
D=/opt/aesun/sir; T=$(mktemp -d); trap 'rm -rf $T' EXIT
curl -sf --max-time 30 "https://raw.githubusercontent.com/ekinciomer-ai/epias-ptf/main/sunucu/isler.env.sifreli?t=$(date +%s)" -o $T/p || { echo "NOT: şifreli paket bulunamadı"; exit 1; }
python3 - "$T/p" "$T" <<'PY'
import base64, json, sys
d = json.load(open(sys.argv[1])); t = sys.argv[2]
open(t + "/ak", "wb").write(base64.b64decode(d["ak"])); open(t + "/ct", "wb").write(base64.b64decode(d["ct"])); open(t + "/iv", "w").write(d["iv"])
PY
openssl pkeyutl -decrypt -inkey $D/ns1.pem -pkeyopt rsa_padding_mode:oaep -pkeyopt rsa_oaep_md:sha256 -in $T/ak -out $T/k
umask 077
openssl enc -d -aes-256-cbc -K "$(xxd -p -c 64 $T/k)" -iv "$(cat $T/iv)" -in $T/ct -out /opt/aesun/isler.env.yeni
mv /opt/aesun/isler.env.yeni /opt/aesun/isler.env; chmod 600 /opt/aesun/isler.env
echo "NOT: isler.env yazıldı: $(wc -l < /opt/aesun/isler.env) satır, $(grep -c '=.' /opt/aesun/isler.env) dolu değişken ($(cut -d= -f1 /opt/aesun/isler.env | tr '\n' ' '))"
cd /opt/aesun && docker compose up -d --force-recreate isler >/dev/null 2>&1 && echo "NOT: isler yenilendi"
