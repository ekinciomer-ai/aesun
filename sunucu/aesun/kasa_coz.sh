#!/bin/bash
# Kasadaki bir değeri çözer ve yalnız standart çıktıya yazar (root). Kullanım: kasa_coz.sh <ad>
# Değeri ekrana basan komutlar iş günlüğüne yazılmamalı; çağıran betik değeri değişkene alıp doğrudan kullanır.
set -euo pipefail
AD=${1:?ad}; [[ "$AD" =~ ^[a-z0-9_]{2,40}$ ]] || { echo "geçersiz ad" >&2; exit 2; }
F=/var/lib/docker/volumes/aesun_aesun_veri/_data/kasa/$AD.sifreli
[ -f "$F" ] || { echo "kasada yok: $AD" >&2; exit 3; }
python3 - "$F" /opt/aesun/sir/ozel.pem <<'PY'
import base64, json, subprocess, sys, tempfile
d = json.load(open(sys.argv[1]))
with tempfile.TemporaryDirectory() as t:
    open(t+"/ak","wb").write(base64.b64decode(d["ak"])); open(t+"/ct","wb").write(base64.b64decode(d["ct"]))
    subprocess.run(["openssl","pkeyutl","-decrypt","-inkey",sys.argv[2],"-pkeyopt","rsa_padding_mode:oaep","-pkeyopt","rsa_oaep_md:sha256","-in",t+"/ak","-out",t+"/k"],check=True)
    k = open(t+"/k","rb").read().hex()
    sys.stdout.buffer.write(subprocess.run(["openssl","enc","-d","-aes-256-cbc","-K",k,"-iv",d["iv"],"-in",t+"/ct"],check=True,capture_output=True).stdout)
PY
