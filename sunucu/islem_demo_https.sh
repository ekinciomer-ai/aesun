#!/bin/bash
# 80 portu başka uygulamada (mirsoft_web) olduğundan demo Caddy'nin 443'ünden HTTPS ile sunulur:
# IP için Let's Encrypt kısa ömürlü sertifika (tls-alpn), SNI'siz istemciler için default_sni. Doğrulama + geri alma.
set -euo pipefail
IP=185.22.184.51; CF=/opt/caddy/Caddyfile; C=gesfin-caddy; HEDEF=/etc/caddy/Caddyfile
docker inspect $C --format '{{range .Mounts}}{{.Destination}} {{end}}' | grep -q /etc/caddy/Caddyfile || { echo "NOT: Caddyfile bağlama yolu farklı"; exit 1; }
cp $CF $CF.yedek-$(date +%Y%m%d%H%M%S)
HASH=$(docker exec $C caddy hash-password --plaintext demo)
python3 - "$CF" "$IP" "$HASH" <<'PY'
import re, sys
p, ip, h = sys.argv[1:4]
s = open(p).read()
# önceki (işe yaramayan) http://IP bloğunu kaldır
s = re.sub(r"\n*http://" + re.escape(ip) + r" \{.*?\n\}\n", "\n", s, flags=re.S)
s = re.sub(r"\n*" + re.escape(ip) + r" \{.*?\n\}\n", "\n", s, flags=re.S)
# genel blok: SNI göndermeyen istemciler (IP ile bağlanan tarayıcılar) için
if re.match(r"\s*\{", s):
    if "default_sni" not in s.split("}", 1)[0]:
        s = re.sub(r"^\s*\{", "{\n\tdefault_sni " + ip, s, count=1)
else:
    s = "{\n\tdefault_sni " + ip + "\n}\n\n" + s
s = s.rstrip() + f"""

{ip} {{
	tls {{
		issuer acme {{
			profile shortlived
			disable_http_challenge
		}}
	}}
	basic_auth {{
		demo {h}
	}}
	encode zstd gzip
	header {{
		Strict-Transport-Security "max-age=86400"
		X-Robots-Tag "noindex, nofollow"
		X-Content-Type-Options nosniff
		X-Frame-Options DENY
		Referrer-Policy no-referrer
		-Server
	}}
	@demo path / /veri.json
	handle @demo {{
		reverse_proxy aesun-api:8000
	}}
	handle {{
		respond "Bulunamadi" 404
	}}
}}
"""
open(p, "w").write(s)
PY
if docker exec $C caddy validate --config $HEDEF --adapter caddyfile >/tmp/cv.txt 2>&1; then
  docker exec $C caddy reload --config $HEDEF --adapter caddyfile && echo "NOT: Caddy yüklendi (IP HTTPS bloğu)"
else
  echo "NOT: doğrulama BAŞARISIZ, geri alındı: $(grep -i error /tmp/cv.txt | tail -1 | cut -c1-220)"
  cp $(ls -t $CF.yedek-* | head -1) $CF; exit 1
fi
for i in $(seq 1 12); do curl -s -o /dev/null --max-time 8 https://$IP/ 2>/dev/null && break; sleep 10; done
U=https://$IP
echo "NOT: geçerli sertifika: $(curl -s -o /dev/null -w '%{http_code}' --max-time 10 $U/ || echo 'YOK') · veren: $(echo | openssl s_client -connect $IP:443 2>/dev/null | openssl x509 -noout -issuer -enddate 2>/dev/null | tr '\n' ' ' | cut -c1-120)"
echo "NOT: şifresiz/yanlış: $(curl -sk -o /dev/null -w '%{http_code}' --max-time 10 $U/) / $(curl -sk -o /dev/null -w '%{http_code}' --max-time 10 -u demo:x $U/)"
echo "NOT: demo/demo: $(curl -sk -o /tmp/d.html -w '%{http_code}' --max-time 10 -u demo:demo $U/) $(grep -o '<title>[^<]*' /tmp/d.html | cut -c8-) · veri $(curl -sk -o /dev/null -w '%{http_code}' --max-time 10 -u demo:demo $U/veri.json) · şirket adı $(grep -ci aksaray /tmp/d.html || true)"
echo "NOT: IP'de başka yol: $(curl -sk -o /dev/null -w '%{http_code}' --max-time 10 -u demo:demo $U/v1/saglik) · diğer siteler: api $(curl -s -o /dev/null -w '%{http_code}' --max-time 10 https://api.aksarayenerji.net/v1/saglik) fatura $(curl -s -o /dev/null -w '%{http_code}' --max-time 10 https://fatura.aksarayenerji.net/)"
echo "NOT: caddy hata: $(docker logs --since 3m $C 2>&1 | grep -i '"error"' | grep -i "$IP\|acme\|tls" | tail -1 | cut -c1-250)"
