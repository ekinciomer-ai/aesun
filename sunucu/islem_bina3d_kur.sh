#!/bin/bash
# Konut Bloğu 3D tanıtım sitesi: https://185.22.184.51/konut-blogu/  (şifresiz, noindex)
# Bağımsız küçük nginx kapsayıcısı (bina3d-web) /opt/bina3d'yi sunar; Caddy IP bloğuna yalnız bu yol eklenir.
# Demo'nun şifresi diğer yollar için aynen kalır. Caddy doğrulanmazsa eski hâline döner.
set -euo pipefail
echo "NOT: caddy kapsayıcıları: $(docker ps --format '{{.Names}}' | grep -i caddy | tr '\n' ' ') · Caddyfile var mı: $(ls /opt/caddy/Caddyfile 2>&1)"
IP=185.22.184.51; CF=/opt/caddy/Caddyfile
C=$(for n in $(docker ps --format "{{.Names}}"); do docker inspect $n --format "{{range .Mounts}}{{.Source}} {{end}}" | grep -q "$CF" && echo $n && break; done || true)
[ -n "$C" ] || { echo "NOT: Caddyfile kullanan kapsayıcı yok; caddy kapsayıcıları: $(docker ps --format "{{.Names}}" | grep -i caddy | tr "\n" " ")"; exit 1; }
HEDEF=$(docker inspect $C --format '{{range .Mounts}}{{if eq .Source "'$CF'"}}{{.Destination}}{{end}}{{end}}')
echo "NOT: caddy kapsayıcısı $C ($HEDEF)"
D=/opt/bina3d/konut-blogu
mkdir -p $D
[ -d /opt/bina3d/konut-blogu.onceki ] && rm -rf /opt/bina3d/konut-blogu.onceki
cp -r $D /opt/bina3d/konut-blogu.onceki 2>/dev/null || true
cp sunucu/bina3d/* $D/
chmod -R a+rX /opt/bina3d
AG=$(docker inspect $C --format '{{range $k,$v := .NetworkSettings.Networks}}{{$k}} {{end}}' | awk '{print $1}')
echo "NOT: caddy ağı $AG"
if ! docker ps --format '{{.Names}}' | grep -qx bina3d-web; then
  docker rm -f bina3d-web >/dev/null 2>&1 || true
  docker run -d --name bina3d-web --restart unless-stopped --network "$AG" --memory 64m --cpus 0.5 \
    -v /opt/bina3d:/usr/share/nginx/html:ro nginx:1.27-alpine >/dev/null
fi
sleep 3
echo "NOT: kapsayıcı iç test: $(docker exec bina3d-web wget -qO- http://127.0.0.1/konut-blogu/ | grep -o '<title>[^<]*' | cut -c8-)"
cp $CF $CF.yedek-$(date +%Y%m%d%H%M%S)
python3 - "$CF" "$IP" <<'PY'
import re, sys
p, ip = sys.argv[1:3]
s = open(p).read()
m = re.search(r"\n" + re.escape(ip) + r" \{.*?\n\}\n?", s, re.S)
if not m: print("NOT: IP bloğu bulunamadı"); sys.exit(1)
b = m.group(0)
if "bina3d-web" in b: print("NOT: konut-blogu yolu zaten var"); sys.exit(0)
b2 = b.replace("\tbasic_auth {", "\t@korumali not path /konut-blogu /konut-blogu/*\n\tbasic_auth @korumali {", 1)
ek = """	redir /konut-blogu /konut-blogu/ 301
	handle /konut-blogu/* {
		header X-Frame-Options SAMEORIGIN
		reverse_proxy bina3d-web:80
	}
"""
b2 = b2.replace("\t@demo path", ek + "\t@demo path", 1)
if b2 == b or "@korumali" not in b2: print("NOT: blok beklenen biçimde değil"); sys.exit(1)
open(p, "w").write(s.replace(b, b2))
print("NOT: Caddyfile güncellendi")
PY
if docker exec $C caddy validate --config $HEDEF --adapter caddyfile >/tmp/cv.txt 2>&1; then
  docker exec $C caddy reload --config $HEDEF --adapter caddyfile && echo "NOT: Caddy yüklendi"
else
  echo "NOT: doğrulama BAŞARISIZ, geri alındı: $(grep -i error /tmp/cv.txt | tail -1 | cut -c1-220)"
  cp $(ls -t $CF.yedek-* | head -1) $CF; exit 1
fi
sleep 3
U=https://$IP
echo "NOT: site: $(curl -sk -o /tmp/k.html -w '%{http_code}' --max-time 15 $U/konut-blogu/) $(grep -o '<title>[^<]*' /tmp/k.html | cut -c8-) · bina.html $(curl -sk -o /dev/null -w '%{http_code} %{size_download}' --max-time 30 $U/konut-blogu/bina.html) · plan $(curl -sk -o /dev/null -w '%{http_code}' --max-time 15 $U/konut-blogu/plan-A.jpg)"
echo "NOT: geçerli sertifika ile: $(curl -s -o /dev/null -w '%{http_code}' --max-time 15 $U/konut-blogu/ || echo hata)"
echo "NOT: demo hâlâ şifreli: $(curl -sk -o /dev/null -w '%{http_code}' --max-time 10 $U/) / demo:demo $(curl -sk -o /dev/null -w '%{http_code}' --max-time 10 -u demo:demo $U/)"
echo "NOT: diğer siteler: api $(curl -s -o /dev/null -w '%{http_code}' --max-time 10 https://api.aksarayenerji.net/v1/saglik)"
