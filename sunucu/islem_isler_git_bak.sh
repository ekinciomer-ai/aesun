#!/bin/bash
# SALT OKUMA (17.10.2026): aesun-isler kapsayıcısındaki epias-ptf kopyasının git durumu ve GitHub'a erişim.
# Hiçbir şeyi değiştirmez (fetch dahil yapılmaz; yalnız ls-remote ve durum okuma).
G="docker exec aesun-isler git -C /veri/epias-ptf"
echo "NOT: dal: $($G status -sb 2>&1 | head -1)"
echo "NOT: rebase/merge sürüyor mu: $(docker exec aesun-isler sh -c 'ls -d /veri/epias-ptf/.git/rebase-merge /veri/epias-ptf/.git/rebase-apply /veri/epias-ptf/.git/MERGE_HEAD 2>/dev/null' | tr '\n' ' ') ."
echo "NOT: çakışan/değişen: $($G status --porcelain 2>&1 | head -8 | tr '\n' ';')"
echo "NOT: stash: $($G stash list 2>&1 | head -3 | tr '\n' ';')"
echo "NOT: son yerel commitler: $($G log -4 --format='%ci %s' 2>&1 | cut -c1-70 | tr '\n' ';')"
echo "NOT: GitHub erişimi (ls-remote): $(docker exec aesun-isler timeout 25 git -C /veri/epias-ptf ls-remote origin HEAD 2>&1 | cut -c1-120 | tr '\n' ' ')"
echo "NOT: fail2ban engelli sayısı: sshd $(fail2ban-client status sshd 2>/dev/null | grep 'Currently banned' | awk '{print $NF}') · ssh-kalici $(fail2ban-client status ssh-kalici 2>/dev/null | grep 'Currently banned' | awk '{print $NF}') · recidive $(fail2ban-client status recidive 2>/dev/null | grep 'Currently banned' | awk '{print $NF}')"
GH=$(getent ahosts github.com | awk '{print $1}' | sort -u | tr '\n' ' ')
B=$(for j in sshd ssh-kalici recidive; do fail2ban-client status $j 2>/dev/null | grep 'Banned IP list' | sed 's/.*://'; done | tr ' ' '\n' | sort -u)
echo "NOT: github.com adresleri ($GH) engelli mi: $(for a in $GH; do echo "$B" | grep -qxF "$a" && echo "$a ENGELLİ"; done) ."
