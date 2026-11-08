# AEMonitoring saha sistemi — geri yükleme kılavuzu

Sahada çalışan parçalar ve bozulursa ne yapılır.

| Parça | Ne iş yapar | Yedek | Bozulursa |
|---|---|---|---|
| Antminer cihazlar (29) | Madencilik | Her cihazın havuz/worker ayarı: Pi `~/.aesun/yedek/ayar/<no>.json` (5 dk'da bir güncellenir) + günlük yedek | **Bekçi kendisi onarır** (yeniden başlatma → fabrika ayarı + ayar yükleme). Elle: `~/SAHA/antminer/venv/bin/python ~/aesun/pi/cihaz_kurtar.py <ip> <no> --sifirla` |
| Raspberry Pi (saha-pi) | Toplayıcı, cihaz yönetimi, OSOS, FusionSolar, bekçi | Günlük `~/yedek/aesun_yedek_<tarih>.tar.gz` (+ gizli depoda `aesun-yedek/son.tar.gz`) | Aşağıdaki "Pi'yi sıfırdan kurma" |
| Modem (Mercusys MW301R) | Ağ, DHCP, sabit IP'ler | Modem arayüzünden yedek dosyası (elle, bir kez) | Yedeği geri yükle ya da rezervasyon listesini (etiket PDF'i 4. sayfa) yeniden gir |
| Kod (aesun, epias-ptf) | Panel, Pi betikleri, veriler | GitHub (her değişiklik) | `git clone` |

## Yeni karta taşıma (eski kart sağlamken — önerilen, şifre girmeden)

1. Raspberry Pi Imager → Raspberry Pi OS Lite (64-bit) → ayarlar: ana bilgisayar adı `saha-pi`, kullanıcı `pi` + yeni şifre
   (şifre yöneticisine kaydet), sahadaki Wi-Fi adı/şifresi, SSH açık, saat dilimi Europe/Istanbul. Yeni karta yaz.
2. Pi'yi kapat → yeni kartı Pi'ye, eski kartı USB kart okuyucuyla Pi'nin USB'sine tak → aç.
3. Aynı Wi-Fi'deki telefon/bilgisayardan `ssh pi@saha-pi.local` (ya da ekran-klavye) ile bağlan ve tek komut:
   ```
   curl -fsSL https://raw.githubusercontent.com/ekinciomer-ai/aesun/main/pi/yeni_kart.sh | bash
   ```
   Betik eski kartı salt okunur bağlar; ev klasörünü (şifre dosyaları dahil), crontab'ı, altminer servisini ve
   Tailscale kimliğini taşır, servisleri başlatır. Eski kart değişmez → sorun olursa eski kartı geri tak.

## Pi'yi sıfırdan kurma (SD kart bozulursa / yeni Pi)

1. Raspberry Pi Imager ile **Raspberry Pi OS Lite (64-bit)** yaz. Kullanıcı adı `pi`, Wi-Fi/kablo ayarı, SSH açık.
2. Pi açılınca (ekran-klavye ya da aynı ağdan SSH):
   ```
   sudo apt-get update && sudo apt-get install -y git python3-requests python3-venv
   curl -fsSL https://tailscale.com/install.sh | sh && sudo tailscale up --ssh
   ```
   Tailscale panelinden eski `saha-pi` makinesini sil, yenisinin adını `saha-pi` yap.
3. Son yedeği Pi'ye kopyala (gizli depodan `aesun-yedek/son.tar.gz` ya da eski SD karttaki `~/yedek/`), sonra:
   ```
   mkdir -p ~/geri && tar xzf son.tar.gz -C ~/geri
   cp -r ~/geri/saha ~/SAHA && mkdir -p ~/.aesun && cp -r ~/geri/aesun/. ~/.aesun/
   python3 -m venv ~/SAHA/antminer/venv && ~/SAHA/antminer/venv/bin/pip install -r ~/geri/sistem/pip_freeze.txt
   ```
4. Şifreleri gir (yedekte YOKTUR): `~/geri/MANIFEST.json` → "maskelenen" listesindeki dosyalarda `***` olan yerler,
   ve `~/.aesun/osos.env` (OSOS kullanıcı/şifre, GITHUB_TOKEN, isteğe bağlı YEDEK_TOKEN/YEDEK_REPO). Bunları
   şifre yöneticinden al; sohbete ya da depoya yazma.
5. Toplayıcı servisi: `~/geri/sistem/altminer.service.txt` içeriğini `/etc/systemd/system/altminer.service` olarak kaydet
   (ilk satırdaki `# /etc/...` yorumu hariç), sonra `sudo systemctl daemon-reload && sudo systemctl enable --now altminer`.
6. aesun ve zamanlanmış işler: `curl -fsSL https://raw.githubusercontent.com/ekinciomer-ai/aesun/main/pi/kur.sh | bash`
7. Kontrol: panelde Cihazlar sekmesi 5 dk içinde güncellenmeli; `python3 ~/aesun/pi/ag_tara.py` cihazları listelemeli.

## Bir kez yapılacaklar (kalıcılık için)

- **SD kartın tam imajı:** Pi'yi kapatıp kartı bilgisayara tak, Win32 Disk Imager / Raspberry Pi Imager ile `.img` al,
  şifre yöneticisinin yanında sakla. Pi bozulursa bu imaj yeni karta yazılınca 10 dakikada aynı sistem geri gelir.
- **Modem yedeği:** mwlogin.net → Gelişmiş → Sistem Araçları → Yedekle ve Geri Yükle → Yedekle.
- **Sabit IP rezervasyonları:** etiket PDF'inin 4. sayfası (MAC → 192.168.0.1xx).
- **Gizli depoya yedek:** GitHub'da yalnız `ekinciomer-ai/SYS` deposuna "Contents: Read and write" yetkili bir
  fine-grained token oluştur; Pi'de `~/.aesun/osos.env` dosyasına `YEDEK_REPO=ekinciomer-ai/SYS` ve `YEDEK_TOKEN=...`
  satırlarını kendin ekle (nano ile).
