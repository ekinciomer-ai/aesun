#!/bin/bash
# Salt okunur: sunucudan alan adı çözümü ve uç denetimi.
for h in portal.aksarayenerji.net aksarayenerji.net api.aksarayenerji.net; do echo "NOT: $h → $(getent hosts $h | awk '{print $1}' | tr '\n' ' ') · $(curl -s -o /dev/null -w '%{http_code} %{time_total}s' --max-time 15 https://$h/)"; done
echo "NOT: aecad: $(curl -s -o /dev/null -w '%{http_code} %{size_download}B' --max-time 15 https://portal.aksarayenerji.net/aecad/)"
echo "NOT: çözücü: $(resolvectl status 2>/dev/null | grep -m3 'DNS Server' | tr '\n' ' ') · son uç durumu: $(python3 -c "import json;print([ (u['ad'],u['neden']) for u in json.load(open('/opt/aesun/uclar_durum.json')) if not u.get('ok')])" 2>&1 | cut -c1-300)"
echo "NOT: son 2 saat DNS hatası: $(journalctl --since '2 hours ago' 2>/dev/null | grep -ci 'resolv\|dns' )"
