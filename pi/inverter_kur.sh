#!/usr/bin/env bash
# AEMonitoring — Sungrow (YD, Anka) ve Inavitas (AE) canlı inverter toplayıcısını Pi'ye kurar (sudo gerekmez):
#   bash ~/aesun/pi/inverter_kur.sh
# Giriş bilgileri bir kez sorulur, ~/.aesun/osos.env'e yazılır (chmod 600). Ekranda görünmez, koda/GitHub'a gitmez.
set -uo pipefail
KOK="$HOME/aesun"; ENV="$HOME/.aesun/osos.env"
git -C "$KOK" pull -q || true
mkdir -p "$HOME/.aesun"; touch "$ENV"; chmod 600 "$ENV"

sor() {  # sor ANAHTAR "Açıklama" [gizli]
  grep -q "^$1=." "$ENV" && { echo "  $1: kayıtlı"; return; }
  if [ "${3:-}" = gizli ]; then read -rsp "$2: " V </dev/tty; echo; else read -rp "$2: " V </dev/tty; fi
  [ -n "$V" ] && printf '%s=%s\n' "$1" "$V" >> "$ENV"
}
echo "-- Sungrow iSolarCloud (developer portal > Applications)"
sor SUNGROW_APPKEY "Appkey"
sor SUNGROW_SECRET "Secret key (x-access-key)" gizli
sor SUNGROW_USER "iSolarCloud kullanıcı adı"
sor SUNGROW_PASSWORD "iSolarCloud şifresi" gizli
grep -q '^SUNGROW_RSA_PUBLIC=' "$ENV" || { read -rp "RSA public key (uygulamada şifreleme kapalıysa boş bırakın): " V </dev/tty; [ -n "$V" ] && printf 'SUNGROW_RSA_PUBLIC=%s\n' "$V" >> "$ENV"; }
echo "-- Inavitas (insos.inavitas.io)"
sor INAVITAS_USER "Kullanıcı adı"
sor INAVITAS_PASS "Şifre" gizli

PY="$HOME/SAHA/antminer/venv/bin/python"; [ -x "$PY" ] || PY="$KOK/venv/bin/python"; [ -x "$PY" ] || { python3 -m venv "$KOK/venv"; PY="$KOK/venv/bin/python"; }
echo "python: $PY"
"$PY" -c "import requests, bs4, cryptography" 2>/dev/null || "$PY" -m pip install -q requests beautifulsoup4 cryptography

( crontab -l 2>/dev/null | grep -v 'pi/saha_inverter.py' ;
  echo "*/10 * * * * flock -n /tmp/aesun_inv.lock $PY $KOK/pi/saha_inverter.py >> $KOK/saha_inverter.log 2>&1" ) | crontab -
echo "-- Deneme"
"$PY" "$KOK/pi/saha_inverter.py" --test && echo "== Tamam: 10 dakikada bir çalışacak (log: $KOK/saha_inverter.log)" \
  || echo "HATA: yukarıdaki mesaja bakın. Yanlış girilen bilgiyi $ENV içinden silip betiği tekrar çalıştırın."
