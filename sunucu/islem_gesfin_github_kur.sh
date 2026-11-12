#!/bin/bash
# gesfin <-> GitHub (ekinciomer-ai/gesfin, gizli) bağlantısı.
# - Depo boşsa: /opt/gesfin kodu (.env, secrets, yedekler, compose hariç) + evrak/ + CLAUDE.md ile ilk yükleme.
# - Her dakika: main'de kod değiştiyse ~/gesfin (mehmetali) kopyasına alınır ve gesfin-yenile çalışır (yedek + sağlık + geri dönüş).
#   Sonuç depoya YAYIN_DURUMU.md olarak yazılır. Yalnız evrak/ ya da belge değişikliği yayın tetiklemez.
# GitHub'a sunucu anahtarı konmaz; sunucu depoyu kendi dağıtım anahtarıyla okur/yazar.
set -e
K=/opt/aesun/sir/gesfin_github; G=/opt/gesfin-git; S=/var/lib/gesfin-github
[ -f $K ] || { echo "NOT: HATA dağıtım anahtarı yok (gesfin_github_anahtar)"; exit 1; }
mkdir -p $S; chmod 700 $S /opt/gesfin-git 2>/dev/null || true
grep -q '^github.com ' /root/.ssh/known_hosts 2>/dev/null || ssh-keyscan -t ed25519 github.com >> /root/.ssh/known_hosts 2>/dev/null
export GIT_SSH_COMMAND="ssh -i $K -o IdentitiesOnly=yes -o BatchMode=yes"
URL=git@github.com:ekinciomer-ai/gesfin.git
git ls-remote $URL >/dev/null 2>&1 || { echo "NOT: HATA GitHub depoya erişemedi (deploy key eklendi mi, yazma izni açık mı?)"; exit 1; }
if [ ! -d $G/.git ]; then rm -rf $G; git clone -q $URL $G 2>/dev/null || { mkdir -p $G; git -C $G init -q; git -C $G remote add origin $URL; }; fi
cd $G; git config user.name "gesfin-sunucu"; git config user.email "sunucu@aksarayenerji.net"
if [ -z "$(git ls-remote --heads origin main)" ]; then
  git checkout -q -B main
  rsync -a --exclude=.env --exclude='.env.*' --exclude=secrets/ --exclude=backups/ --exclude=backup.log --exclude='*.tar.gz' --exclude='*.yedek*' --exclude='docker-compose*' --exclude=__pycache__/ --exclude=node_modules/ /opt/gesfin/ $G/
  mkdir -p evrak/gelen evrak/giden; touch evrak/gelen/.gitkeep evrak/giden/.gitkeep
  printf '%s\n' '.env' '.env.*' 'secrets/' 'backups/' '*.tar.gz' '__pycache__/' 'node_modules/' 'docker-compose*' > .gitignore
  cat > CLAUDE.md <<'M'
# gesfin — çalışma kuralları
Bu depo gesfin (fatura) uygulamasının kodudur. `main` dalına gönderilen (push) her kod değişikliği
yaklaşık 1 dakika içinde sunucuya otomatik alınır ve canlıya çıkar:
önce yedek alınır, derlenir, kontrol edilir; sorun olursa eski sürüme kendiliğinden dönülür.

- Değişiklikten sonra 3–5 dk bekleyip `YAYIN_DURUMU.md` dosyasına bakın (git pull). "TAMAM" ya da "GERİ DÖNÜLDÜ" yazar.
- `evrak/gelen`: gelen evraklar. `evrak/giden`: tamamlanan evraklar. Evrak değişikliği yayın tetiklemez.
- `.env`, şifreler ve `docker-compose.yml` bu depoda yoktur ve buradan değiştirilemez; gerekiyorsa Ömer Bey'e iletin.
- Depoya asla şifre, token, anahtar yazmayın.
- Büyük ya da riskli değişiklikleri küçük parçalara bölün; her parçayı ayrı gönderin ki sorun çıkarsa kolay geri alınsın.
- Yanıtlar Türkçe.
M
  echo "Henüz yayın yapılmadı." > YAYIN_DURUMU.md
  git add -A; git commit -qm "gesfin: sunucudaki koddan ilk yükleme"; git push -q -u origin main
  echo "NOT: ilk yükleme yapıldı: $(git rev-parse --short HEAD), $(git ls-files | wc -l) dosya"
fi
git fetch -q origin main; git checkout -q -B main origin/main
[ -f $S/son ] || git rev-parse HEAD > $S/son
echo "NOT: .env depoda: $(git ls-files | grep -c -E '(^|/)\.env' || true)  secrets depoda: $(git ls-files | grep -c '^secrets/' || true)"

