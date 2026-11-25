#!/bin/bash
# AKSARAY 1 · GPU rig'ini video işçisine çevirir (HiveOS üzerinde, ayrı Docker kutusunda; HiveOS'a dokunmaz).
# HiveOS'ta "Komut çalıştır" ile tek satır:
#   curl -fsSL https://raw.githubusercontent.com/ekinciomer-ai/aesun/main/rig/kur.sh | bash
# Geri alma: bash /opt/aerig/kaldir.sh  (kutu, zamanlayıcı ve dosyalar silinir; HiveOS ve kazım ayarı aynı kalır)
set -u
K=/opt/aerig; HAM=https://raw.githubusercontent.com/ekinciomer-ai/aesun/main/rig
[ "$(id -u)" = 0 ] || { echo "HATA: root gerekli"; exit 1; }
mkdir -p $K && cd $K || exit 1
for f in guncelle.sh isci.sh deneme.sh Dockerfile kaldir.sh; do
  curl -fsSL --retry 3 "$HAM/$f" -o "$f.yeni" && mv "$f.yeni" "$f" || { echo "HATA: $f indirilemedi"; exit 1; }
done
chmod +x *.sh
pkill -f "$K/guncelle.sh" 2>/dev/null; pkill -f "docker build -q -t aerig" 2>/dev/null; docker ps -q --filter ancestor=aerig:1 2>/dev/null | xargs -r docker rm -f >/dev/null 2>&1; sleep 2   # takılı eski tur varsa bırak
nohup bash $K/guncelle.sh ilk >> $K/kur.log 2>&1 &
echo "Kurulum arka planda başladı (15-25 dk sürer). Rig kendini sunucuya kaydedecek, onay bekleyecek."
echo "Günlük: tail -n 30 $K/kur.log"
