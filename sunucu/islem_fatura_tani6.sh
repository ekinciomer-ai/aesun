#!/bin/bash
# fatura tanı 6 — YALNIZ OKUMA: SSO çerezli uçtan uca deneme (sunucu içinde üretilen geçici çerez), ön yüz 401 mantığı.
CK=$(docker exec aesun-api python3 -c "import app;print(app.sso_imzala('yonetici',int(__import__('time').time())+600))" 2>/dev/null)
echo "NOT: çerez üretildi: $([ -n "$CK" ] && echo evet || echo HAYIR)"
t(){ curl -s -o /tmp/o.txt -w '%{http_code}' --max-time 15 -H 'Accept: application/json' -b "ae_sso=$CK" "$@"; echo " $(head -c 160 /tmp/o.txt | tr '\n' ' ')"; }
echo "NOT: çerezli /api/health → $(t https://fatura.aksarayenerji.net/api/health)"
echo "NOT: çerezli /api/auth/users → $(t https://fatura.aksarayenerji.net/api/auth/users)"
echo "NOT: çerezli /api/auth/me (jetonsuz) → $(t https://fatura.aksarayenerji.net/api/auth/me)"
echo "NOT: çerezsiz /api/auth/users → $(curl -s -o /dev/null -w '%{http_code}' --max-time 15 -H 'Accept: application/json' https://fatura.aksarayenerji.net/api/auth/users)"
echo "NOT: backend doğrudan /auth/users → $(docker exec gesfin-caddy wget -q -O- -S --timeout=5 http://gesfin-backend:8000/auth/users 2>&1 | head -1 | cut -c1-40)"
W=gesfin-mobile-web
echo "NOT: ön yüz 401 mantığı: $(docker exec $W sh -c 'grep -r -o -h -E ".{0,160}süresi doldu.{0,160}" /usr/share/nginx/html 2>/dev/null | head -2' | tr -d '\n' | cut -c1-600)"
echo "NOT: ön yüz api tabanı: $(docker exec $W sh -c 'grep -r -o -h -E ".{0,80}fatura\.aksarayenerji\.net/api.{0,80}" /usr/share/nginx/html 2>/dev/null | head -2' | tr -d '\n' | cut -c1-400)"
echo "NOT: ön yüz credentials/fetch: $(docker exec $W sh -c 'grep -r -o -h -E "credentials:\"[a-z-]+\"|withCredentials:[a-z!]+" /usr/share/nginx/html 2>/dev/null | sort | uniq -c' | tr '\n' ';' | cut -c1-200)"
true
