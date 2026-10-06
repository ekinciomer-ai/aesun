#!/usr/bin/env bash
# AEMonitoring — Raspberry Pi kurulumu (tek komut):
#   curl -fsSL https://raw.githubusercontent.com/ekinciomer-ai/aesun/main/pi/kur.sh | bash
# Yapar: depoyu ~/aesun'a indirir/günceller, ayar dosyalarını sorarak oluşturur,
# OSOS toplayıcıyı (her saat xx:10) ve Pi nabzını (10 dk) systemd ile kurar, ilk denemeyi çalıştırır.
set -euo pipefail
KULLANICI="$(id -un)"; EV="$HOME"; KOK="$EV/aesun"
echo "== AEMonitoring Pi kurulumu ($KULLANICI, $KOK)"
sudo apt-get update -qq && sudo apt-get install -y -qq git python3 python3-requests curl >/dev/null
if [ -d "$KOK/.git" ]; then git -C "$KOK" pull -q; else git clone -q https://github.com/ekinciomer-ai/aesun "$KOK"; fi

# OSOS ayarları
mkdir -p "$EV/.aesun"; ENV="$EV/.aesun/osos.env"
if [ ! -s "$ENV" ]; then
  echo "-- OSOS ayarları (yazdıklarınız ekranda görünmez)"
  read -rp  "OSOS kullanıcı adı: " U </dev/tty
  read -rsp "OSOS şifresi: " S </dev/tty; echo
  read -rsp "GitHub token (epias-ptf, Contents: Read and write): " G </dev/tty; echo
  read -rsp "Pi anahtarı (n8n 'aesun Pi anahtarı' değeri): " A </dev/tty; echo
  printf 'OSOS_KULLANICI=%s\nOSOS_SIFRE=%s\nGITHUB_TOKEN=%s\nAESUN_ANAHTAR=%s\n' "$U" "$S" "$G" "$A" > "$ENV"
  chmod 600 "$ENV"
fi
# Pi nabzı aynı anahtarı kullanır
if ! grep -q '^AESUN_PI_ANAHTAR=' "$KOK/env.txt" 2>/dev/null; then
  A="$(grep '^AESUN_ANAHTAR=' "$ENV" | cut -d= -f2-)"
  printf 'AESUN_PI_ANAHTAR=%s\nAESUN_SERVISLER="aesun-osos.timer aesun-nabiz.timer"\n' "$A" >> "$KOK/env.txt"; chmod 600 "$KOK/env.txt"
fi
chmod +x "$KOK/pi/nabiz.sh"

# systemd birimleri (kullanıcı adı ve klasöre göre)
for b in aesun-osos.service aesun-osos.timer aesun-nabiz.service aesun-nabiz.timer; do
  sed -e "s#/home/pi/aesun#$KOK#g" -e "s#^User=pi#User=$KULLANICI#" "$KOK/pi/$b" | sudo tee "/etc/systemd/system/$b" >/dev/null
done
grep -q '^User=' /etc/systemd/system/aesun-nabiz.service || sudo sed -i "/^\[Service\]/a User=$KULLANICI" /etc/systemd/system/aesun-nabiz.service
sudo systemctl daemon-reload
sudo systemctl enable --now aesun-osos.timer aesun-nabiz.timer

echo "-- İlk OSOS denemesi (son 2 gün)"
python3 "$KOK/toplayicilar/osos_toplayici.py" --gun 2 || true
echo "-- Nabız"
sudo systemctl start aesun-nabiz.service && cat "$KOK/onbellek/kaynak.txt" 2>/dev/null || true
echo
systemctl list-timers 'aesun-*' --no-pager
echo "== Bitti. Kayıt: $KOK/osos.log  |  Güncelleme: bu komutu tekrar çalıştırın."
