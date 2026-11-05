#!/bin/bash
# Tampon bölge: MoneyPrinterTurbo (harry0703/MoneyPrinterTurbo, MIT, v1.3.9) — AI motorunun Normal (ücretsiz) girişi.
# Yalıtılmış kapsayıcı, kaynak sınırlı, yalnız sunucu içinden (127.0.0.1:8180). Diğer uygulamalara dokunmaz, sır okumaz.
# Anahtarlar (Pexels, Gemini) ayrı işlemle Kasa'dan config.toml'a yazılır. Telifli olabilecek hazır müzikler kapalı.
set -u
KOK=/opt/tampon/mpt; R=$KOK/repo; IMAJ=tampon-mpt:1.3.9; AD=tampon-mpt; SURUM=v1.3.9
BOS_GB=$(df -BG / | tail -1 | awk '{gsub("G","",$4); print $4}')
[ "${BOS_GB:-0}" -lt 10 ] && { echo "NOT: HATA disk boş alanı 10 GB altında"; exit 1; }
mkdir -p "$KOK"
if [ -d "$R/.git" ]; then git -C "$R" fetch -q --depth 1 origin tag $SURUM && git -C "$R" checkout -q $SURUM
else git clone -q --depth 1 --branch $SURUM https://github.com/harry0703/MoneyPrinterTurbo "$R"; fi
echo "NOT: sürüm $(git -C "$R" log -1 --format='%h %cs') · lisans: $(head -1 "$R/LICENSE")"
# Güvenlik ön taraması
echo "NOT: tarama: curl|sh=$(grep -rIl --exclude-dir=.git -E 'curl[^|]*\|[[:space:]]*(ba)?sh' "$R" | wc -l) eval=$(grep -rIl --exclude-dir=.git --include=*.py -E '[^a-z_.]eval\(' "$R/app" | wc -l) telemetri=$(grep -rIl --exclude-dir=.git --include=*.py -iE 'posthog|mixpanel|segment\.io|sentry_sdk' "$R/app" | wc -l) base64_exec=$(grep -rIl --include=*.py -E 'exec\(.*b64decode' "$R" | wc -l)"
# Yapılandırma (anahtarsız; yoksa oluşturulur, varsa korunur)
if [ ! -f "$R/config.toml" ]; then
  cp "$R/config.example.toml" "$R/config.toml"
  python3 - "$R/config.toml" <<'PY'
import re,sys
p=sys.argv[1]; s=open(p,encoding='utf-8').read()
def ayar(k,v):
    global s
    s,n=re.subn(rf'(?m)^{k}\s*=.*$', f'{k} = {v}', s, count=1)
    if not n: s=s.replace('[app]\n', f'[app]\n{k} = {v}\n',1)
ayar('llm_provider','"gemini"'); ayar('video_source','"pexels"'); ayar('max_concurrent_tasks','1')
open(p,'w',encoding='utf-8').write(s)
PY
fi
# İmaj
# Projenin Dockerfile'ı emekliye ayrılan Debian bullseye aynasını kullanıyor; kendi kısa tarifimiz (bookworm):
cat > "$KOK/Dockerfile.aesun" <<'DF'
FROM python:3.11-slim-bookworm
WORKDIR /MoneyPrinterTurbo
ENV PYTHONPATH=/MoneyPrinterTurbo PIP_NO_CACHE_DIR=1
RUN apt-get update && apt-get install -y --no-install-recommends git ffmpeg && rm -rf /var/lib/apt/lists/*
COPY requirements.txt ./
RUN pip install --retries 3 --timeout 60 -r requirements.txt
COPY . .
CMD ["python3","main.py"]
DF
docker build -q -f "$KOK/Dockerfile.aesun" -t $IMAJ "$R" > "$KOK/build.log" 2>&1 \
  || { echo "NOT: HATA imaj derlenemedi: $(tail -3 "$KOK/build.log" | tr '\n' ' ' | cut -c1-300)"; exit 1; }
echo "NOT: imaj hazır $(docker image inspect $IMAJ --format '{{.Size}}' | awk '{printf "%.1f GB", $1/1e9}')"
# Kapsayıcı (yalnız API; web arayüzü yok). Sınır: 3 GB bellek, 2 çekirdek.
docker rm -f $AD >/dev/null 2>&1
docker run -d --name $AD --restart unless-stopped --memory 3g --cpus 2 --pids-limit 512 \
  --security-opt no-new-privileges -p 127.0.0.1:8180:8080 -v "$R":/MoneyPrinterTurbo $IMAJ python3 main.py >/dev/null
for i in $(seq 1 30); do c=$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:8180/docs); [ "$c" = 200 ] && break; sleep 3; done
echo "NOT: API: $c (200 beklenir) · bellek $(docker stats --no-stream --format '{{.MemUsage}}' $AD)"
echo "NOT: sesler (ilk 5): $(curl -s http://127.0.0.1:8180/api/v1/tasks?page=1 -o /dev/null -w '%{http_code}') · günlük: $(docker logs $AD 2>&1 | tail -2 | tr '\n' ' ' | cut -c1-200)"
# Diğer uygulamalar etkilendi mi
echo "NOT: sağlık: api=$(curl -s -o /dev/null -w '%{http_code}' --max-time 10 https://api.aksarayenerji.net/v1/saglik) cutkoda=$(curl -s -o /dev/null -w '%{http_code}' --max-time 10 https://cutkoda.com/)"
