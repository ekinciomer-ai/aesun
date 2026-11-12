#!/bin/bash
# gesfin GitHub deposu için sunucuya özel dağıtım anahtarı (yalnız ekinciomer-ai/gesfin). Açık anahtar NOT: ile basılır.
command -v git >/dev/null || { DEBIAN_FRONTEND=noninteractive apt-get install -y -qq git >/dev/null; }
D=/opt/aesun/sir; mkdir -p $D; chmod 700 $D
[ -f $D/gesfin_github ] || ssh-keygen -q -t ed25519 -N '' -C 'sunucu-gesfin-deploy' -f $D/gesfin_github
chmod 600 $D/gesfin_github
echo "NOT: ACIK $(cat $D/gesfin_github.pub)"
echo "NOT: git: $(git --version)"
