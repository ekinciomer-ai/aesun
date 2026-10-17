#!/bin/bash
# SALT OKUMA (17.10.2026): aesun-isler kapsayıcısında süreç sayısı / zombi / sınırlar ("cannot fork" teşhisi).
P=$(docker inspect -f '{{.State.Pid}}' aesun-isler)
CG=$(awk -F: '$1=="0"{print $3}' /proc/$P/cgroup)
echo "NOT: kapsayıcı süreç sayısı: $(cat /sys/fs/cgroup${CG}/pids.current 2>/dev/null) / sınır $(cat /sys/fs/cgroup${CG}/pids.max 2>/dev/null) · init: $(docker inspect -f '{{.HostConfig.Init}}' aesun-isler)"
echo "NOT: durumlara göre (kapsayıcı): $(for p in $(cat /sys/fs/cgroup${CG}/cgroup.procs 2>/dev/null); do awk '/^State:/{print $2}' /proc/$p/status 2>/dev/null; done | sort | uniq -c | tr '\n' ' ')"
echo "NOT: komutlara göre (ilk 6): $(for p in $(cat /sys/fs/cgroup${CG}/cgroup.procs 2>/dev/null); do cat /proc/$p/comm 2>/dev/null; done | sort | uniq -c | sort -rn | head -6 | tr '\n' ' ')"
echo "NOT: uid 1001 süreçleri (tüm sunucu): $(ps -u 1001 -o stat= 2>/dev/null | cut -c1 | sort | uniq -c | tr '\n' ' ') · nproc sınırı (kapsayıcı): $(docker exec aesun-isler sh -c 'ulimit -u' 2>&1)"
echo "NOT: en eski zombi: $(ps -u 1001 -o stat=,etime=,comm= 2>/dev/null | awk '$1~/^Z/' | sort -k2 | tail -1)"
