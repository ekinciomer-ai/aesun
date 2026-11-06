#!/bin/bash
# Sosyal Stüdyo'yu https://sosyal.aksarayenerji.net adresinden açar (Caddy: ck-caddy, ek dosya sosyal.caddy).
# Ön koşul: kasada sosyal_parola ve alan adının bu sunucuyu göstermesi. Parolasız asla açılmaz.
# Ek dosya doğrulanır; dışarıdan deneme başarısızsa dosya kaldırılıp Caddy eski haline döner.
set -uo pipefail
AD=sosyal.aksarayenerji.net; C=ck-caddy; HEDEF=/etc/caddy/Caddyfile; D=/opt/sosyal
docker inspect $C >/dev/null 2>&1 || { echo "NOT: HATA $C kapsayıcısı yok"; exit 1; }
/opt/aesun/kasa_coz.sh sosyal_parola >/dev/null 2>&1 || { echo "NOT: HATA kasada sosyal_parola yok; önce portal → Kasa'dan girilmeli. Yayın yapılmadı."; exit 1; }
BEN=$(curl -s --max-time 10 https://api.ipify.org || hostname -I | awk '{print $1}')
DNS=$(getent hosts $AD | awk '{print $1}' | head -1)
echo "NOT: $AD → ${DNS:-çözülmedi} · sunucu $BEN"
[ -n "$DNS" ] && [ "$DNS" = "$BEN" ] || { echo "NOT: HATA alan adı henüz bu sunucuyu göstermiyor; birkaç dakika sonra tekrar deneyin."; exit 1; }
# 1) dışarıda kipi + yeniden kurulum (parola kasadan anahtar.env'e gelir, kapsayıcı gesfin-net'e katılır)
grep -q '^SOSYAL_DISARIDA=' $D/sosyal.env && sed -i 's/^SOSYAL_DISARIDA=.*/SOSYAL_DISARIDA=1/' $D/sosyal.env || echo 'SOSYAL_DISARIDA=1' >> $D/sosyal.env
bash sunucu/islem_sosyal_kur.sh || { echo "NOT: HATA kurulum başarısız, yayın yapılmadı"; exit 1; }
docker exec $C wget -q -O /dev/null -T 10 http://sosyal-studyo:8000/saglik && echo "NOT: Caddy kapsayıcıya ulaşıyor" || { echo "NOT: HATA Caddy sosyal-studyo'ya ulaşamıyor"; exit 1; }
# 2) Caddy ek dosyası (ck-caddy, /opt/cutkoda/caddy-ek/*.caddy içe aktarılır)
EK=/opt/cutkoda/caddy-ek/sosyal.caddy
[ -f $EK ] && cp $EK $EK.yedek-$(date +%Y%m%d%H%M%S)
cat > $EK <<BLOK
# Sosyal Stüdyo (sosyal-studyo kabı). Uygulama kendi parolasıyla korunur.
$AD {
	encode zstd gzip
	header {
		Strict-Transport-Security "max-age=31536000"
		X-Robots-Tag "noindex, nofollow"
		-Server
	}
	request_body {
		max_size 4MB
	}
	reverse_proxy sosyal-studyo:8000
}
BLOK
geri_al() { rm -f $EK; docker exec $C caddy reload --config $HEDEF >/dev/null 2>&1; echo "NOT: Caddy geri alındı (sosyal.caddy kaldırıldı)"; }
if ! docker exec $C caddy validate --config $HEDEF >/tmp/cv.txt 2>&1; then
  echo "NOT: HATA Caddy doğrulaması: $(grep -i error /tmp/cv.txt | tail -1 | cut -c1-220)"; geri_al; exit 1
fi
docker exec $C caddy reload --config $HEDEF >/tmp/cr.txt 2>&1 && echo "NOT: Caddy yüklendi" || { echo "NOT: HATA yükleme: $(tail -c 200 /tmp/cr.txt)"; geri_al; exit 1; }
# 3) dışarıdan deneme (sertifika birkaç dakika sürebilir)
for i in $(seq 1 18); do K=$(curl -s -o /dev/null -w '%{http_code}' --max-time 10 https://$AD/); [ "$K" = 200 ] && break; sleep 10; done
A=$(curl -s -o /dev/null -w '%{http_code}' --max-time 10 https://$AD/api/durum)
echo "NOT: giriş sayfası $K (200 beklenir) · girişsiz veri $A (401 beklenir)"
if [ "$K" != 200 ] || [ "$A" != 401 ]; then echo "NOT: HATA dışarıdan deneme başarısız"; geri_al; exit 1; fi
echo "NOT: diğer siteler: api $(curl -s -o /dev/null -w '%{http_code}' --max-time 10 https://api.aksarayenerji.net/v1/saglik) portal $(curl -s -o /dev/null -w '%{http_code}' --max-time 10 https://portal.aksarayenerji.net/) fatura $(curl -s -o /dev/null -w '%{http_code}' --max-time 10 https://fatura.aksarayenerji.net/)"
echo "NOT: yayında: https://$AD"
