#!/bin/bash
# Bilgisayardaki GitHub klasörlerinin sunucudaki kopyası: /opt/depolar/<ad> (salt okuma, 30 dakikada bir çekilir).
# Bilgisayardaki eşitleme görevinin (Simdi_Esitle) yerini alır; /opt altında olduğu için gece yedeğine ve Drive kopyasına da girer.
# Anahtar: Kasa'daki "sunucu_github_okuma" (ekinciomer-ai, tüm depolar, Contents: Read) ve isteğe bağlı "cutkoda_github_okuma".
# Değerler yazdırılmaz; git ayarına konmaz (yalnız istek başlığında kullanılır).
set -u
K=/opt/depolar; mkdir -p $K; chmod 750 $K
python3 - <<'PY'
import json
f="/var/lib/docker/volumes/aesun_aesun_veri/_data/kasa/istenen.json"
try: d=json.load(open(f))
except Exception: d={}
d.setdefault("sunucu_github_okuma","Sunucunun depoları kopyalaması için GitHub anahtarı: ekinciomer-ai, All repositories, Contents: Read-only, 1 yıl.")
d.setdefault("cutkoda_github_okuma","cutkoda/cutkoda deposu için GitHub anahtarı (Resource owner: cutkoda), Contents: Read-only, 1 yıl.")
json.dump(d,open(f,"w"),ensure_ascii=False,indent=1)
PY
chown 1001:1001 /var/lib/docker/volumes/aesun_aesun_veri/_data/kasa/istenen.json
cat > /opt/aesun/depolar_cek.sh <<'SH'
#!/bin/bash
# ad|depo|dal|anahtar_kaydi
K=/opt/depolar; L=/var/log/aesun-depolar.log
while IFS='|' read -r ad depo dal kayit; do
  [ -z "$ad" ] && continue
  T=$(/opt/aesun/kasa_coz.sh "$kayit" 2>/dev/null) || { echo "$(date -Is) $ad anahtar yok ($kayit)" >> $L; continue; }
  B="Authorization: Basic $(printf 'x-access-token:%s' "$T" | base64 -w0)"
  if [ -d "$K/$ad/.git" ]; then
    git -C "$K/$ad" -c http.extraHeader="$B" fetch -q origin "$dal" && git -C "$K/$ad" reset -q --hard "origin/$dal" \
      && echo "$(date -Is) $ad güncel $(git -C "$K/$ad" log -1 --format=%h)" >> $L || echo "$(date -Is) $ad HATA çekme" >> $L
  else
    git -c http.extraHeader="$B" clone -q --branch "$dal" "https://github.com/$depo.git" "$K/$ad" \
      && echo "$(date -Is) $ad kopyalandı" >> $L || echo "$(date -Is) $ad HATA kopyalama" >> $L
  fi
  unset T B
done < /opt/aesun/depolar.liste
SH
chmod 700 /opt/aesun/depolar_cek.sh
cat > /opt/aesun/depolar.liste <<'LS'
aesun|ekinciomer-ai/aesun|main|sunucu_github_okuma
anti_star|ekinciomer-ai/anti_star|main|sunucu_github_okuma
AUTOCOIN|ekinciomer-ai/AUTOCOIN|master|sunucu_github_okuma
epias-ptf|ekinciomer-ai/epias-ptf|main|sunucu_github_okuma
Kabul_Kontrol|ekinciomer-ai/Kabul_Kontrol|main|sunucu_github_okuma
osos|ekinciomer-ai/osos|main|sunucu_github_okuma
otocoin|ekinciomer-ai/otocoin|main|sunucu_github_okuma
SAHA|ekinciomer-ai/saha|main|sunucu_github_okuma
Saha_yedek|ekinciomer-ai/Saha_yedek|main|sunucu_github_okuma
SYS|ekinciomer-ai/SYS|main|sunucu_github_okuma
Tavaf|ekinciomer-ai/Tavaf|main|sunucu_github_okuma
AntikStudyo_Medya|cutkoda/cutkoda|medya|cutkoda_github_okuma
LS
cat > /etc/systemd/system/aesun-depolar.service <<'U'
[Unit]
Description=GitHub depolarının sunucu kopyası
[Service]
Type=oneshot
Nice=10
ExecStart=/opt/aesun/depolar_cek.sh
U
cat > /etc/systemd/system/aesun-depolar.timer <<'U'
[Unit]
Description=Depoları 30 dakikada bir çek
[Timer]
OnBootSec=5min
OnUnitActiveSec=30min
[Install]
WantedBy=timers.target
U
systemctl daemon-reload && systemctl enable --now aesun-depolar.timer >/dev/null 2>&1
timeout 1800 /opt/aesun/depolar_cek.sh
echo "NOT: son durum: $(tail -12 /var/log/aesun-depolar.log | tr '\n' ';' | cut -c1-900)"
echo "NOT: boyut: $(du -sh $K 2>/dev/null | cut -f1) · zamanlayıcı: $(systemctl is-active aesun-depolar.timer)"
