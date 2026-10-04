#!/bin/sh
# Klasörü /home/pi/ptf_toplayici'ya kopyaladıktan sonra: sh pi/kur.sh
sudo cp pi/ptf-cek.service pi/ptf-cek.timer /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now ptf-cek.timer
systemctl list-timers ptf-cek.timer
