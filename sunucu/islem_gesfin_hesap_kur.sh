#!/bin/bash
# Mehmet Ali Sevinç için ayrı, kısıtlı sunucu hesabı (mehmetali).
# - Yalnız anahtarla giriş; root/sudo/docker yok; /opt, yedekler ve diğer uygulamalar ona kapalı (ACL).
# - ~/gesfin: gesfin kodunun çalışma kopyası (.env, secrets, yedekler hariç). ~/evrak/{gelen,giden}: evrak alışverişi.
# - Yayına alma yalnız `gesfin-yenile` ile: ön yedek + sürüm arşivi + derleme + sağlık kontrolü; başarısızsa eski sürüme döner.
set -e
U=mehmetali; H=/home/$U
KEY='ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIEYRsGSXZ3QMml29cB5vaagbPhlEZPIX358N6mYUAbXs mehmetali'
command -v setfacl >/dev/null || { DEBIAN_FRONTEND=noninteractive apt-get install -y -qq acl >/dev/null; }
command -v rsync >/dev/null || { DEBIAN_FRONTEND=noninteractive apt-get install -y -qq rsync >/dev/null; }

id $U >/dev/null 2>&1 || useradd -m -s /bin/bash -c "Mehmet Ali Sevinc (gesfin)" $U
passwd -l $U >/dev/null 2>&1 || true; usermod -U -e "" $U 2>/dev/null; passwd -l $U >/dev/null 2>&1 || true
chmod 700 $H
install -d -m 700 -o $U -g $U $H/.ssh
printf '%s\n' "$KEY" > $H/.ssh/authorized_keys; chown $U:$U $H/.ssh/authorized_keys; chmod 600 $H/.ssh/authorized_keys
install -d -o $U -g $U $H/evrak $H/evrak/gelen $H/evrak/giden

# Diğer sistemlere erişimi kapat (yalnız bu kullanıcı için; diğer her şey aynı kalır)
for d in /opt /var/yedek /var/lib/docker /srv /var/backups; do [ -e $d ] && setfacl -m u:$U:--- $d; done

# SSH: tünel/yönlendirme yok (veritabanı portlarına ulaşamaz)
cat > /etc/ssh/sshd_config.d/60-mehmetali.conf <<'S'
Match User mehmetali
    PasswordAuthentication no
    AllowTcpForwarding no
    AllowStreamLocalForwarding no
    X11Forwarding no
    PermitTunnel no
    GatewayPorts no
S
sshd -t || { rm -f /etc/ssh/sshd_config.d/60-mehmetali.conf; echo "NOT: HATA sshd ayarı geçersiz, geri alındı"; exit 1; }; systemctl reload ssh 2>/dev/null || systemctl reload sshd

# Çalışma kopyası (ilk kurulumda bir kez; varsa dokunulmaz)
DIS='--exclude=.env --exclude=.env.* --exclude=secrets/ --exclude='*.sql' --exclude='*.dump' --exclude=backups/ --exclude=backup.log --exclude=*.tar.gz --exclude=*.yedek* --exclude=*.yedek2 --exclude=.git/ --exclude=node_modules/ --exclude=__pycache__/ --exclude=.vscode/'
if [ ! -d $H/gesfin ]; then
  rsync -a $DIS /opt/gesfin/ $H/gesfin/
  chown -R $U:$U $H/gesfin
fi

