#!/bin/bash
# Salt okunur: Sosyal Stüdyo araç işçisinin durumu.
echo "NOT: saat $(date '+%F %T %Z') · zamanlayıcı: $(systemctl is-enabled sosyal-isci.timer 2>&1) / $(systemctl is-active sosyal-isci.timer 2>&1) · servis: $(systemctl is-active sosyal-isci.service 2>&1)"
systemctl list-timers sosyal-isci.timer --no-pager 2>&1 | sed -n 2p | sed 's/^/NOT: zamanlayıcı: /'
journalctl -u sosyal-isci.service --no-pager -n 12 2>&1 | cut -c1-220 | sed 's/^/NOT: günlük: /'
echo "NOT: bekleyen: $(ls -la /opt/sosyal/kuyruk/bekleyen 2>&1 | tail -n +2 | awk '{print $1,$3,$9}' | tr '\n' ';')"
echo "NOT: çıktı: $(ls /opt/sosyal/kuyruk/cikti 2>&1 | tr '\n' ' ')"
echo "NOT: araclar.json: $(stat -c %y /opt/sosyal/kuyruk/araclar.json 2>&1)"
pgrep -af isci.py | sed 's/^/NOT: süreç: /'
