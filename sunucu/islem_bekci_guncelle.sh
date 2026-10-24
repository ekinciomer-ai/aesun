#!/bin/bash
# Yalnız ns1 bekçisini günceller (kapsayıcılara dokunmaz): sunucu/aesun/bekci.sh → /opt/aesun, bir tur çalıştırır.
set -euo pipefail
cp sunucu/aesun/bekci.sh /opt/aesun/bekci.sh && chmod 700 /opt/aesun/bekci.sh
systemctl start aesun-bekci.service || /opt/aesun/bekci.sh || true
echo "NOT: kapasite: $(python3 -c "import json;d=json.load(open('/opt/aesun/bekci_durum.json'));k=d.get('kapasite',{});print({a:k.get(a) for a in ('disk','ram','birim')})")"
