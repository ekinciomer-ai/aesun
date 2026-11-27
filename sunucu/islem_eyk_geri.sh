#!/bin/bash
# evdenyemekye.com: bir önceki yayınlanan sürüme döner.
B=/opt/evdenyemekye; AD=eyk-site; O=$(cat $B/onceki 2>/dev/null)
[ -n "$O" ] && docker image inspect $AD:$O >/dev/null 2>&1 || { echo "NOT: HATA dönülecek önceki sürüm yok"; exit 1; }
AG=$(docker inspect $AD -f '{{range $k,$v := .NetworkSettings.Networks}}{{$k}} {{end}}' | awk '{print $1}')
ENV=""; [ -f $B/.env ] && ENV="--env-file $B/.env"
C=$(cat $B/canli); docker rm -f $AD >/dev/null
docker run -d --name $AD --network "$AG" -m 768m --cpus 1 --pids-limit 256 --security-opt no-new-privileges --restart unless-stopped $ENV -v $B/veri:/veri --log-opt max-size=5m --log-opt max-file=2 $AD:$O >/dev/null
echo $O > $B/canli; echo $C > $B/onceki; echo "NOT: geri dönüldü: canlı $O (önceki $C)"
