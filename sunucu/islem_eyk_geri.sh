#!/bin/bash
# evdenyemekye.com: bir önceki yayınlanan sürüme döner (aynı kurallarla).
B=/opt/evdenyemekye; AD=eyk-site; O=$(cat $B/onceki 2>/dev/null)
[ -n "$O" ] && docker image inspect $AD:$O >/dev/null 2>&1 || { echo "NOT: HATA dönülecek önceki sürüm yok"; exit 1; }
ENV=""; [ -f $B/.env ] && ENV="--env-file $B/.env"
C=$(cat $B/canli); docker rm -f $AD >/dev/null
docker run -d --name $AD --network eyk-ag -m 768m --memory-swap 768m --cpus 1 --pids-limit 256 --security-opt no-new-privileges \
  --cap-drop NET_RAW --cap-drop SYS_ADMIN --cap-drop NET_ADMIN --restart unless-stopped $ENV -v $B/veri:/veri --log-opt max-size=5m --log-opt max-file=2 --label eyk=1 $AD:$O >/dev/null
echo $O > $B/canli; echo $C > $B/onceki; echo onayli > $B/mod
echo "NOT: geri dönüldü: canlı $O (önceki $C) · otomatik yayın kapatıldı (tekrar açmak: eyk_oto_ac)"
