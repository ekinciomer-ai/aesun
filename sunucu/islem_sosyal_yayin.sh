#!/bin/bash
# Sosyal Stüdyo'yu https://sosyal.aksarayenerji.net adresinden açar (Caddy, gesfin-caddy).
# Ön koşul: kasada sosyal_parola ve alan adının bu sunucuyu göstermesi. Parolasız asla açılmaz.
# Caddyfile yedeklenir, doğrulanır; dışarıdan deneme başarısızsa blok kaldırılıp geri alınır.
set -uo pipefail
AD=sosyal.aksarayenerji.net; CF=/opt/caddy/Caddyfile; C=gesfin-caddy; HEDEF=/etc/caddy/Caddyfile; D=/opt/sosyal
/opt/aesun/kasa_coz.sh sosyal_parola >/dev/null 2>&1 || { echo "NOT: HATA kasada sosyal_parola yok; önce portal → Kasa'dan girilmeli. Yayın yapılmadı."; exit 1; }
BEN=$(curl -s --max-time 10 https://api.ipify.org || hostname -I | awk '{print $1}')
DNS=$(getent hosts $AD | awk '{print $1}' | head -1)
echo "NOT: $AD → ${DNS:-çözülmedi} · sunucu $BEN"
[ -n "$DNS" ] && [ "$DNS" = "$BEN" ] || { echo "NOT: HATA alan adı henüz bu sunucuyu göstermiyor; birkaç dakika sonra tekrar deneyin."; exit 1; }
# 1) dışarıda kipi + yeniden kurulum (parola kasadan anahtar.env'e gelir, kapsayıcı gesfin-net'e katılır)
grep -q '^SOSYAL_DISARIDA=' $D/sosyal.env && sed -i 's/^SOSYAL_DISARIDA=.*/SOSYAL_DISARIDA=1/' $D/sosyal.env || echo 'SOSYAL_DISARIDA=1' >> $D/sosyal.env
bash sunucu/islem_sosyal_kur.sh || { echo "NOT: HATA kurulum başarısız, yayın yapılmadı"; exit 1; }
docker exec $C wget -q -O /dev/null -T 10 http://sosyal-studyo:8000/saglik && echo "NOT: Caddy kapsayıcıya ulaşıyor" || { echo "NOT: HATA Caddy sosyal-studyo'ya ulaşamıyor"; exit 1; }
# 2) Caddy bloğu
YEDEK=$CF.yedek-$(date +%Y%m%d%H%M%S); cp $CF $YEDEK
if ! grep -q "^$AD {" $CF; then
cat >> $CF <<BLOK

$AD {
	encode zstd gzip
	header {
		Strict-Transport-Security "max-age=31536000"
		X-Robots-Tag "noindex, nofollow"
		X-Content-Type-Options nosniff
		X-Frame-Options DENY
		Referrer-Policy no-referrer
		-Server
	}
	reverse_proxy sosyal-studyo:8000
}
BLOK
fi
geri_al() { cp $YEDEK $CF; docker exec $C caddy reload --config $HEDEF --adapter caddyfile >/dev/null 2>&1; echo "NOT: Caddy geri alındı"; }
if ! docker exec $C caddy validate --config $HEDEF --adapter caddyfile >/tmp/cv.txt 2>&1; then
  echo "NOT: HATA Caddy doğrulaması: $(grep -i error /tmp/cv.txt | tail -1 | cut -c1-220)"; geri_al; exit 1
fi
docker exec $C caddy reload --config $HEDEF --adapter caddyfile && echo "NOT: Caddy yüklendi"
# 3) dışarıdan deneme (sertifika birkaç dakika sürebilir)
for i in $(seq 1 18); do K=$(curl -s -o /dev/null -w '%{http_code}' --max-time 10 https://$AD/); [ "$K" = 200 ] && break; sleep 10; done
A=$(curl -s -o /dev/null -w '%{http_code}' --max-time 10 https://$AD/api/durum)
echo "NOT: giriş sayfası $K (200 beklenir) · girişsiz veri $A (401 beklenir)"
if [ "$K" != 200 ] || [ "$A" != 401 ]; then echo "NOT: HATA dışarıdan deneme başarısız"; geri_al; exit 1; fi
echo "NOT: diğer siteler: api $(curl -s -o /dev/null -w '%{http_code}' --max-time 10 https://api.aksarayenerji.net/v1/saglik) portal $(curl -s -o /dev/null -w '%{http_code}' --max-time 10 https://portal.aksarayenerji.net/) fatura $(curl -s -o /dev/null -w '%{http_code}' --max-time 10 https://fatura.aksarayenerji.net/)"
echo "NOT: yayında: https://$AD"
