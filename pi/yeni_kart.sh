#!/bin/bash
# AEMonitoring · Yeni SD karta taşıma (tak-çalıştır)
#
# Ne yapar: Yeni kartta temiz Raspberry Pi OS açıldıktan sonra, ESKİ kart USB okuyucuyla Pi'ye takılıyken
# bir kez çalıştırılır. Eski kartı YALNIZ OKUNUR bağlar (hiçbir şeyini değiştirmez → geri dönüş yolu),
# /home/pi'nin tamamını (SAHA, .aesun, aesun, yedek, osos.env ve diğer şifre dosyaları dahil), kullanıcı
# crontab'ını, altminer/aesun systemd servislerini ve Tailscale kimliğini (aynı "saha-pi" makinesi) yeni karta kopyalar,
# gereken paketleri kurar, Python ortamını kontrol eder, servisleri başlatır ve nabız gönderir.
# Şifre/token dosyaları ekrana yazılmaz, depoya gönderilmez; yalnız eski karttan yeni karta kopyalanır.
#
# Kullanım (Pi'de, yeni kartla açıldıktan sonra):
#   curl -fsSL https://raw.githubusercontent.com/ekinciomer-ai/aesun/main/pi/yeni_kart.sh | bash
set -uo pipefail
KUL=${KUL:-pi}
EV=/home/$KUL
ESKI=/mnt/eski_kart
adim() { echo; echo "==> $*"; }
hata() { echo "HATA: $*" >&2; exit 1; }

[ "$(id -un)" = "$KUL" ] || [ "$(id -u)" = 0 ] || hata "'$KUL' kullanıcısıyla çalıştırın."
sudo -n true 2>/dev/null || sudo true || hata "sudo gerekli (yeni kartta Imager'da verdiğiniz şifre)."

adim "1/8 Eski kart aranıyor (USB okuyucu)"
KOK=$(findmnt -no SOURCE / | sed 's/p\?[0-9]*$//')
ADAY=""
for b in $(lsblk -lnpo NAME,TYPE,FSTYPE | awk '$2=="part" && $3=="ext4"{print $1}'); do
  case "$b" in "$KOK"*) continue;; esac
  sudo mkdir -p $ESKI
  if sudo mount -o ro,noload "$b" $ESKI 2>/dev/null || sudo mount -o ro "$b" $ESKI 2>/dev/null; then
    if [ -d "$ESKI/home/$KUL/SAHA" ] || [ -d "$ESKI/home/$KUL/.aesun" ]; then ADAY=$b; break; fi
    sudo umount $ESKI
  fi
done
[ -n "$ADAY" ] || hata "Eski kart bulunamadı. Eski kartı USB okuyucuyla takıp tekrar çalıştırın (lsblk ile görün)."
echo "Eski kart: $ADAY → $ESKI (salt okunur)"
du -sh "$ESKI/home/$KUL" 2>/dev/null | sed 's/^/Eski ev klasörü: /'

adim "2/8 Paketler"
sudo apt-get update -qq
sudo apt-get install -y -qq git rsync python3-requests python3-venv python3-pip >/dev/null || hata "apt kurulumu başarısız"

adim "3/8 Ev klasörü kopyalanıyor (şifre dosyaları dahil; önbellekler hariç)"
sudo rsync -aHAX --info=stats1 \
  --exclude='.cache/' --exclude='__pycache__/' --exclude='.local/share/Trash/' \
  "$ESKI/home/$KUL/" "$EV/" || hata "kopyalama başarısız"
sudo chown -R "$KUL:$KUL" "$EV"
# SSH anahtarları: eski yetkili anahtarlar korunur, yeni karttakiler de kalır
[ -f "$EV/.ssh/authorized_keys" ] && chmod 600 "$EV/.ssh/authorized_keys"
[ -f "$EV/.aesun/osos.env" ] && chmod 600 "$EV/.aesun/osos.env" && echo "osos.env taşındı (içerik gösterilmez)" || echo "UYARI: ~/.aesun/osos.env eski kartta yok"

