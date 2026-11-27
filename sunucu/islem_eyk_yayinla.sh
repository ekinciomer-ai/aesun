#!/bin/bash
# evdenyemekye.com: YALNIZ onaylanan commit'i yayınlar (sunucu/evdenyemekye/onay.txt). Depodaki son hâl değil.
# Statik (public/) ya da Dockerfile'lı uygulama (8000 portu). Yeni sürüm sağlık kontrolünü geçmezse eskisi çalışmaya devam eder.
set -uo pipefail
K=/opt/aesun/sir/eyk_github; B=/opt/evdenyemekye; G=$B/git; AD=eyk-site
SHA=$(grep -E '^SHA=[0-9a-f]{40}$' sunucu/evdenyemekye/onay.txt | cut -d= -f2)
[ -n "$SHA" ] || { echo "NOT: HATA onay.txt içinde geçerli SHA yok"; exit 1; }
[ -f $K ] || { echo "NOT: HATA okuma anahtarı yok (eyk_anahtar)"; exit 1; }
grep -q '^github.com ' /root/.ssh/known_hosts 2>/dev/null || ssh-keyscan -t ed25519 github.com >> /root/.ssh/known_hosts 2>/dev/null
export GIT_SSH_COMMAND="ssh -i $K -o IdentitiesOnly=yes -o BatchMode=yes -o ConnectTimeout=20"
[ -d $G/.git ] || git clone -q git@github.com:ekinciomer-ai/evdenyemekye.git $G || { echo "NOT: HATA depo okunamadı (deploy key eklendi mi?)"; exit 1; }
cd $G && git fetch -q origin '+refs/heads/*:refs/remotes/origin/*' && git cat-file -e "$SHA^{commit}" 2>/dev/null || { echo "NOT: HATA $SHA depoda yok"; exit 1; }
S7=${SHA:0:7}; W=$B/surum/$S7; rm -rf $W; mkdir -p $W; git archive "$SHA" | tar x -C $W
# güvenlik: depoya sır girmiş mi
SIR=$(cd $W && find . -type f \( -name '.env' -o -name '.env.*' ! -name '.env.example' -o -name '*.pem' -o -name '*.key' -o -name 'id_rsa*' -o -name '*.sql' -o -name '*.dump' \) | head -5)
[ -z "$SIR" ] || { echo "NOT: HATA sürüm reddedildi, sır/döküm dosyası var: $(echo $SIR | tr '\n' ' ')"; exit 1; }
# imaj
if [ -f $W/Dockerfile ]; then TUR=uygulama
elif [ -f $W/public/index.html ]; then TUR=statik
  printf 'FROM nginx:1.27-alpine\nCOPY public /usr/share/nginx/html\nRUN sed -i "s/listen  *80;/listen 8000;/; s/listen  *\\[::\\]:80;/listen [::]:8000;/" /etc/nginx/conf.d/default.conf\n' > $W/Dockerfile.yayin
else echo "NOT: HATA ne Dockerfile ne public/index.html var"; exit 1; fi
DF=Dockerfile; [ $TUR = statik ] && DF=Dockerfile.yayin
docker build -q -f $W/$DF -t $AD:$S7 $W >/tmp/eyk_b.txt 2>&1 || { tail -6 /tmp/eyk_b.txt | sed 's/^/NOT: /'; echo "NOT: HATA imaj kurulamadı ($TUR)"; exit 1; }
AG=$(docker inspect ck-caddy -f '{{range $k,$v := .NetworkSettings.Networks}}{{$k}} {{end}}' | tr ' ' '\n' | grep -m1 'ck-dis')
ENV=""; [ -f $B/.env ] && ENV="--env-file $B/.env"
docker rm -f $AD-yeni >/dev/null 2>&1
docker run -d --name $AD-yeni --network "$AG" -m 768m --cpus 1 --pids-limit 256 --security-opt no-new-privileges \
  --restart unless-stopped $ENV -v $B/veri:/veri --log-opt max-size=5m --log-opt max-file=2 $AD:$S7 >/dev/null || { echo "NOT: HATA kapsayıcı başlamadı"; exit 1; }
