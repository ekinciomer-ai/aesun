#!/bin/bash
# fatura.aksarayenerji.net (gesfin) tanı — YALNIZ OKUMA. Hiçbir şey değiştirmez, yeniden başlatmaz.
# Çıktı sır içermez: kapsayıcı durumları, HTTP kodları, son log satırları (şifre/token satırları süzülür).
suz(){ grep -v -i -E 'password|passwd|secret|token|authorization|cookie|api[_-]?key' | cut -c1-220; }
echo "NOT: tarih: $(date '+%F %T %Z')"
echo "NOT: kapsayıcılar(gesfin): $(docker ps -a --filter name=gesfin --format '{{.Names}} | {{.Status}} | {{.Image}}' | tr '\n' ';')"
echo "NOT: bellek: $(free -m | awk '/Mem/{print "kullanılabilir "$7" MB / "$2" MB"}') · disk $(df -h / | tail -1 | awk '{print $5" dolu"}')"
# dışarıdan görünüm (sunucunun kendisinden)
for u in https://fatura.aksarayenerji.net/ https://fatura.aksarayenerji.net/login https://fatura.aksarayenerji.net/api/health; do
  echo "NOT: $u → $(curl -s -o /tmp/f.html -w '%{http_code} %{redirect_url} %{time_total}s' --max-time 20 "$u") · auth=$(curl -s -I --max-time 20 "$u" | grep -i '^www-authenticate' | cut -c1-80)"
done
echo "NOT: sayfa başlığı: $(grep -o '<title>[^<]*' /tmp/f.html | head -1 | cut -c8-90) · login formu=$(grep -c -i 'type="password"' /tmp/f.html)"
# Caddy yapılandırması: fatura bloğu (yalnız yönerge adları)
CF=/opt/caddy/Caddyfile
if [ -f $CF ]; then
  echo "NOT: Caddy fatura bloğu: $(awk '/^fatura\.aksarayenerji\.net/{f=1} f{print} f&&/^}/{exit}' $CF | grep -o -E 'basicauth|basic_auth|reverse_proxy [^ ]+|redir|respond [0-9]+|forward_auth|abort|import [a-z_]+|tls' | sort -u | tr '\n' ' ')"
  echo "NOT: Caddyfile değişme: $(stat -c '%y' $CF | cut -c1-19) · yedekler: $(ls -t $CF.yedek-* 2>/dev/null | head -3 | xargs -n1 basename | tr '\n' ' ')"
fi
echo "NOT: Caddy son hatalar: $(docker logs gesfin-caddy --since 24h 2>&1 | grep -i -E '"level":"error"|"status":(401|403|5[0-9][0-9])' | tail -5 | suz | tr '\n' ' ¶ ')"
echo "NOT: Caddy 24sa durum kodları: $(docker logs gesfin-caddy --since 24h 2>&1 | grep -o '"status":[0-9]*' | sort | uniq -c | sort -rn | head -6 | tr '\n' ' ')"
# uygulama kapsayıcısı (adı gesfin-app / gesfin-web / gesfin olabilir)
APP=$(docker ps -a --filter name=gesfin --format '{{.Names}}' | grep -v -E 'db|caddy' | head -1)
echo "NOT: uygulama kapsayıcısı: ${APP:-bulunamadı}"
if [ -n "$APP" ]; then
  echo "NOT: $APP son 24sa hata: $(docker logs $APP --since 24h 2>&1 | grep -i -E 'error|exception|traceback|unauthorized|invalid|login|auth|ECONN|refused' | tail -8 | suz | tr '\n' ' ¶ ')"
  echo "NOT: $APP yeniden başlatma sayısı: $(docker inspect $APP --format '{{.RestartCount}} · başladı {{.State.StartedAt}} · sağlık {{if .State.Health}}{{.State.Health.Status}}{{else}}-{{end}}')"
fi
Q(){ docker exec -i gesfin-db psql -U gesfin -d gesfin -At -c "$1" 2>&1 | head -${2:-1} | tr '\n' ',' | cut -c1-240; }
echo "NOT: db: $(docker exec gesfin-db pg_isready -U gesfin 2>&1 | cut -c1-80)"
UT=$(Q "select table_name from information_schema.tables where table_schema='public' and table_name ~ 'user|account|auth|session' order by 1" 10)
echo "NOT: db kullanıcı tabloları: ${UT:-yok}"
T1=$(echo "$UT" | cut -d, -f1)
[ -n "$T1" ] && echo "NOT: $T1 sütunlar: $(Q "select column_name from information_schema.columns where table_name='$T1' order by ordinal_position" 40)" && echo "NOT: $T1 satır: $(Q "select count(*) from $T1")"
echo "NOT: db tablolar: $(Q "select table_name from information_schema.tables where table_schema='public' order by 1" 40)"
