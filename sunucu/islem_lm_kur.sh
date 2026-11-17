#!/bin/bash
# LVL MAX tek seferde: izin kodu → yenileme anahtarı (yt_kur), Yükleme Yöneticisi kaydı (havuz_lm), kapak + açıklama (yt_lm_marka).
# Tek iş olarak çalışır; böylece sırada bekleyen başka işle çakışıp iptal olmaz.
set -u
bash sunucu/islem_yt_kur.sh || { echo "NOT: HATA yt_kur başarısız"; exit 1; }
bash sunucu/islem_havuz_lm.sh
bash sunucu/islem_yt_lm_marka.sh
