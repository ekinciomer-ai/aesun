#!/usr/bin/env bash
# AEMonitoring — Raspberry Pi kurulumu (tek komut):
#   curl -fsSL https://raw.githubusercontent.com/ekinciomer-ai/aesun/main/pi/kur.sh | bash
# sudo şifresi varsa systemd, yoksa kullanıcı crontab'ı ile kurar (şifre gerekmez).
set -uo pipefail
KULLANICI="$(id -un)"; EV="$HOME"; KOK="$EV/aesun"
echo "== AEMonitoring Pi kurulumu ($KULLANICI, $KOK)"
SUDO=0; sudo -n true 2>/dev/null && SUDO=1
[ "$SUDO" = 1 ] && echo "sudo: var (systemd ile kurulacak)" || echo "sudo: şifresiz yetki yok, crontab ile kurulacak (şifre gerekmez)"

# Kod
if command -v git >/dev/null; then
  if [ -d "$KOK/.git" ]; then git -C "$KOK" pull -q; else git clone -q https://github.com/ekinciomer-ai/aesun "$KOK"; fi
else
  mkdir -p "$KOK" && curl -fsSL https://github.com/ekinciomer-ai/aesun/archive/refs/heads/main.tar.gz | tar xz -C "$KOK" --strip-components=1
fi
# Python ve requests
PY=python3
if ! $PY -c "import requests" 2>/dev/null; then
  if [ -x "$EV/SAHA/venv/bin/python" ] && "$EV/SAHA/venv/bin/python" -c "import requests" 2>/dev/null; then PY="$EV/SAHA/venv/bin/python"
  elif [ "$SUDO" = 1 ]; then sudo apt-get install -y -qq python3-requests >/dev/null
  else $PY -m pip install --user -q --break-system-packages requests || $PY -m pip install --user -q requests; fi
fi
echo "python: $PY"

# OSOS ayarları
mkdir -p "$EV/.aesun"; ENV="$EV/.aesun/osos.env"
if [ ! -s "$ENV" ]; then
  echo "-- OSOS ayarları (yazdıklarınız ekranda görünmez)"
  read -rp  "OSOS kullanıcı adı: " U </dev/tty
  read -rsp "OSOS şifresi: " S </dev/tty; echo
  read -rsp "GitHub token (epias-ptf, Contents: Read and write): " G </dev/tty; echo
  read -rsp "Pi anahtarı (n8n 'aesun Pi anahtarı'; bilmiyorsanız boş bırakıp Enter): " A </dev/tty; echo
  printf 'OSOS_KULLANICI=%s\nOSOS_SIFRE=%s\nGITHUB_TOKEN=%s\nAESUN_ANAHTAR=%s\n' "$U" "$S" "$G" "$A" > "$ENV"
  chmod 600 "$ENV"
fi
A="$(grep '^AESUN_ANAHTAR=' "$ENV" | cut -d= -f2-)"
NABIZ=1; [ -z "$A" ] && NABIZ=0 && echo "Pi anahtarı boş: nabız şimdilik kurulmuyor (sonra bu komutu tekrar çalıştırın)."
if [ "$NABIZ" = 1 ] && ! grep -q '^AESUN_PI_ANAHTAR=..' "$KOK/env.txt" 2>/dev/null; then
  sed -i '/^AESUN_PI_ANAHTAR=/d;/^AESUN_SERVISLER=/d' "$KOK/env.txt" 2>/dev/null
  printf 'AESUN_PI_ANAHTAR=%s\nAESUN_SERVISLER="osos altminer"\n' "$A" >> "$KOK/env.txt"; chmod 600 "$KOK/env.txt"
fi
chmod +x "$KOK/pi/nabiz.sh"

if [ "$SUDO" = 1 ]; then
  for b in aesun-osos.service aesun-osos.timer aesun-nabiz.service aesun-nabiz.timer; do
    sed -e "s#/home/pi/aesun#$KOK#g" -e "s#^User=pi#User=$KULLANICI#" -e "s#/usr/bin/python3#$PY#" "$KOK/pi/$b" | sudo tee "/etc/systemd/system/$b" >/dev/null
  done
  grep -q '^User=' /etc/systemd/system/aesun-nabiz.service || sudo sed -i "/^\[Service\]/a User=$KULLANICI" /etc/systemd/system/aesun-nabiz.service
  sudo systemctl daemon-reload && sudo systemctl enable --now aesun-osos.timer aesun-nabiz.timer
else
  ( crontab -l 2>/dev/null | grep -v 'aesun/' ;
    echo "10 * * * * $PY $KOK/toplayicilar/osos_toplayici.py >> $KOK/osos.log 2>&1";
    [ "$NABIZ" = 1 ] && echo "*/10 * * * * $KOK/pi/nabiz.sh >> $KOK/nabiz.log 2>&1" ) | crontab -
  echo "crontab:"; crontab -l | grep aesun/
fi

echo "-- İlk OSOS denemesi (son 2 gün)"
$PY "$KOK/toplayicilar/osos_toplayici.py" --gun 2
if [ "$NABIZ" = 1 ]; then echo "-- Nabız"; "$KOK/pi/nabiz.sh" && cat "$KOK/onbellek/kaynak.txt"; fi
echo "== Bitti. Kayıt: $KOK/osos.log  |  Güncelleme: bu komutu tekrar çalıştırın."
