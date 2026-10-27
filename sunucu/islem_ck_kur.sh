#!/bin/bash
# CutkodA kurulumu / güncellemesi (ns1). Diğer uygulamalara dokunmaz; Caddy'ye yalnız cutkoda blokları eklenir.
set -euo pipefail
H=/opt/cutkoda; K=$H/kod; D=$H/ssh
export GIT_SSH_COMMAND="ssh -i $D/id_ed25519 -o UserKnownHostsFile=$D/known_hosts -o IdentitiesOnly=yes"
if [ -d $K/.git ]; then git -C $K fetch -q origin main && git -C $K reset -q --hard origin/main
else git clone -q --depth 1 git@github.com:ekinciomer-ai/cutkoda.git $K; fi
echo "NOT: kod: $(git -C $K log -1 --format='%h %s' | cut -c1-80)"
# sırlar sunucuda üretilir, hiçbir yere yazılmaz
if [ ! -f $H/.env ]; then
  umask 077; P=$(openssl rand -hex 24)
  printf 'POSTGRES_PASSWORD=%s\nCK_DB_URL=postgresql://cutkoda:%s@ck-db:5432/cutkoda\n' "$P" "$P" > $H/.env
  echo "NOT: .env üretildi (yalnız root)"
fi
chmod 600 $H/.env
# yazma anahtarlarının özetleri (yalnız SHA-256) ck_anahtar.yml ile yazılır
mkdir -p $H/anahtar; [ -f $H/anahtar/anahtarlar.json ] || echo '{}' > $H/anahtar/anahtarlar.json
rm -f /etc/cron.d/cutkoda-anahtar
# site görselleri (depoda yok): yayındaki siteden bir kez indirilir
mkdir -p $K/site/assets
for f in akis.jpg gok.jpg; do
  [ -s $K/site/assets/$f ] || [ -s $H/assets/$f ] || { mkdir -p $H/assets; curl -sfL --max-time 60 -o $H/assets/$f "https://cutkoda-creator-cuts.lovable.app/assets/$f" || true; }
  [ -s $K/site/assets/$f ] || cp $H/assets/$f $K/site/assets/$f 2>/dev/null || true
done
echo "NOT: görseller: $(ls -la $K/site/assets | awk 'NR>3{print $9" "$5}' | tr '\n' ' ')"
cd $K
docker compose -p cutkoda build -q
docker compose -p cutkoda up -d
sleep 12
echo "NOT: kapsayıcılar: $(docker ps --filter name=ck- --format '{{.Names}} {{.Status}}' | tr '\n' ' ')"
# --- Caddy: yalnız cutkoda blokları, doğrulama ve geri alma ile ---
CF=/opt/caddy/Caddyfile; C=gesfin-caddy
HEDEF=$(docker inspect $C --format '{{range .Mounts}}{{if eq .Source "/opt/caddy/Caddyfile"}}{{.Destination}}{{end}}{{end}}')
if [ -n "$HEDEF" ] && ! grep -q '^cutkoda.com' $CF; then
  cp $CF $CF.yedek-$(date +%Y%m%d%H%M)
  cat >> $CF <<'BLOK'

(ck_ortak) {
	tls {
		issuer acme {
			disable_http_challenge
		}
	}
	encode zstd gzip
	header {
		Strict-Transport-Security "max-age=31536000"
		X-Content-Type-Options nosniff
		Referrer-Policy strict-origin-when-cross-origin
		-Server
	}
}

cutkoda.com {
	import ck_ortak
	reverse_proxy ck-web:80
}

www.cutkoda.com {
	import ck_ortak
	redir https://cutkoda.com{uri} permanent
}

api.cutkoda.com {
	import ck_ortak
	reverse_proxy ck-api:8000
}
BLOK
  if docker exec $C caddy validate --config "$HEDEF" --adapter caddyfile >/tmp/cv.txt 2>&1; then
    docker exec $C caddy reload --config "$HEDEF" --adapter caddyfile && echo "NOT: Caddy yeniden yüklendi (cutkoda blokları eklendi)"
  else
    echo "NOT: Caddy doğrulaması BAŞARISIZ, geri alındı: $(tail -2 /tmp/cv.txt | tr '\n' ' ' | cut -c1-200)"
    cp $(ls -t $CF.yedek-* | head -1) $CF; exit 1
  fi
else
  echo "NOT: Caddy blokları zaten var"
fi
sleep 5
echo "NOT: iç site: $(docker exec gesfin-caddy wget -qO- http://ck-web/ 2>/dev/null | grep -o '<title>[^<]*' | head -1)"
echo "NOT: iç sağlık: $(docker exec gesfin-caddy wget -qO- http://ck-api:8000/v1/saglik 2>&1 | cut -c1-200)"
echo "NOT: DNS cutkoda.com: $(getent hosts cutkoda.com | awk '{print $1}' | head -2 | tr '\n' ' ') · api: $(getent hosts api.cutkoda.com | awk '{print $1}' | head -1)"
echo "NOT: dış: $(curl -s -o /dev/null -w '%{http_code}' --max-time 15 https://cutkoda.com/ 2>&1) · api $(curl -s --max-time 15 https://api.cutkoda.com/v1/saglik 2>&1 | cut -c1-120)"
echo "NOT: bellek: $(docker stats --no-stream --format '{{.Name}} {{.MemUsage}}' ck-db ck-api ck-web | tr '\n' ' ')"
