#!/bin/bash
# Salt okuma teşhis: TikTok yükleyicisinin neden sonuç vermediğini gösterir (hiçbir şeyi değiştirmez).
echo "NOT: tt-tarayici: $(docker ps --format '{{.Names}} {{.Status}}' | grep tt-tarayici || echo YOK)"
curl -s -m 5 http://127.0.0.1:9222/json/version | head -c 300; echo
ls -la /opt/aesun/tiktok/is/ 2>&1 | head; ls -la /opt/aesun/youtube/medya/AS_GT_* 2>&1
for k in AS_GT_NARH AS_GT_MUHTESIB; do python3 -c "import json;d=json.load(open('/opt/aesun/havuz/havuz.json'));it=d.get('$k') or next((x for x in (d.values() if isinstance(d,dict) else d) if isinstance(x,dict) and x.get('kod')=='$k'),{});print('NOT: $k',it.get('durum'),it.get('dosya'))" 2>&1; done
ls -t /opt/aesun/tiktok/adim/ 2>/dev/null | head -5
docker logs --tail 30 tt-tarayici 2>&1 | tail -15