cat > /usr/local/bin/gesfin-github-cek <<'C'
#!/bin/bash
# GitHub main → mehmetali ~/gesfin → gesfin-yenile. Dakikalık zamanlayıcı çalıştırır.
exec 9>/run/gesfin-github.lock; flock -n 9 || exit 0
export GIT_SSH_COMMAND="ssh -i /opt/aesun/sir/gesfin_github -o IdentitiesOnly=yes -o BatchMode=yes -o ConnectTimeout=20"
G=/opt/gesfin-git; S=/var/lib/gesfin-github; cd $G || exit 1
timeout 60 git fetch -q origin main || exit 0
YENI=$(git rev-parse origin/main); SON=$(cat $S/son 2>/dev/null)
[ "$YENI" = "$SON" ] && exit 0
DEG=$(git diff --name-only $SON $YENI 2>/dev/null | grep -v -E '^(evrak/|YAYIN_DURUMU\.md$|CLAUDE\.md$|README\.md$|\.gitignore$|\.github/)' | wc -l)
git checkout -q -B main $YENI
echo $YENI > $S/son
[ "$DEG" -eq 0 ] && [ -n "$SON" ] && exit 0
rsync -a --delete --exclude=.git/ --exclude=evrak/ --exclude=YAYIN_DURUMU.md --exclude=CLAUDE.md --exclude=README.md --exclude=.gitignore --exclude=.github/ --exclude=.env --exclude='.env.*' --exclude=secrets/ --exclude='docker-compose*' $G/ /home/mehmetali/gesfin/
chown -R mehmetali:mehmetali /home/mehmetali/gesfin
CIKTI=$(/usr/local/bin/gesfin-yenile 2>&1); KOD=$?
case "$CIKTI" in *TAMAM*) D="TAMAM — yeni sürüm canlıda";; *"Eski sürüm geri"*) D="GERİ DÖNÜLDÜ — yeni sürüm çalışmadı, eski sürüm canlıda. Ayrıntı aşağıda.";; *"Başka bir yenileme"*) echo $SON > $S/son; exit 0;; *) D="HATA — Ömer Bey'e haber verin";; esac
HATA=""; [ $KOD -ne 0 ] && HATA=$(docker logs --tail 40 gesfin-backend 2>&1 | grep -v -i -E 'password|secret|token|key=' | tail -40)
git fetch -q origin main && git checkout -q -B main origin/main
{ echo "# Yayın durumu"; echo; echo "- Zaman: $(TZ=Europe/Istanbul date '+%d.%m.%Y %H:%M')"; echo "- Kayıt: $(git rev-parse --short $YENI) — $(git log -1 --format=%s $YENI)"; echo "- Sonuç: **$D**"; echo; echo '```'; echo "$CIKTI" | tail -15; [ -n "$HATA" ] && { echo "--- uygulama günlüğü (son satırlar) ---"; echo "$HATA"; }; echo '```'; } > YAYIN_DURUMU.md
git add YAYIN_DURUMU.md && git commit -qm "Yayın durumu: $(echo $D | cut -d' ' -f1)" && { git push -q origin main || { git pull -q --rebase origin main && git push -q origin main; }; }
git rev-parse HEAD > $S/son
C
chmod 700 /usr/local/bin/gesfin-github-cek
cat > /etc/systemd/system/gesfin-github.service <<'U'
[Unit]
Description=gesfin GitHub -> canlı (yedekli)
[Service]
Type=oneshot
ExecStart=/usr/local/bin/gesfin-github-cek
TimeoutStartSec=1200
Nice=5
U
cat > /etc/systemd/system/gesfin-github.timer <<'U'
[Unit]
Description=gesfin GitHub denetimi (dakikalık)
[Timer]
OnBootSec=2min
OnUnitActiveSec=60s
[Install]
WantedBy=timers.target
U
systemctl daemon-reload; systemctl enable --now gesfin-github.timer >/dev/null 2>&1
echo "NOT: zamanlayıcı: $(systemctl is-active gesfin-github.timer)"
# mehmetali kopyası GitHub ile aynı başlasın
rsync -a --delete --exclude=.git/ --exclude=evrak/ --exclude=YAYIN_DURUMU.md --exclude=CLAUDE.md --exclude=README.md --exclude=.gitignore --exclude=.github/ $G/ /home/mehmetali/gesfin/ && chown -R mehmetali:mehmetali /home/mehmetali/gesfin
echo "NOT: hazır. Depo: $(git -C $G rev-parse --short HEAD)"
