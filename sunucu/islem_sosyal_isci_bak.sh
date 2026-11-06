#!/bin/bash
# Salt okunur: Sosyal Stüdyo araç işçisinin durumu.
echo "NOT: saat $(date '+%F %T %Z') · zamanlayıcı: $(systemctl is-enabled sosyal-isci.timer 2>&1) / $(systemctl is-active sosyal-isci.timer 2>&1) · servis: $(systemctl is-active sosyal-isci.service 2>&1)"
systemctl list-timers sosyal-isci.timer --no-pager 2>&1 | sed -n 2p | sed 's/^/NOT: zamanlayıcı: /'
journalctl -u sosyal-isci.service --no-pager -n 12 2>&1 | cut -c1-220 | sed 's/^/NOT: günlük: /'
echo "NOT: bekleyen: $(ls -la /opt/sosyal/kuyruk/bekleyen 2>&1 | tail -n +2 | awk '{print $1,$3,$9}' | tr '\n' ';')"
echo "NOT: çıktı: $(ls /opt/sosyal/kuyruk/cikti 2>&1 | tr '\n' ' ')"
echo "NOT: araclar.json: $(stat -c %y /opt/sosyal/kuyruk/araclar.json 2>&1)"
pgrep -af isci.py | sed 's/^/NOT: süreç: /'
for d in /opt/sosyal/kuyruk/cikti/*/; do
  echo "NOT: iş $(basename $d): $(python3 -c "import json;j=json.load(open('$d/is.json'));print(j.get('tur'),j.get('ses'),j.get('dil'),len(j.get('metin','')),'karakter')" 2>&1) · durum: $(cat $d/durum.json 2>/dev/null | tr -d '\n' | cut -c1-200) · dosyalar: $(ls $d | tr '\n' ' ')"
done
for f in /opt/sosyal/kuyruk/bekleyen/*.json; do echo "NOT: sırada $(basename $f): $(python3 -c "import json;j=json.load(open('$f'));print(j.get('tur'),j.get('ses'),j.get('icerik_id'))")"; done
echo "NOT: tampon kapsayıcıları: $(docker ps --format '{{.Names}} {{.Image}} {{.RunningFor}} {{.Status}}' | grep -i 'tampon' | tr '\n' ';')"
echo "NOT: işçi alt süreçleri: $(pstree -ap $(pgrep -f /opt/sosyal/isci.py | head -1) 2>/dev/null | head -6 | cut -c1-160 | tr '\n' ';')"
for c in $(docker ps -q --filter ancestor=tampon-ses:1); do echo "NOT: ses kabı günlüğü: $(docker logs --tail 6 $c 2>&1 | tr '\n' ' ' | cut -c1-400)"; done
echo "NOT: bellek boş $(free -m | awk '/Mem/{print $7}') MB · yük $(cut -d' ' -f1-3 /proc/loadavg)"
