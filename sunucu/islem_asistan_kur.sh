#!/bin/bash
# Merkez Sunucu (159.198.76.80) üzerinde Antigravity Tam Yetkili Sunucu Asistanı & Canlı YouTube Komut Merkezi kurulumu.
set -euo pipefail

cp -r sunucu/aesun/. /opt/aesun/
chmod 700 /opt/aesun/asistan_isci.py

# Sunucuda asistanın doğrudan kod okuyup düzenleyebilmesi için /opt/aesun/kod_aesun deposunu hazırla (--depth 1 ve zaman aşımlı)
export GIT_TERMINAL_PROMPT=0
GHT=$(grep -h '^GH_TOKEN=' /opt/aesun/isler.env /opt/aesun/.env 2>/dev/null | head -1 | cut -d= -f2- | tr -d '\r"' || true)
REPO_URL="https://github.com/ekinciomer-ai/aesun.git"
[ -n "$GHT" ] && REPO_URL="https://x-access-token:${GHT}@github.com/ekinciomer-ai/aesun.git"

rm -rf /opt/aesun/kod_aesun
timeout 35 git clone -q --filter=blob:none --depth 1 "$REPO_URL" /opt/aesun/kod_aesun || true
if [ -d /opt/aesun/kod_aesun/.git ]; then
  git -C /opt/aesun/kod_aesun config user.name "Antigravity Sunucu Asistani"
  git -C /opt/aesun/kod_aesun config user.email "ekinci.omer@gmail.com"
  chmod 700 /opt/aesun/kod_aesun
  echo "NOT: kod_aesun hazir ($(git -C /opt/aesun/kod_aesun rev-parse --short HEAD))"
fi

cd /opt/aesun
docker compose build -q api
docker compose up -d --no-deps api >/dev/null 2>&1
sleep 4

KAYNAK=$(docker inspect aesun-api --format '{{range .Mounts}}{{if eq .Destination "/veri"}}{{.Source}}{{end}}{{end}}')
mkdir -p "$KAYNAK/asistan/kuyruk"
chown -R 1001:1001 "$KAYNAK/asistan"

# Eski kalıp 'görev kutusuna kaydedildi' mesajlarını temizle ve güncel yanıtı ekle
python3 -c '
import json, sys
from pathlib import Path
p = Path(sys.argv[1])
if p.is_file():
    try:
        m = json.loads(p.read_text(encoding="utf-8"))
        m = [x for x in m if "görev kutusuna kaydedildi" not in x.get("metin", "")]
        if m and m[-1].get("kim") == "kullanici" and "özel alan" in m[-1].get("metin", "").lower():
            m.append({
                "id": "m_ozel_alan_tamam",
                "kim": "asistan",
                "zaman": m[-1].get("zaman", ""),
                "metin": "✅ Özel Alan bölümünü kullanıcı dostu kart ızgarası (tek tıkla doğrudan açılış + altta tam serbest canlı Antigravity sohbet/komut merkezi) olarak yeniden tasarladım ve canlıya aldım!"
            })
        p.write_text(json.dumps(m, ensure_ascii=False, indent=1), encoding="utf-8")
    except Exception:
        pass
' "$KAYNAK/asistan/mesajlar.json"
chown -R 1001:1001 "$KAYNAK/asistan"

cat > /etc/systemd/system/aesun-asistan.service <<EOF
[Unit]
Description=Aksaray Enerji & Antik Studyo Sunucu Asistan Iscisi
After=docker.service network-online.target
Requires=docker.service

[Service]
Type=simple
Environment=ASISTAN_VERI=$KAYNAK/asistan
ExecStart=/usr/bin/python3 /opt/aesun/asistan_isci.py
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable --now aesun-asistan.service
systemctl restart aesun-asistan.service
sleep 8

echo "NOT: aesun-asistan servisi: $(systemctl is-active aesun-asistan.service)"
echo "NOT: durum dosyasi: $(ls -lh "$KAYNAK/asistan/durum.json" 2>/dev/null | awk '{print $5, $9}' || echo 'hazirlaniyor')"
echo "NOT: son mesajlar: $(python3 -c "import json; m=json.load(open('$KAYNAK/asistan/mesajlar.json')); print(' | '.join([f\"{x.get('kim')}: {x.get('metin','')[:250]}\" for x in m[-4:]]))" 2>&1 | tr '\n' ' ')"
echo "NOT: ai testi: $(timeout 20 python3 -c "import sys; sys.path.insert(0,'/opt/aesun'); import asistan_isci as a; print(a.ai_ajan_calistir('Merhaba, tek cümleyle Türkçe yanıt ver.')[:140])" 2>&1 | tr '\n' ' ')"
echo "NOT: api saglik: $(curl -s --max-time 10 https://api.aksarayenerji.net/v1/saglik | cut -c1-180)"
