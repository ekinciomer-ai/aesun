#!/bin/bash
# Bağımsız demo (Mining Takip Sistemi): http://185.22.184.51  · kullanıcı/şifre demo/demo (Caddy basic_auth).
# Yalnız aesun-api yeniden derlenir ve Caddy'ye IP bloğu eklenir; diğer uygulamalara dokunulmaz. Güvenlik bölümü yalnız okur.
set -euo pipefail
IP=185.22.184.51
H=/opt/aesun
cp -r sunucu/aesun/. $H/
cd $H
docker compose build -q api
docker compose up -d --no-deps api
sleep 10
CF=/opt/caddy/Caddyfile; C=gesfin-caddy
HEDEF=$(docker inspect $C --format '{{range .Mounts}}{{if eq .Source "/opt/caddy/Caddyfile"}}{{.Destination}}{{end}}{{end}}')
SURUM=$(docker exec $C caddy version | awk '{print $1}')
echo "NOT: caddy $SURUM"
case "$SURUM" in v2.[0-7].*) YON=basicauth;; *) YON=basic_auth;; esac
if ! grep -q "^http://$IP" $CF; then
  HASH=$(docker exec $C caddy hash-password --plaintext demo)
  cp $CF $CF.yedek-$(date +%Y%m%d%H%M)
  cat >> $CF <<BLOK

http://$IP {
	$YON {
		demo $HASH
	}
	encode zstd gzip
	header {
		X-Robots-Tag "noindex, nofollow"
		X-Content-Type-Options nosniff
		X-Frame-Options DENY
		Referrer-Policy no-referrer
		-Server
	}
	@demo path / /veri.json
	handle @demo {
		reverse_proxy aesun-api:8000
	}
	handle {
		respond "Bulunamadı" 404
	}
}
BLOK
  if docker exec $C caddy validate --config "$HEDEF" --adapter caddyfile >/tmp/cv.txt 2>&1; then
    docker exec $C caddy reload --config "$HEDEF" --adapter caddyfile && echo "NOT: Caddy yeniden yüklendi (demo IP bloğu eklendi)"
  else
    echo "NOT: Caddy doğrulaması BAŞARISIZ, geri alındı: $(grep -i error /tmp/cv.txt | tail -2 | tr '\n' ' ' | cut -c1-250)"
    cp $(ls -t $CF.yedek-* | head -1) $CF
    exit 1
  fi
else
  echo "NOT: demo IP bloğu zaten var"
fi
sleep 5
U=http://$IP
echo "NOT: şifresiz: $(curl -s -o /dev/null -w '%{http_code}' --max-time 15 $U/)"
echo "NOT: yanlış şifre: $(curl -s -o /dev/null -w '%{http_code}' --max-time 15 -u demo:yanlis $U/)"
echo "NOT: demo/demo sayfa: $(curl -s -o /tmp/d.html -w '%{http_code}' --max-time 15 -u demo:demo $U/) · başlık: $(grep -o '<title>[^<]*' /tmp/d.html | cut -c8-)"
echo "NOT: demo/demo veri: $(curl -s -w ' %{http_code}' --max-time 15 -u demo:demo $U/veri.json | tail -c 120)"
echo "NOT: şirket adı sayfada: $(grep -ci 'aksaray' /tmp/d.html || true) kez"
echo "NOT: IP'den API kapalı: $(curl -s -o /dev/null -w '%{http_code}' --max-time 15 -u demo:demo $U/v1/saglik)"
echo "NOT: alan adından demo kapalı: $(curl -s -o /dev/null -w '%{http_code}' --max-time 15 https://api.aksarayenerji.net/) / $(curl -s -o /dev/null -w '%{http_code}' --max-time 15 https://api.aksarayenerji.net/veri.json)"
echo "NOT: eski açık demo verisi: $(curl -s -o /dev/null -w '%{http_code}' --max-time 15 https://api.aksarayenerji.net/v1/acik/n8n/demo_durum.json)"
echo "NOT: api sağlık: $(curl -s --max-time 15 https://api.aksarayenerji.net/v1/saglik | cut -c1-120)"
# --- güvenlik durumu (yalnız okuma) ---
echo "NOT: güvenlik duvarı: $( (ufw status 2>/dev/null | head -1) || echo 'ufw yok') · nft kural: $(nft list ruleset 2>/dev/null | grep -c 'drop\|reject' || true)"
echo "NOT: dışa açık portlar: $(ss -H -tlnp | awk '{print $4}' | grep -v '127.0.0.1\|\[::1\]\|127.0.0.53' | sed 's/.*://' | sort -un | tr '\n' ' ')"
echo "NOT: docker yayınlanan portlar: $(docker ps --format '{{.Names}}={{.Ports}}' | grep -- '->' | sed 's/, /,/g' | tr '\n' ' ' | cut -c1-300)"
echo "NOT: ssh: $(sshd -T 2>/dev/null | grep -E '^(port|permitrootlogin|passwordauthentication|pubkeyauthentication|maxauthtries) ' | tr '\n' ' ')"
echo "NOT: fail2ban: $(systemctl is-active fail2ban 2>/dev/null || echo yok) · son 24 saat başarısız ssh: $(journalctl -u ssh -u sshd --since '24 hours ago' 2>/dev/null | grep -c 'Failed\|Invalid user' || true)"
echo "NOT: yetkili anahtar sayısı (root): $(grep -c '^ssh-\|^ecdsa-' /root/.ssh/authorized_keys 2>/dev/null || echo 0)"
