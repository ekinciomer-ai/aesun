#!/bin/bash
# Tampon bölge: futbol simülasyon ortamı (/opt/tampon/futbol, ayrı venv). Başka sisteme dokunmaz.
set -e
D=/opt/tampon/futbol; mkdir -p $D/havuz
command -v python3 >/dev/null
python3 -c "import ensurepip" 2>/dev/null || { DEBIAN_FRONTEND=noninteractive apt-get -qq update >/dev/null && DEBIAN_FRONTEND=noninteractive apt-get -qq install -y python3.12-venv >/dev/null; echo "NOT: python3.12-venv kuruldu"; }
[ -x $D/venv/bin/pip ] || { rm -rf $D/venv; python3 -m venv $D/venv; }
$D/venv/bin/pip -q install --upgrade pip >/dev/null 2>&1 || true
$D/venv/bin/pip -q install penaltyblog numpy >/tmp/fpip.log 2>&1 || { tail -5 /tmp/fpip.log; echo "NOT: HATA penaltyblog kurulamadı"; exit 1; }
cp sunucu/futbol/*.py sunucu/futbol/README.md $D/
cd $D && timeout 600 $D/venv/bin/python gun.py > $D/havuz/calisma_2026-11-05.txt 2>&1
echo "NOT: penaltyblog $($D/venv/bin/python -c 'import penaltyblog;print(penaltyblog.__version__)') kuruldu ($D)"
echo "NOT: sunucuda 17 maç simüle edildi; ilk 3 satır:"; head -3 $D/havuz/calisma_2026-11-05.txt | sed 's/^/NOT: /'
ls -la $D/gun_2026-11-05.json | awk '{print "NOT: çıktı "$5" bayt"}'
