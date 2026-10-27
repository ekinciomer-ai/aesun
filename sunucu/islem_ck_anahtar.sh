#!/bin/bash
# CutkodA: gizli depoyu okumak için salt okunur dağıtım anahtarı üretir (yoksa). Özel anahtar sunucuda kalır.
set -euo pipefail
D=/opt/cutkoda/ssh; mkdir -p $D; chmod 700 /opt/cutkoda $D
[ -f $D/id_ed25519 ] || ssh-keygen -q -t ed25519 -N '' -C 'ns1-ck (salt okunur)' -f $D/id_ed25519
ssh-keyscan -t ed25519 github.com > $D/known_hosts 2>/dev/null
chmod 600 $D/id_ed25519
echo "NOT: ACIK $(cat $D/id_ed25519.pub)"
V=$(docker volume ls --format '{{.Name}}' | grep -E 'aesun_veri$' | head -1)
echo "NOT: anahtar birimi: $V · anahtar adları: $(python3 -c "import json;print(' '.join(json.load(open('/var/lib/docker/volumes/$V/_data/anahtarlar.json')).keys()))" 2>&1 | cut -c1-300)"
