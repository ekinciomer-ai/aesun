#!/bin/bash
# Claude Code'u yalnız mehmetali hesabının içine kurar (~/.local). Diğer sistemlere dokunmaz.
U=mehmetali; H=/home/$U
id $U >/dev/null 2>&1 || { echo "NOT: HATA $U yok"; exit 1; }
sudo -u $U -H bash -lc 'curl -fsSL https://claude.ai/install.sh | bash' > /tmp/cc_kur.log 2>&1
echo "NOT: kurulum çıktısı: $(tail -n 4 /tmp/cc_kur.log | tr '\n' ' ' | cut -c1-300)"; rm -f /tmp/cc_kur.log
grep -q '.local/bin' $H/.bashrc || { echo 'export PATH="$HOME/.local/bin:$PATH"' >> $H/.bashrc; chown $U:$U $H/.bashrc; }
grep -q '.local/bin' $H/.profile 2>/dev/null || { echo 'export PATH="$HOME/.local/bin:$PATH"' >> $H/.profile; chown $U:$U $H/.profile; }
# Claude'un bu hesapta uyacağı kurallar
cat > $H/CLAUDE.md <<'M'
# Çalışma kuralları (gesfin)
- Çalışma alanı: ~/gesfin (gesfin kodunun kopyası). Evraklar: ~/evrak/gelen (gelen), ~/evrak/giden (tamamlanan).
- Canlıya alma yalnız `gesfin-yenile` komutuyla yapılır (önce yedek alır, sorun olursa eski sürüme döner). Başka yolla canlıya dokunulmaz.
- Hata incelemek için `gesfin-gunluk`. Kopyayı canlıdan tazelemek için `gesfin-kopya-tazele` (eski kopya saklanır).
- .env, secrets ve docker-compose.yml bu hesapta yok ve aktarılmaz; bunlarda değişiklik gerekiyorsa kullanıcıya söylenir.
- Silme gibi geri alınamaz işlemlerden önce kullanıcıdan onay alınır. Yanıtlar Türkçe.
M
chown $U:$U $H/CLAUDE.md
echo "NOT: sürüm: $(sudo -u $U -H bash -lc 'claude --version' 2>&1 | tail -1)"
echo "NOT: konum: $(sudo -u $U -H bash -lc 'command -v claude')"
echo "NOT: gesfin sağlık: $(docker exec gesfin-backend python3 -c "import urllib.request;print(urllib.request.urlopen('http://127.0.0.1:8000/health',timeout=5).status)" 2>&1)"
