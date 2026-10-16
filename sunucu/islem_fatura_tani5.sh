#!/bin/bash
# fatura tanı 5 — YALNIZ OKUMA: gesfin-backend'in beklediği kimlik doğrulama (başlık adları, 401 metinleri). Sır yazdırmaz.
B=gesfin-backend
echo "NOT: backend kök: $(docker exec $B sh -c 'ls /app 2>/dev/null | head -20' | tr '\n' ' ' | cut -c1-300)"
echo "NOT: başlık adları: $(docker exec $B sh -c 'grep -r -o -h -i -E "x-[a-z-]*(user|kul|portal|rol|auth|token|profile|pin)[a-z-]*" /app --include=*.py 2>/dev/null | sort | uniq -c | sort -rn | head -10' | tr '\n' ';' | tr -s ' ' | cut -c1-500)"
echo "NOT: 401 metinleri: $(docker exec $B sh -c 'grep -r -h -o -E "(401|HTTP_401)[^\n]{0,80}" /app --include=*.py 2>/dev/null | head -8' | tr '\n' '¦' | cut -c1-700)"
echo "NOT: auth dosyaları: $(docker exec $B sh -c 'grep -r -l -i -E "oauth|jwt|session|HTTPBearer|APIKeyHeader|get_current" /app --include=*.py 2>/dev/null | head -10' | tr '\n' ' ' | cut -c1-400)"
echo "NOT: oturum süresi: $(docker exec $B sh -c 'grep -r -h -o -i -E "(expire|süre|ttl|timedelta)[^\n]{0,70}" /app --include=*.py 2>/dev/null | head -6' | tr '\n' '¦' | cut -c1-500)"
echo "NOT: rotalar: $(docker exec $B sh -c 'grep -r -h -o -E "@(router|app)\.(get|post)\(\"[^\"]+\"" /app --include=*.py 2>/dev/null | sed -E "s/@(router|app)\.//" | head -30' | tr '\n' ' ' | cut -c1-700)"
echo "NOT: deneme /api/auth/profiles → $(docker exec gesfin-caddy wget -q -O- -S --timeout=5 http://gesfin-backend:8000/auth/profiles 2>&1 | head -4 | tr '\n' ' ' | cut -c1-240)"
echo "NOT: deneme /profiles → $(docker exec gesfin-caddy wget -q -O- -S --timeout=5 http://gesfin-backend:8000/profiles 2>&1 | head -4 | tr '\n' ' ' | cut -c1-240)"
echo "NOT: openapi yolları: $(docker exec gesfin-caddy wget -q -O- --timeout=5 http://gesfin-backend:8000/openapi.json 2>/dev/null | python3 -c 'import sys,json;d=json.load(sys.stdin);print(" ".join(sorted(d.get("paths",{}).keys()))[:700])' 2>/dev/null)"
true
