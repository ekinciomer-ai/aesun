#!/bin/bash
# YALNIZ OKUMA: gesfin'in sunucudaki yerleşimi ve SSH ayarı (ayrı kısıtlı hesap kurulumu öncesi).
for c in $(docker ps --format '{{.Names}}' | grep -i gesfin); do
  echo "NOT: kap $c | img=$(docker inspect -f '{{.Config.Image}}' $c) | proje=$(docker inspect -f '{{index .Config.Labels "com.docker.compose.project.working_dir"}}' $c) | baglar=$(docker inspect -f '{{range .Mounts}}{{.Source}}->{{.Destination}} {{end}}' $c | cut -c1-300)"
done
D=$(docker inspect -f '{{index .Config.Labels "com.docker.compose.project.working_dir"}}' gesfin-backend 2>/dev/null)
echo "NOT: proje klasörü: $D"
[ -n "$D" ] && { echo "NOT: içerik: $(ls -la $D | awk '{print $1,$3,$9}' | tr '\n' ';' | cut -c1-900)"; echo "NOT: git: $(cd $D && git remote -v 2>/dev/null | head -1; git -C $D log -1 --format='%h %cr' 2>/dev/null)"; echo "NOT: compose dosyaları: $(ls $D/*compose* $D/docker-compose* 2>/dev/null | tr '\n' ' ')"; echo "NOT: build bağlamları: $(grep -n -E 'build:|context:|dockerfile:|volumes:|- \./' $D/docker-compose*.yml $D/compose*.yml 2>/dev/null | head -30 | tr '\n' ';' | cut -c1-1200)"; echo "NOT: boyut: $(du -sh $D 2>/dev/null | cut -f1)"; }
echo "NOT: belge/evrak klasör adayları: $(find / -xdev -maxdepth 5 -type d \( -iname '*upload*' -o -iname '*evrak*' -o -iname '*belge*' -o -iname '*fatura*' \) -path '*gesfin*' 2>/dev/null | head -10 | tr '\n' ' ')"
echo "NOT: sshd: $(sshd -T 2>/dev/null | grep -E '^(port|passwordauthentication|pubkeyauthentication|permitrootlogin|allowusers|allowgroups|subsystem) ' | tr '\n' ';')"
echo "NOT: ufw 22: $(ufw status 2>/dev/null | grep -E '^22|OpenSSH|^[0-9]+/tcp' | head -5 | tr '\n' ';')"
echo "NOT: insan kullanıcılar: $(awk -F: '$3>=1000 && $3<65000 {print $1":"$7}' /etc/passwd | tr '\n' ' ')"
echo "NOT: docker grubu: $(getent group docker)"
true