OK=""; for i in $(seq 1 30); do c=$(docker exec ck-caddy wget -q -S -O /dev/null http://$AD-yeni:8000/ 2>&1 | awk '/HTTP\//{print $2}' | tail -1); [ "$c" = 200 ] && { OK=1; break; }; sleep 2; done
if [ -z "$OK" ]; then
  docker logs --tail 15 $AD-yeni 2>&1 | grep -v -i -E 'password|secret|token|key=' | sed 's/^/NOT: log /'
  docker rm -f $AD-yeni >/dev/null 2>&1; echo "NOT: HATA yeni sürüm sağlık kontrolünü geçemedi; canlıdaki sürüm değişmedi"; exit 1
fi
ONCEKI=$(cat $B/canli 2>/dev/null || true)
docker rm -f $AD >/dev/null 2>&1; docker rename $AD-yeni $AD
[ -n "$ONCEKI" ] && echo "$ONCEKI" > $B/onceki; echo $S7 > $B/canli
# Caddy: alan adı sunucuyu gösteriyorsa gerçek adres, her durumda önizleme adresi
IP=$(curl -s4 --max-time 5 https://api.ipify.org || hostname -I | awk '{print $1}')
ON="eyk.$(echo $IP | tr . -).sslip.io"; DNS=$(getent ahostsv4 evdenyemekye.com | awk 'NR==1{print $1}')
ADRES="$ON"; [ "$DNS" = "$IP" ] && ADRES="evdenyemekye.com, $ON"
EK=/opt/cutkoda/caddy-ek/evdenyemekye.caddy; ESKI=""; [ -f $EK ] && ESKI=$(cat $EK)
{ echo "# evdenyemekye.com (dış geliştirici, onaylı sürüm yayını)"
  echo "$ADRES {"; printf '\tencode zstd gzip\n\theader {\n\t\tStrict-Transport-Security "max-age=31536000"\n\t\tX-Content-Type-Options nosniff\n\t\tReferrer-Policy strict-origin-when-cross-origin\n\t\t-Server\n\t}\n'
  printf '\treverse_proxy %s:8000\n}\n' $AD
  [ "$DNS" = "$IP" ] && printf 'www.evdenyemekye.com {\n\tredir https://evdenyemekye.com{uri} permanent\n}\n'; } > $EK
if docker exec ck-caddy caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile >/tmp/eyk_c.txt 2>&1 && docker exec ck-caddy caddy reload --config /etc/caddy/Caddyfile --adapter caddyfile >>/tmp/eyk_c.txt 2>&1; then :; else
  echo "NOT: Caddy HATA, ayar geri alındı: $(grep -i error /tmp/eyk_c.txt | tail -1 | cut -c1-200)"
  if [ -n "$ESKI" ]; then echo "$ESKI" > $EK; else rm -f $EK; fi
  docker exec ck-caddy caddy reload --config /etc/caddy/Caddyfile --adapter caddyfile >/dev/null 2>&1; exit 1; fi
ls -1t $B/surum | tail -n +4 | while read d; do rm -rf "$B/surum/$d"; done
sleep 5
echo "NOT: canlı sürüm $S7 ($TUR) · önizleme https://$ON → $(curl -s -o /dev/null -w '%{http_code}' --max-time 20 https://$ON/)"
echo "NOT: evdenyemekye.com DNS: ${DNS:-yok} (sunucu $IP) $( [ "$DNS" = "$IP" ] && echo "→ $(curl -s -o /dev/null -w '%{http_code}' --max-time 20 https://evdenyemekye.com/)" || echo '→ A kaydı henüz sunucuyu göstermiyor')"
echo "NOT: diğer siteler: portal $(curl -s -o /dev/null -w '%{http_code}' --max-time 10 https://portal.aksarayenerji.net/) · cutkoda $(curl -s -o /dev/null -w '%{http_code}' --max-time 10 https://cutkoda.com/)"
