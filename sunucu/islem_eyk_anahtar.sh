#!/bin/bash
# evdenyemekye.com: sunucunun GitHub okuma anahtarı (yalnız ekinciomer-ai/evdenyemekye, salt okunur deploy key). Açık anahtar NOT: ile basılır.
command -v git >/dev/null || { DEBIAN_FRONTEND=noninteractive apt-get install -y -qq git >/dev/null; }
D=/opt/aesun/sir; mkdir -p $D; chmod 700 $D
[ -f $D/eyk_github ] || ssh-keygen -q -t ed25519 -N '' -C 'sunucu-evdenyemekye-okuma' -f $D/eyk_github
chmod 600 $D/eyk_github
mkdir -p /opt/evdenyemekye/veri; chmod 750 /opt/evdenyemekye
echo "NOT: ACIK $(cat $D/eyk_github.pub)"
