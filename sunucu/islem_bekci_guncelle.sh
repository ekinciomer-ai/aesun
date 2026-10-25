#!/bin/bash
# Yalnız ns1 bekçisini günceller (kapsayıcılara dokunmaz): bekci.sh + guvenlik.py → /opt/aesun, bir tur çalıştırır.
set -euo pipefail
cp sunucu/aesun/bekci.sh /opt/aesun/bekci.sh && chmod 700 /opt/aesun/bekci.sh
cp sunucu/aesun/guvenlik.py /opt/aesun/guvenlik.py && chmod 700 /opt/aesun/guvenlik.py
python3 /opt/aesun/guvenlik.py --zorla 2>&1 | tail -1 | sed 's/^/NOT: /'
systemctl start aesun-bekci.service || /opt/aesun/bekci.sh || true
echo "NOT: kapasite: $(python3 -c "import json;d=json.load(open('/opt/aesun/bekci_durum.json'));k=d.get('kapasite',{});print({a:k.get(a) for a in ('disk','ram')})")"
echo "NOT: güvenlik uyarıları: $(python3 -c "import json;print(json.load(open('/opt/aesun/guvenlik.json')).get('uyarilar'))")"
