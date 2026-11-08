#!/bin/bash
# Granada 1492 · Türkçe · metin Claude (hikâye kalıbı: kanca, duygu, sır, sonuç, soru) · görsel/ses/kurgu ücretsiz
KONU="Granada 1492, Boabdil" DIL=tr SES=tr-TR-AhmetNeural-Male METIN_DOSYA=sunucu/motor_metin/granada_tr.txt bash "$(dirname "$0")/islem_motor_normal.sh"
