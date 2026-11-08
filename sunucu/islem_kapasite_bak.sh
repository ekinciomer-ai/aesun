#!/bin/bash
# Yalnız okur: yeni bir uygulama için ns1 kapasitesi ve düzeni.
echo "NOT: işlemci: $(nproc) çekirdek · yük $(cut -d' ' -f1-3 /proc/loadavg)"
echo "NOT: bellek: $(free -m | awk '/Mem/{print "toplam "$2" MB, kullanılabilir "$7" MB"}') · takas $(free -m | awk '/Swap/{print $2" MB"}')"
echo "NOT: disk: $(df -h / | tail -1 | awk '{print "toplam "$2", boş "$4", dolu "$5}')"
echo "NOT: diğer diskler: $(df -h -x tmpfs -x overlay -x devtmpfs | tail -n +2 | awk '{print $6" "$2" boş "$4}' | tr '\n' ';')"
echo "NOT: kapsayıcılar: $(docker ps --format '{{.Names}}({{.Image}})' | tr '\n' ' ')"
echo "NOT: kapsayıcı bellek: $(docker stats --no-stream --format '{{.Name}} {{.MemUsage}} {{.CPUPerc}}' | tr '\n' ';')"
echo "NOT: os: $(. /etc/os-release; echo $PRETTY_NAME) · docker $(docker --version | cut -d' ' -f3) · compose $(docker compose version --short 2>/dev/null)"
echo "NOT: caddy: $(docker ps --filter name=caddy --format '{{.Names}}') $(systemctl is-active caddy 2>/dev/null) · Caddyfile site satırları: $(grep -nE '^[^[:space:]#][^{]*\{' /opt/caddy/Caddyfile 2>/dev/null | sed 's/{//' | tr '\n' ' ' | cut -c1-500)"
echo "NOT: postgres: $(docker ps --format '{{.Names}} {{.Image}}' | grep -i -E 'postgres|mysql|maria' | tr '\n' ';') $(systemctl is-active postgresql 2>/dev/null)"
echo "NOT: ffmpeg: $(command -v ffmpeg || echo yok) · /opt: $(ls /opt | tr '\n' ' ')"
echo "NOT: dinlenen portlar: $(ss -ltnp 2>/dev/null | awk 'NR>1{print $4}' | sed 's/.*://' | sort -n | uniq | tr '\n' ' ')"