# Yayına alma komutu
cat > /usr/local/bin/gesfin-yenile <<'Y'
#!/bin/bash
# Mehmet Ali'nin ~/gesfin kopyasını canlıya alır. Güvenli: ön yedek, sürüm arşivi, sağlık kontrolü, otomatik geri dönüş.
[ "$(id -u)" = 0 ] || exec sudo -n /usr/local/bin/gesfin-yenile
exec 9>/run/gesfin-yenile.lock; flock -n 9 || { echo "Başka bir yenileme sürüyor, biraz sonra tekrar deneyin."; exit 1; }
L=/var/log/gesfin-yenile.log; T=$(date +%Y%m%d-%H%M%S); K=/home/mehmetali/gesfin; A=/var/lib/gesfin-surumler
log(){ echo "$(date '+%F %T') $*" | tee -a $L; }
DIS='--exclude=.env --exclude=.env.* --exclude=secrets/ --exclude='*.sql' --exclude='*.dump' --exclude=backups/ --exclude=backup.log --exclude=*.tar.gz --exclude=*.yedek* --exclude=.git/ --exclude=node_modules/ --exclude=__pycache__/ --exclude=.vscode/ --exclude=docker-compose.yml --exclude=docker-compose.*'
saglik(){ for i in $(seq 1 24); do b=$(docker exec gesfin-backend python3 -c "import urllib.request;print(urllib.request.urlopen('http://127.0.0.1:8000/health',timeout=5).status)" 2>/dev/null); w=$(docker exec gesfin-mobile-web sh -c 'wget -q -O /dev/null http://127.0.0.1/ && echo 200' 2>/dev/null); [ "$b" = 200 ] && [ "$w" = 200 ] && return 0; sleep 5; done; return 1; }
log "BAŞLADI ($SUDO_USER)"
[ -d $K ] || { log "HATA: $K yok"; exit 1; }
echo "1/4 Yedek alınıyor..."
/opt/aesun/yedek/yedekle.sh on_degisiklik >/dev/null 2>&1 || { log "HATA: yedek alınamadı, iptal"; exit 1; }
mkdir -p $A; chmod 700 $A
tar czf $A/$T.tgz -C /opt/gesfin --exclude=backups --exclude='*.tar.gz' . && ls -1t $A/*.tgz | tail -n +16 | xargs -r rm -f
echo "2/4 Değişiklikler aktarılıyor..."
rsync -a --delete $DIS --chown=root:root $K/ /opt/gesfin/
log "Değişen dosyalar: $(rsync -a --dry-run --itemize-changes $DIS $K/ /opt/gesfin/ | wc -l) (aktarım sonrası fark)"
echo "3/4 Derleniyor ve yeniden başlatılıyor (birkaç dakika sürebilir)..."
cd /opt/gesfin
if docker compose up -d --build >>$L 2>&1 && echo "4/4 Kontrol ediliyor..." && saglik; then
  log "TAMAM: gesfin yeni sürümle çalışıyor (arşiv $T)"; echo "TAMAM. gesfin yeni sürümle çalışıyor."; exit 0
fi
log "SORUN: sağlık kontrolü geçmedi, eski sürüme dönülüyor"
echo "Sorun çıktı, eski sürüme dönülüyor..."
find /opt/gesfin -mindepth 1 -maxdepth 1 ! -name backups ! -name '*.tar.gz' ! -name '.env*' ! -name secrets ! -name 'docker-compose*' -exec rm -rf {} +
tar xzf $A/$T.tgz -C /opt/gesfin
docker compose up -d --build >>$L 2>&1
if saglik; then log "GERİ DÖNÜLDÜ: eski sürüm çalışıyor"; echo "Eski sürüm geri yüklendi, sistem çalışıyor. Değişikliklerin ~/gesfin içinde duruyor, hata için: gesfin-gunluk"; else log "ACİL: geri dönüşten sonra da sağlık yok"; echo "ACİL: Ömer Bey'e haber verin."; fi
exit 1
Y
# Günlük okuma komutu
cat > /usr/local/bin/gesfin-gunluk <<'G'
#!/bin/bash
[ "$(id -u)" = 0 ] || exec sudo -n /usr/local/bin/gesfin-gunluk
echo "== son yenilemeler =="; tail -n 15 /var/log/gesfin-yenile.log 2>/dev/null
echo "== gesfin-backend son 80 satır =="; docker logs --tail 80 gesfin-backend 2>&1 | grep -v -i -E 'password|secret|token|key='
G
# Canlıdaki kodu kopyaya yeniden çekme (kopyadaki değişiklikler önce ~/gesfin-onceki-<tarih> olarak saklanır)
cat > /usr/local/bin/gesfin-kopya-tazele <<'Z'
#!/bin/bash
[ "$(id -u)" = 0 ] || exec sudo -n /usr/local/bin/gesfin-kopya-tazele
K=/home/mehmetali/gesfin; T=$(date +%Y%m%d-%H%M%S)
[ -d $K ] && mv $K /home/mehmetali/gesfin-onceki-$T
rsync -a --exclude=.env --exclude='.env.*' --exclude=secrets/ --exclude='*.sql' --exclude='*.dump' --exclude=backups/ --exclude=backup.log --exclude='*.tar.gz' --exclude='*.yedek*' /opt/gesfin/ $K/
chown -R mehmetali:mehmetali $K /home/mehmetali/gesfin-onceki-$T 2>/dev/null
echo "Kopya canlıdan yenilendi. Eski kopyan: ~/gesfin-onceki-$T"
Z
chmod 755 /usr/local/bin/gesfin-yenile /usr/local/bin/gesfin-gunluk /usr/local/bin/gesfin-kopya-tazele
touch /var/log/gesfin-yenile.log; chmod 640 /var/log/gesfin-yenile.log
cat > /etc/sudoers.d/60-mehmetali <<'D'
mehmetali ALL=(root) NOPASSWD: /usr/local/bin/gesfin-yenile "", /usr/local/bin/gesfin-gunluk "", /usr/local/bin/gesfin-kopya-tazele ""
D
chmod 440 /etc/sudoers.d/60-mehmetali; visudo -cf /etc/sudoers.d/60-mehmetali >/dev/null

# Karşılama notu
cat > $H/BENI-OKU.txt <<'B'
gesfin çalışma alanı
- ~/gesfin           : gesfin kodu (kopya). Burada düzenleyin; canlıyı etkilemez.
- ~/evrak/gelen      : size gönderilen evraklar
- ~/evrak/giden      : tamamlayıp teslim ettiğiniz evraklar
Komutlar:
- gesfin-yenile        : ~/gesfin'deki değişiklikleri canlıya alır (önce yedek; sorun çıkarsa eski sürüme kendisi döner)
- gesfin-gunluk        : son yenilemeler ve uygulama günlüğü
- gesfin-kopya-tazele  : kopyayı canlıdaki koddan yeniden çeker (mevcut kopyanız saklanır)
Not: .env, secrets ve docker-compose.yml bu kopyada yok/aktarılmaz; değişiklik gerekirse Ömer Bey'e iletin.
B
chown $U:$U $H/BENI-OKU.txt

# Doğrulama
echo "NOT: hesap: $(id $U)"
echo "NOT: kopya: $(du -sh $H/gesfin | cut -f1), .env kopyada: $([ -e $H/gesfin/.env ] && echo VAR-HATA || echo yok)"
echo "NOT: /opt erişimi: $(sudo -u $U ls /opt >/dev/null 2>&1 && echo AÇIK-HATA || echo kapalı)"
echo "NOT: /opt/gesfin/.env okuma: $(sudo -u $U cat /opt/gesfin/.env >/dev/null 2>&1 && echo AÇIK-HATA || echo kapalı)"
echo "NOT: docker: $(sudo -u $U docker ps >/dev/null 2>&1 && echo AÇIK-HATA || echo kapalı)"
echo "NOT: sudo izinleri: $(sudo -l -U $U | grep -o '/usr/local/bin/gesfin-[a-z-]*' | tr '\n' ' ')"
echo "NOT: sshd Match: $(sshd -T -C user=$U,host=x,addr=1.2.3.4 | grep -E '^(allowtcpforwarding|passwordauthentication) ' | tr '\n' ';')"
echo "NOT: canlı sağlık (iç): $(sed -n '/^saglik()/p' /usr/local/bin/gesfin-yenile >/tmp/s.sh; . /tmp/s.sh; saglik && echo 200-tamam || echo HATA; rm -f /tmp/s.sh)"
