#!/bin/bash
# Video işçisini kaldırır; HiveOS ve kazım ayarları olduğu gibi kalır. Kazımı yeniden başlatmak: miner start
rm -f /etc/cron.d/aerig
docker rmi -f aerig:1 >/dev/null 2>&1
rm -rf /opt/aerig
echo "Video işçisi kaldırıldı. Kazım için: miner start"
