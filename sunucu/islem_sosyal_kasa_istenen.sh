#!/bin/bash
# Kasada beklenen kayıtlara Sosyal Stüdyo'nunkileri ekler (mevcut istekler korunur; yalnız ad ve açıklama, değer yok).
set -euo pipefail
F=/var/lib/docker/volumes/aesun_aesun_veri/_data/kasa/istenen.json
[ -f $F ] || echo '{}' > $F
cp $F $F.yedek-$(date +%Y%m%d%H%M%S)
python3 - $F <<'PY'
import json, sys
p = sys.argv[1]; d = json.load(open(p, encoding="utf-8"))
d["sosyal_parola"] = "Sosyal Stüdyo giriş parolası (sosyal.cutkoda.com). Kendiniz belirleyin, en az 12 karakter."
d.setdefault("openrouter_api_key", "OpenRouter ücretsiz anahtarı: openrouter.ai → giriş (Google ile) → sağ üst menü → Keys → Create Key. 'sk-or-' ile başlar.")
d.setdefault("mistral_api_key", "Mistral ücretsiz anahtarı: console.mistral.ai → giriş → plan olarak Experiment (ücretsiz) → telefon doğrulama → API Keys → Create new key.")
d.setdefault("cloudflare_ai_anahtari", "Cloudflare Workers AI anahtarı (çizgi film çizimleri, ücretsiz günlük pay): dash.cloudflare.com → sağ üst profil → API Tokens → Create Token → 'Workers AI' şablonu → Account Resources: hesabınız → Continue → Create Token. Yalnız anahtarı kopyalayın.")
d.setdefault("cloudflare_dns_anahtari", "Cloudflare API anahtarı (yalnız cutkoda.com DNS düzenleme): dash.cloudflare.com → sağ üst profil → API Tokens → Create Token → 'Edit zone DNS' şablonu → Zone Resources: cutkoda.com → Create.")
d.setdefault("groq_api_key", "Groq ücretsiz anahtarı: console.groq.com → giriş → API Keys → Create API Key. 'gsk_' ile başlar.")
json.dump(d, open(p, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
PY
chown 1001:1001 $F; chmod 600 $F
echo "NOT: beklenen kayıtlar: $(python3 -c "import json;print(', '.join(json.load(open('$F'))))")"
for a in sosyal_parola groq_api_key cloudflare_dns_anahtari openrouter_api_key cloudflare_ai_anahtari; do /opt/aesun/kasa_coz.sh $a >/dev/null 2>&1 && echo "NOT: $a kasada VAR" || echo "NOT: $a kasada yok (portal → Kasa'dan girilecek)"; done
