#!/bin/bash
# Salt okunur ekosistem denetimi (sunucu tarafı). Hiçbir şeyi değiştirmez, sır yazdırmaz.
t() { tr '\n' ' ' | sed 's/  */ /g'; }
# D1 kapsayıcı sağlığı: yeniden başlama sayısı, durum, sağlık
echo "NOT: D1 kapsayıcılar (ad durum yenidenbaşlama sağlık): $(docker ps -a --format '{{.Names}}' | while read c; do echo "$c:$(docker inspect -f '{{.State.Status}}/{{.RestartCount}}/{{if .State.Health}}{{.State.Health.Status}}{{else}}-{{end}}' $c)"; done | t)"
# D2 işlemci/bellek: 3 örnek, yüksek kullananlar
for i in 1 2 3; do docker stats --no-stream --format '{{.Name}} {{.CPUPerc}} {{.MemPerc}}' ; sleep 4; done | awk '{gsub("%","",$2);gsub("%","",$3); c[$1]+=$2; m[$1]=$3; n[$1]++} END{for(k in c){a=c[k]/n[k]; if(a>20||m[k]>70) printf "%s cpu%%%.0f mem%%%s; ", k, a, m[k]}}' | sed 's/^/NOT: D2 yüksek kullanım: /'; echo
echo "NOT: D2b musteri süreçleri: $(docker top aesun-musteri -eo pid,pcpu,etime,args 2>/dev/null | sort -k2 -nr | head -6 | cut -c1-110 | t)"
# D3 son 24 saatte hata yoğunluğu (kapsayıcı başına)
echo "NOT: D3 24 saat hata satırı: $(docker ps --format '{{.Names}}' | while read c; do n=$(docker logs --since 24h $c 2>&1 | grep -ciE 'error|exception|traceback|hata'); [ "$n" -gt 0 ] && echo "$c=$n"; done | t)"
# D4 aesun işleri: son çalışma ve süre
echo "NOT: D4 işler: $(docker exec aesun-isler sh -c 'cat /veri/durum.json' 2>/dev/null | python3 -c "
import json,sys,time
try: d=json.load(sys.stdin)
except Exception: print('okunamadı'); sys.exit()
it=d.get('isler', d)
out=[]
for k,v in (it.items() if isinstance(it,dict) else []):
  if isinstance(v,dict): out.append(f\"{k}:son={str(v.get('son',v.get('bitis','')))[:16]} sure={v.get('sure',v.get('sure_sn','?'))} durum={v.get('durum',v.get('kod','?'))}\")
print(' | '.join(out)[:1400] or str(d)[:600])")"
# D5 güvenlik: ssh deneme, engelli adresler, açık kapılar, güncellemeler
echo "NOT: D5 ssh başarısız (24s): $(journalctl -u ssh --since '24 hours ago' 2>/dev/null | grep -c 'Failed\|Invalid user') · başarılı giriş: $(journalctl -u ssh --since '24 hours ago' 2>/dev/null | grep -c 'Accepted') · fail2ban: $(fail2ban-client status sshd 2>/dev/null | grep -E 'Currently banned|Total banned' | t) · ufw: $(ufw status | grep -c ALLOW) izin"
echo "NOT: D5b bekleyen güncelleme: $(apt list --upgradable 2>/dev/null | grep -c upgradable) (güvenlik: $(apt list --upgradable 2>/dev/null | grep -c -i security)) · yeniden başlatma gerekli: $([ -f /var/run/reboot-required ] && echo evet || echo hayır)"
echo "NOT: D5c dışa açık kapılar: $(ss -ltnH | awk '{print $4}' | grep -vE '^127\.|^\[::1\]|%lo' | sed 's/.*://' | sort -un | t)"
# D6 web uçları yanıt süresi
for u in https://api.aksarayenerji.net/v1/saglik https://portal.aksarayenerji.net/ https://portal.aksarayenerji.net/monitoring/ https://aksarayenerji.net/ https://cutkoda.com/; do
  echo "$u $(curl -s -o /dev/null -w '%{http_code} %{time_total}s %{size_download}B' --max-time 20 $u)"; done | t | sed 's/^/NOT: D6 uçlar: /'; echo
# D7 disk büyümesi: en büyük klasörler ve günlükler
echo "NOT: D7 büyük günlükler: $(find /var/lib/docker/containers -name '*-json.log' -size +50M -exec du -h {} \; 2>/dev/null | sort -rh | head -5 | t) · journal: $(journalctl --disk-usage 2>/dev/null | grep -oE '[0-9.]+[GM]')"
echo "NOT: D7b tampon: $(du -sh /opt/tampon/* 2>/dev/null | sort -rh | head -8 | awk '{print $2"="$1}' | sed 's#/opt/tampon/##' | t) · docker imajlar: $(docker system df --format '{{.Type}}={{.Size}}(geri kazanılır {{.Reclaimable}})' | t)"
# D8 zamanlanmış işler ve bekçi
echo "NOT: D8 timer: $(systemctl list-timers --no-legend | grep -E 'aesun|yedek' | awk '{print $(NF-1)" sonraki "$1" "$2}' | t) · bekçi son: $(journalctl -u aesun-bekci --since '1 hour ago' 2>/dev/null | tail -2 | cut -c1-160 | t)"
echo "NOT: D9 servisler: $(systemctl is-active aesun-asistan aesun-bekci 2>/dev/null | t) · çıkmış kapsayıcı: $(docker ps -a --filter status=exited --format '{{.Names}}({{.Status}})' | t)"
