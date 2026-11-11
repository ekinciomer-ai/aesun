#!/bin/bash
# Mehmet Ali'nin sunucu hesabını kapatır (dosyaları silinmez; tekrar açmak için gesfin_hesap_kur).
U=mehmetali
usermod -L -e 1 $U 2>/dev/null; : > /home/$U/.ssh/authorized_keys 2>/dev/null
pkill -u $U 2>/dev/null; rm -f /etc/sudoers.d/60-mehmetali
echo "NOT: $U kapatıldı (giriş yok, oturumlar sonlandı, yayın yetkisi kaldırıldı)"
