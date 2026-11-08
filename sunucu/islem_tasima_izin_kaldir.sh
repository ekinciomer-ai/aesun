#!/bin/bash
set -e
sed -i '/cutkoda-tasima/d' /root/.ssh/authorized_keys
echo "NOT: taşıma anahtarı kaldırıldı (kalan: $(grep -c cutkoda-tasima /root/.ssh/authorized_keys || true))"
