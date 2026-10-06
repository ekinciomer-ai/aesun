#!/usr/bin/env bash
# AEMonitoring — FusionSolar toplayıcıyı Pi'ye kurar (sudo gerekmez):
#   curl -fsSL https://raw.githubusercontent.com/ekinciomer-ai/aesun/main/pi/fusion_kur.sh | bash
set -uo pipefail
KOK="$HOME/aesun"; DIR="$KOK/toplayicilar/fusionsolar"
[ -d "$KOK/.git" ] && git -C "$KOK" pull -q || { echo "Önce pi/kur.sh çalıştırılmalı"; exit 1; }
mkdir -p "$DIR/data"

# Playwright'lı Python
PY=""
for p in "$HOME/SAHA/venv/bin/python" "$KOK/venv/bin/python"; do
  [ -x "$p" ] && "$p" -c "import playwright" 2>/dev/null && PY="$p" && break
done
if [ -z "$PY" ]; then
  echo "-- Playwright kuruluyor (birkaç dakika)"
  python3 -m venv "$KOK/venv" && "$KOK/venv/bin/pip" install -q playwright && "$KOK/venv/bin/python" -m playwright install chromium
  PY="$KOK/venv/bin/python"
fi
echo "python: $PY"

# Giriş bilgileri
if ! grep -q '^FUSIONSOLAR_PASS=.' "$DIR/.env" 2>/dev/null; then
  echo "-- FusionSolar web girişi (şifre ekranda görünmez; bir kez yapıştırın)"
  read -rp  "Kullanıcı adı: " U </dev/tty
  read -rsp "Şifre: " S </dev/tty; echo
  printf 'FUSIONSOLAR_USER=%s\nFUSIONSOLAR_PASS=%s\n' "$U" "$S" > "$DIR/.env"; chmod 600 "$DIR/.env"
fi

# Sürekli çalışma: 10 dakikada bir kontrol, zaten çalışıyorsa dokunmaz
( crontab -l 2>/dev/null | grep -v 'fusionsolar_toplayici' ;
  echo "*/10 * * * * cd $DIR && flock -n /tmp/aesun_fusionsolar.lock $PY fusionsolar_toplayici.py >> $DIR/data/calisma.log 2>&1" ) | crontab -

cd "$DIR"
echo "-- Giriş denemesi"
$PY fusionsolar_toplayici.py --test || { echo "GİRİŞ OLMADI: kullanıcı adı/şifreyi kontrol edin (rm $DIR/.env ile silip tekrar çalıştırın)"; exit 1; }
echo "-- Tesis geçmişi (birkaç dakika)"
$PY fusionsolar_toplayici.py --gecmis
echo "-- Sürekli toplayıcı başlatılıyor"
nohup flock -n /tmp/aesun_fusionsolar.lock $PY fusionsolar_toplayici.py >> "$DIR/data/calisma.log" 2>&1 &
sleep 60; tail -5 "$DIR/data/toplayici.log"
echo "== Bitti. Kayıt: $DIR/data/toplayici.log"
