#!/bin/bash
for u in / /api/veri.php /api/canli.php /api/portal.php /monitoring/ /aecad/ /api/ ; do echo "NOT: $u → $(curl -s -o /tmp/b -w '%{http_code}' --max-time 20 "https://portal.aksarayenerji.net$u") · $(head -c 160 /tmp/b | tr '\n' ' ')"; done
