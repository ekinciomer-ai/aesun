#!/bin/bash
# Sosyal Stüdyo'yu https://sosyal.cutkoda.com adresinden açar (Caddy: ck-caddy, ek dosya sosyal.caddy).
# Eski adres (sosyal.aksarayenerji.net) yeni adrese yönlenir. Parolasız asla açılmaz.
# DNS kaydı yoksa kasadaki cloudflare_dns_anahtari ile YALNIZ bu A kaydı eklenir (var olan kayıtlara dokunulmaz).
# Ek dosya doğrulanır; dışarıdan deneme başarısızsa dosya kaldırılıp Caddy eski haline döner.
set -uo pipefail
AD=sosyal.cutkoda.com; ESKI=sosyal.aksarayenerji.net; C=ck-caddy; HEDEF=/etc/caddy/Caddyfile; D=/opt/sosyal
docker inspect $C >/dev/null 2>&1 || { echo "NOT: HATA $C kapsayıcısı yok"; exit 1; }
/opt/aesun/kasa_coz.sh sosyal_parola >/dev/null 2>&1 || { echo "NOT: HATA kasada sosyal_parola yok; önce portal → Kasa'dan girilmeli. Yayın yapılmadı."; exit 1; }
BEN=$(curl -s --max-time 10 https://api.ipify.org || hostname -I | awk '{print $1}')
DNS=$(getent hosts $AD | awk '{print $1}' | head -1)
if [ -z "$DNS" ]; then
  CF=$(/opt/aesun/kasa_coz.sh cloudflare_dns_anahtari 2>/dev/null) || { echo "NOT: HATA $AD DNS kaydı yok ve kasada cloudflare_dns_anahtari yok; portal → Kasa'dan girilmeli."; exit 1; }
  CF="$CF" IP="$BEN" AD="$AD" python3 - <<'PY' || exit 1
import json, os, urllib.request
t, ip, ad = os.environ["CF"], os.environ["IP"], os.environ["AD"]
kok = ".".join(ad.split(".")[-2:])
def iste(yol, govde=None):
    r = urllib.request.Request("https://api.cloudflare.com/client/v4/" + yol, method="POST" if govde else "GET",
                               data=json.dumps(govde).encode() if govde else None,
                               headers={"Authorization": "Bearer " + t, "Content-Type": "application/json"})
    try:
        return json.load(urllib.request.urlopen(r, timeout=30))
    except urllib.error.HTTPError as e:
        return json.loads(e.read() or b"{}")
z = iste(f"zones?name={kok}").get("result") or []
if not z: print(f"NOT: HATA Cloudflare'da {kok} bölgesi görünmüyor (anahtarın yetkisi?)"); raise SystemExit(1)
zid = z[0]["id"]
if iste(f"zones/{zid}/dns_records?name={ad}").get("result"):
    print(f"NOT: {ad} kaydı Cloudflare'da zaten var, dokunulmadı"); raise SystemExit(0)
r = iste(f"zones/{zid}/dns_records", {"type": "A", "name": ad, "content": ip, "ttl": 300, "proxied": False,
                                       "comment": "Sosyal Stüdyo (ck-caddy)"})
print("NOT: Cloudflare A kaydı " + ("eklendi" if r.get("success") else "HATA " + str(r.get("errors"))[:200]))
raise SystemExit(0 if r.get("success") else 1)
PY
  for i in $(seq 1 18); do DNS=$(getent hosts $AD | awk '{print $1}' | head -1); [ -n "$DNS" ] && break; sleep 10; done
fi
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

# Eski adres yeni adrese yönlenir
$ESKI {
	redir https://$AD{uri} permanent
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
Y=$(curl -s -o /dev/null -w '%{http_code} %{redirect_url}' --max-time 10 https://$ESKI/)
echo "NOT: giriş sayfası $K (200 beklenir) · girişsiz veri $A (401 beklenir) · eski adres: $Y"
if [ "$K" != 200 ] || [ "$A" != 401 ]; then echo "NOT: HATA dışarıdan deneme başarısız"; geri_al; exit 1; fi
echo "NOT: diğer siteler: api $(curl -s -o /dev/null -w '%{http_code}' --max-time 10 https://api.aksarayenerji.net/v1/saglik) portal $(curl -s -o /dev/null -w '%{http_code}' --max-time 10 https://portal.aksarayenerji.net/) fatura $(curl -s -o /dev/null -w '%{http_code}' --max-time 10 https://fatura.aksarayenerji.net/)"
echo "NOT: yayında: https://$AD"
