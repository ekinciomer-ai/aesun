#!/bin/bash
# Kozmos Lab: bekleyen videoları yenile (B5-B10 hızlı ses) + yeni bölümü teslim et ve kararı uygula — tek yedekle tek işlem.
set -u
bash sunucu/islem_video_yenile.sh; bash sunucu/islem_kz_mat_teslim_onay.sh
