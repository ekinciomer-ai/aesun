#!/bin/bash
# Yükleme Yöneticisi: veri havuzunu kurar/günceller (/opt/aesun/havuz). Saatlik eşitleme zamanlayıcısı. Diğer sistemlere dokunmaz.
set -eu
mkdir -p /opt/aesun/havuz/video /opt/aesun/havuz/kart /opt/aesun/havuz/yedek
install -m 755 sunucu/havuz/yonetici.py /opt/aesun/havuz/yonetici.py
cat > /etc/systemd/system/aesun-havuz.service <<'EOF'
[Unit]
Description=Yükleme Yöneticisi eşitleme (havuz durumunu platform kayıtlarından günceller)
[Service]
Type=oneshot
Nice=10
ExecStart=/usr/bin/python3 /opt/aesun/havuz/yonetici.py esitle
EOF
cat > /etc/systemd/system/aesun-havuz.timer <<'EOF'
[Unit]
Description=Yükleme Yöneticisi saatlik eşitleme
[Timer]
OnCalendar=*-*-* *:41:00
Persistent=true
[Install]
WantedBy=timers.target
EOF
systemctl daemon-reload && systemctl enable --now aesun-havuz.timer >/dev/null 2>&1
echo "NOT: havuz kuruldu · zamanlayıcı: $(systemctl is-active aesun-havuz.timer) · kalite kapısı: $([ -x /opt/aesun/kalite_kapisi.py ] || [ -f /opt/aesun/kalite_kapisi.py ] && echo var || echo YOK)"
