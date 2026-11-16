#!/bin/bash
# Kozmos Lab seri bölümü: sunucuya koy + havuza teslim + Ömer kararını uygula (tek işlem).
set -u
bash sunucu/islem_kz_mat_teslim.sh && bash sunucu/islem_havuz_onay.sh
