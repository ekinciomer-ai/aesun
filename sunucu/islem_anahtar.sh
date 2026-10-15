#!/bin/bash
# ns1 için epias-ptf salt-okunur dağıtım anahtarı üretir (yoksa). Özel anahtar sunucuda kalır; açık anahtar yazdırılır.
set -euo pipefail
D=/opt/aesun/ssh; mkdir -p $D
[ -f $D/id_ed25519 ] || ssh-keygen -q -t ed25519 -N '' -C 'ns1-aesun-api (salt okunur)' -f $D/id_ed25519
ssh-keyscan -t ed25519 github.com > $D/known_hosts 2>/dev/null
chown -R 1001:1001 $D; chmod 700 $D; chmod 600 $D/id_ed25519
echo "NOT: ACIK $(cat $D/id_ed25519.pub)"
