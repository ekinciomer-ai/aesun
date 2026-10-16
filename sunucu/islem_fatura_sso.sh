#!/bin/bash
# fatura.aksarayenerji.net tek giriş (SSO): aesun-api'yi günceller, Caddy fatura bloğundaki çalışmayan
# forward_auth (portal.php — yok) yerine aesun-api /v1/sso/dogrula koyar. Yedek + validate + geri alma.
# gesfin kapsayıcılarına DOKUNMAZ (yalnız Caddy yapılandırması yeniden yüklenir).
set -euo pipefail
H=/opt/aesun; CF=/opt/caddy/Caddyfile; C=gesfin-caddy
# 1) aesun-api güncelle (yalnız api servisi)
cp sunucu/aesun/app.py $H/app.py
cd $H && docker compose build -q api && docker compose up -d --no-deps api >/dev/null 2>&1; cd - >/dev/null
for i in $(seq 1 20); do sleep 2; docker exec $C wget -q -O /dev/null --timeout=5 http://aesun-api:8000/v1/saglik 2>/dev/null && break; done
echo "NOT: aesun-api: $(docker exec $C wget -q -O- --timeout=5 http://aesun-api:8000/v1/saglik 2>&1 | cut -c1-160)"
echo "NOT: sso sayfası (iç): $(docker exec $C wget -q -S -O /dev/null --timeout=5 http://aesun-api:8000/sso 2>&1 | head -1)"
# 2) Caddy fatura bloğu
HEDEF=$(docker inspect $C --format '{{range .Mounts}}{{if eq .Source "/opt/caddy/Caddyfile"}}{{.Destination}}{{end}}{{end}}')
[ -z "$HEDEF" ] && { DIR=$(docker inspect $C --format '{{range .Mounts}}{{if eq .Source "/opt/caddy"}}{{.Destination}}{{end}}{{end}}'); [ -n "$DIR" ] && HEDEF="$DIR/Caddyfile"; }
[ -n "$HEDEF" ] || { echo "NOT: Caddyfile kapsayıcıda bulunamadı"; exit 1; }
Y=$CF.yedek-$(date +%Y%m%d%H%M)
cp $CF $Y
python3 - "$CF" <<'EOF'
import re, sys
p = sys.argv[1]; s = open(p).read()
m = re.search(r'^fatura\.aksarayenerji\.net\s*\{', s, re.M)
if not m: sys.exit("fatura bloğu yok")
# blok sonu: eşleşen kapanış
i = m.end(); d = 1
while d and i < len(s):
    if s[i] == '{': d += 1
    elif s[i] == '}': d -= 1
    i += 1
blok = s[m.start():i]
yeni_auth = """	@sso path /sso /sso/*
	handle @sso {
		reverse_proxy aesun-api:8000
	}
	@korunan not path /sso /sso/*
	forward_auth @korunan aesun-api:8000 {
		uri /v1/sso/dogrula
		copy_headers X-AE-Rol
	}
"""
if 'aesun-api:8000' in blok and '/v1/sso/dogrula' in blok:
    print("zaten güncel"); sys.exit(0)
fa = re.search(r'^[ \t]*forward_auth[^\n]*\{\n(?:.*?\n)*?[ \t]*\}\n', blok, re.M)
if not fa: sys.exit("forward_auth alt bloğu bulunamadı")
yeni = blok[:fa.start()] + yeni_auth + blok[fa.end():]
open(p, 'w').write(s[:m.start()] + yeni + s[i:])
print("blok güncellendi")
EOF
if docker exec $C caddy validate --config "$HEDEF" --adapter caddyfile >/tmp/cv.txt 2>&1; then
  docker exec $C caddy reload --config "$HEDEF" --adapter caddyfile >/tmp/cr.txt 2>&1 && echo "NOT: Caddy yeniden yüklendi (fatura SSO)" || { echo "NOT: reload BAŞARISIZ, geri alındı: $(tail -2 /tmp/cr.txt | tr '\n' ' ' | cut -c1-200)"; cp $Y $CF; docker exec $C caddy reload --config "$HEDEF" --adapter caddyfile >/dev/null 2>&1 || true; exit 1; }
else
  echo "NOT: Caddy doğrulaması BAŞARISIZ, geri alındı: $(tail -2 /tmp/cv.txt | tr '\n' ' ' | cut -c1-200)"; cp $Y $CF; exit 1
fi
sleep 2
# 3) dıştan test
k(){ curl -s -o /dev/null -w '%{http_code} %{redirect_url}' --max-time 20 -H 'Accept: text/html' "$1"; }
echo "NOT: test / → $(k https://fatura.aksarayenerji.net/) · /sso → $(k https://fatura.aksarayenerji.net/sso) · /api/x → $(curl -s -o /dev/null -w '%{http_code}' -H 'Accept: application/json' https://fatura.aksarayenerji.net/api/x)"
echo "NOT: yanlış belirteç → $(curl -s -o /dev/null -w '%{http_code}' -X POST -H 'Content-Type: application/json' -d '{"t":"0000000000000000000000000000000000000000000000000000000000000000"}' https://fatura.aksarayenerji.net/sso/giris) (401 beklenir)"
echo "NOT: gesfin kapsayıcıları: $(docker ps --filter name=gesfin --format '{{.Names}} {{.Status}}' | tr '\n' ';')"
