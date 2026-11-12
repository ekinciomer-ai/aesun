#!/bin/bash
# Veritabanı dökümleri (*.sql, *.dump) GitHub'a ve mehmetali kopyasına taşınmasın; canlıdaki dökümler yayında silinmesin.
# Depodaki döküm normal bir kayıtla kaldırılır (geçmiş temizliği ayrı ve onaylı yapılır).
set -e
systemctl stop gesfin-github.timer
for f in /usr/local/bin/gesfin-yenile /usr/local/bin/gesfin-kopya-tazele /usr/local/bin/gesfin-github-cek; do
  grep -q "exclude='\*.sql'" $f || sed -i "s/--exclude=secrets\//--exclude=secrets\/ --exclude='*.sql' --exclude='*.dump'/g" $f
done
echo "NOT: sql koruması: $(grep -c "exclude='\*.sql'" /usr/local/bin/gesfin-yenile /usr/local/bin/gesfin-github-cek /usr/local/bin/gesfin-kopya-tazele | tr '\n' ' ')"
for f in $(find /home/mehmetali -maxdepth 4 -type f \( -name '*.sql' -o -name '*.dump' \) -path '*/gesfin*'); do mkdir -p /root/mehmetali_kaldirilan; mv "$f" /root/mehmetali_kaldirilan/; echo "NOT: kopyadan kaldırıldı: $(basename $f)"; done
export GIT_SSH_COMMAND="ssh -i /opt/aesun/sir/gesfin_github -o IdentitiesOnly=yes -o BatchMode=yes"
cd /opt/gesfin-git; git fetch -q origin main; git checkout -q -B main origin/main
grep -q '^\*.sql$' .gitignore || printf '%s\n' '*.sql' '*.dump' >> .gitignore
S=$(git ls-files | grep -E '\.(sql|dump)$' || true)
[ -n "$S" ] && git rm -q --cached $S && rm -f $S
git add .gitignore; git commit -qm "Veritabanı dökümü depodan kaldırıldı; *.sql/*.dump artık depoya girmez" && git push -q origin main
echo "NOT: depoda sql: $(git ls-files | grep -c -E '\.(sql|dump)$' || true), kayıt: $(git rev-parse --short HEAD)"
echo "NOT: canlıdaki döküm yerinde: $(ls /opt/gesfin/*.sql 2>/dev/null | wc -l) dosya"
systemctl start gesfin-github.timer
echo "NOT: zamanlayıcı: $(systemctl is-active gesfin-github.timer)"
