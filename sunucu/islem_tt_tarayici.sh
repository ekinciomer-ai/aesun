#!/bin/bash
# TikTok için sunucuda kalıcı tarayıcı (linuxserver/chromium, GPL-3 imaj). Ömer "normal giriş"i bu pencereden kendisi yapar;
# şifre hiçbir yere yazılmaz, oturum /opt/aesun/tiktok/chromium profilinde kalır. Pencere yalnız GİRİŞ sırasında dışa açılır
# (3001 portu, HTTPS, tek seferlik parola) ve 20 dakika sonra kendiliğinden kapanır; sonra tarayıcı sadece sunucu içinde çalışır.
# Kullanım: islem_tt_tarayici.sh ac   → giriş penceresi (parola NOT satırında, tek kullanımlık, 20 dk)
#           islem_tt_tarayici.sh kapat → dış erişimi kapat, tarayıcıyı iç ağda bırak
set -u
MOD=${1:-ac}; KOK=/opt/aesun/tiktok; IMAJ=lscr.io/linuxserver/chromium:latest
mkdir -p "$KOK/chromium"; chmod 700 "$KOK"
docker image inspect "$IMAJ" >/dev/null 2>&1 || docker pull -q "$IMAJ" >/dev/null 2>&1 || { echo "NOT: HATA tarayıcı imajı indirilemedi"; exit 1; }
docker rm -f tt-tarayici >/dev/null 2>&1
ORTAK=(--name tt-tarayici --memory 2048m --cpus 2 --shm-size 1g --security-opt seccomp=unconfined --restart unless-stopped
       -e PUID=1000 -e PGID=1000 -e TZ=Europe/Istanbul -e LC_ALL=tr_TR.UTF-8
       -e CHROME_CLI="--remote-debugging-port=9222 --remote-debugging-address=0.0.0.0 --lang=tr --disable-blink-features=AutomationControlled https://www.tiktok.com/login"
       -v "$KOK/chromium":/config)
if [ "$MOD" = ac ]; then
  P=$(tr -dc 'a-km-z2-9' </dev/urandom | head -c 10)
  docker run -d "${ORTAK[@]}" -p 3001:3001 -e CUSTOM_USER=omer -e PASSWORD="$P" "$IMAJ" >/dev/null || { echo "NOT: HATA tarayıcı başlamadı"; exit 1; }
  # ufw varsa 20 dk için 3001'i aç
  command -v ufw >/dev/null && ufw status | grep -q "Status: active" && ufw allow 3001/tcp >/dev/null 2>&1 && UFW=1 || UFW=0
  echo "NOT: GIRIS kullanici=omer parola=$P port=3001 (20 dk)"
  # 20 dk sonra dış erişimi kapat (profil kalır)
  cp "$0" "$KOK/tarayici.sh" 2>/dev/null || cat "$0" > "$KOK/tarayici.sh"
  nohup bash -c "sleep 1200; bash $KOK/tarayici.sh kapat" >/dev/null 2>&1 &
else
  command -v ufw >/dev/null && ufw delete allow 3001/tcp >/dev/null 2>&1
  docker run -d "${ORTAK[@]}" "$IMAJ" >/dev/null && echo "NOT: tarayıcı iç ağda çalışıyor (dış erişim kapalı)"
fi