adim "4/8 Zamanlanmış işler (crontab)"
if sudo test -f "$ESKI/var/spool/cron/crontabs/$KUL"; then
  sudo cat "$ESKI/var/spool/cron/crontabs/$KUL" | grep -v '^# DO NOT EDIT\|^# (.* installed on\|^# (Cron version' | sudo crontab -u "$KUL" -
  echo "$(sudo crontab -u "$KUL" -l | grep -vc '^#') satır crontab yüklendi"
else
  echo "Eski kartta crontab yok → kur.sh ile kurulacak"; KUR=1
fi

adim "5/8 Servisler (altminer, aesun-*)"
for f in "$ESKI"/etc/systemd/system/altminer*.service "$ESKI"/etc/systemd/system/aesun-*.service "$ESKI"/etc/systemd/system/aesun-*.timer; do
  [ -f "$f" ] || continue
  sudo cp "$f" /etc/systemd/system/ && echo "kopyalandı: $(basename "$f")"
done
sudo systemctl daemon-reload
for d in "$ESKI"/etc/systemd/system/*.wants/altminer*.service "$ESKI"/etc/systemd/system/*.wants/aesun-*; do
  [ -e "$d" ] && sudo systemctl enable "$(basename "$d")" >/dev/null 2>&1 && echo "etkin: $(basename "$d")"
done

adim "6/8 Python ortamı (altminer venv)"
VENV="$EV/SAHA/antminer/venv"
if [ -d "$VENV" ] && ! "$VENV/bin/python" -c 'import requests' >/dev/null 2>&1; then
  echo "Eski venv bu işletim sisteminde çalışmıyor → yeniden kuruluyor"
  DONDUR=$(ls -t "$EV"/yedek/aesun_yedek_*.tar.gz 2>/dev/null | head -1)
  sudo -u "$KUL" mv "$VENV" "$VENV.eski"
  sudo -u "$KUL" python3 -m venv "$VENV"
  if [ -n "$DONDUR" ] && tar xzf "$DONDUR" -O --wildcards '*sistem/pip_freeze.txt' > /tmp/pip_freeze.txt 2>/dev/null && [ -s /tmp/pip_freeze.txt ]; then
    sudo -u "$KUL" "$VENV/bin/pip" install -q -r /tmp/pip_freeze.txt || sudo -u "$KUL" "$VENV/bin/pip" install -q requests
  elif [ -f "$EV/SAHA/antminer/requirements.txt" ]; then
    sudo -u "$KUL" "$VENV/bin/pip" install -q -r "$EV/SAHA/antminer/requirements.txt"
  else
    sudo -u "$KUL" "$VENV/bin/pip" install -q requests
  fi
fi
[ -d "$VENV" ] && { "$VENV/bin/python" -c 'import requests' && echo "venv tamam" || echo "UYARI: venv sorunlu"; }

adim "7/8 Tailscale (aynı saha-pi kimliği)"
if sudo test -d "$ESKI/var/lib/tailscale"; then
  command -v tailscale >/dev/null || curl -fsSL https://tailscale.com/install.sh | sh >/dev/null
  sudo systemctl stop tailscaled 2>/dev/null
  sudo rsync -a "$ESKI/var/lib/tailscale/" /var/lib/tailscale/
  sudo systemctl enable --now tailscaled >/dev/null 2>&1
  sleep 5; tailscale status 2>/dev/null | head -1 || echo "Tailscale: 'sudo tailscale up --ssh' ile giriş gerekebilir"
else
  echo "Eski kartta Tailscale yok, atlandı"
fi

adim "8/8 Kod güncelleme, servisler, nabız"
sudo -u "$KUL" git -C "$EV/aesun" pull -q --ff-only 2>/dev/null || echo "aesun git pull yapılamadı (sonra crontab dener)"
[ "${KUR:-0}" = 1 ] && sudo -u "$KUL" bash "$EV/aesun/pi/kur.sh"
sudo systemctl restart altminer 2>/dev/null && echo "altminer: $(systemctl is-active altminer)"
sudo -u "$KUL" python3 "$EV/aesun/pi/nabiz.py" 2>&1 | tail -2

sudo umount $ESKI
echo
echo "BİTTİ. Eski kart değiştirilmedi; çıkarıp saklayın (geri dönüş için)."
echo "Kontrol: Portal → Denetçi → Veri Akışı → Kapasite (Pi kartı yeni boyutu göstermeli), Monitoring → Cihazlar 5 dk içinde güncellenmeli."
