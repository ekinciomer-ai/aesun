#!/bin/bash
# Taşıma: yeni sunucunun (159.198.76.80) ns1'den veri çekmesine izin verir. Anahtar yalnız o IP'den geçerli.
# Taşıma bitince islem_tasima_izin_kaldir ile kaldırılır.
set -e
P='from="159.198.76.80" ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIJE50J1CC+eWmgBmyeaaB0WzjuA3DJTbCeAeOzKSmzNx cutkoda-tasima'
grep -q 'cutkoda-tasima' /root/.ssh/authorized_keys || echo "$P" >> /root/.ssh/authorized_keys
echo "NOT: taşıma anahtarı: $(grep -c cutkoda-tasima /root/.ssh/authorized_keys) satır · ufw 22: $(ufw status | grep -E '^22|OpenSSH' | head -1 | tr -s ' ')"
