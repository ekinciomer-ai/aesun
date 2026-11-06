#!/bin/bash
# Sosyal Stüdyo'yu ns1'e kurar/günceller (ayrı kapsayıcı: sosyal-studyo, yalnız 127.0.0.1:5090).
# Anahtarlar kasadan okunur, /opt/sosyal/anahtar.env'e (600) yazılır; değerler ekrana yazılmaz.
# Güvenli dağıtım: önceki kod ve imaj saklanır; sağlık kontrolü başarısızsa otomatik geri alınır.
set -uo pipefail
cd /tmp/aesun_paket
D=/opt/sosyal
mkdir -p $D/kaynak $D/kod $D/kuyruk/bekleyen $D/kuyruk/cikti
# 1) yedek
ONCE=$(docker inspect sosyal-studyo --format '{{.Image}}' 2>/dev/null)
[ -d $D/kod/sosyal ] && rm -rf $D/kod.onceki && cp -a $D/kod $D/kod.onceki
# 2) kod ve kaynak MD dosyaları (sunucudaki dosya farklıysa eskisi .bak olarak saklanır)
rm -rf $D/kod && cp -a sunucu/sosyal $D/kod && rm -rf $D/kod/veri $D/kod/testler
for f in sunucu/sosyal/kaynak/*.md; do
  h=$D/kaynak/$(basename "$f")
  [ -f "$h" ] && ! cmp -s "$f" "$h" && cp -a "$h" "$h.$(date +%Y%m%d%H%M).bak"
  cp "$f" "$h"
done
chown -R 1001:1001 $D/kaynak $D/kuyruk/bekleyen
# Tampon araç işçisi (kapsayıcı dışında, dakikada bir; tek iş aynı anda)
install -m 755 sunucu/sosyal/arac/isci.py $D/isci.py
cat > /etc/systemd/system/sosyal-isci.service <<'UNIT'
[Unit]
Description=Sosyal Stüdyo tampon araç işçisi
[Service]
Type=oneshot
Nice=10
TimeoutStartSec=3600
ExecStart=/usr/bin/python3 /opt/sosyal/isci.py
UNIT
cat > /etc/systemd/system/sosyal-isci.timer <<'UNIT'
[Unit]
Description=Sosyal Stüdyo işçisi her dakika
[Timer]
OnBootSec=2min
OnUnitInactiveSec=1min
[Install]
WantedBy=timers.target
UNIT
systemctl daemon-reload && systemctl enable --now sosyal-isci.timer >/dev/null 2>&1
python3 $D/isci.py >/dev/null 2>&1
echo "NOT: tampon araçları: $(python3 -c "import json;d=json.load(open('$D/kuyruk/araclar.json'));print(' '.join(k+('=var' if v else '=YOK') for k,v in d.items() if k!='zaman'))" 2>/dev/null)"
# 3) ayarlar (yoksa örnekten) ve kasadan anahtarlar
if [ ! -f $D/sosyal.env ]; then
  cp sunucu/sosyal/sosyal.env.ornek $D/sosyal.env
  sed -i "s/^SOSYAL_OTURUM_ANAHTARI=.*/SOSYAL_OTURUM_ANAHTARI=$(openssl rand -hex 32)/" $D/sosyal.env
  chmod 600 $D/sosyal.env
fi
umask 077; : > $D/anahtar.env.yeni; BULUNAN=""
for ad in gemini_api_key groq_api_key openrouter_api_key anthropic_api_key openai_api_key mistral_api_key deepseek_api_key sosyal_parola; do
  v=$(/opt/aesun/kasa_coz.sh $ad 2>/dev/null) || continue
  [ -n "$v" ] || continue
  printf '%s=%s\n' "$(echo $ad | tr a-z A-Z)" "$v" >> $D/anahtar.env.yeni; BULUNAN="$BULUNAN $ad"
done
mv $D/anahtar.env.yeni $D/anahtar.env; chmod 600 $D/anahtar.env
echo "NOT: kasada bulunan anahtarlar:${BULUNAN:- yok (yalnız Claude elle yolu çalışır)}"
# 4) derle, başlat, sağlık kontrolü
cd $D/kod
saglik() { for i in $(seq 1 20); do [ "$(curl -s -o /dev/null -w '%{http_code}' --max-time 5 http://127.0.0.1:5090/saglik)" = 200 ] && return 0; sleep 2; done; return 1; }
if docker compose build -q >/tmp/sosyal_build.log 2>&1 && docker compose up -d >/dev/null 2>&1 && saglik; then
  echo "NOT: Sosyal Stüdyo yayında · $(curl -s --max-time 5 http://127.0.0.1:5090/saglik)"
  docker exec sosyal-studyo python -m sosyal.cli durum 2>/dev/null | sed 's/^/NOT: /' | head -12
  rm -rf $D/kod.onceki
else
  echo "NOT: HATA kurulum başarısız · $(tail -3 /tmp/sosyal_build.log | tr '\n' ' ' | cut -c1-200) · geri alınıyor"
  if [ -d $D/kod.onceki ]; then rm -rf $D/kod && mv $D/kod.onceki $D/kod; fi
  [ -n "$ONCE" ] && docker tag "$ONCE" kod-sosyal:latest 2>/dev/null
  cd $D/kod && docker compose up -d >/dev/null 2>&1
  echo "NOT: geri alındı"
  exit 1
fi
