# AEMonitoring — n8n mimarisi (v2)

n8n Cloud `xbay.app.n8n.cloud`, proje "ömer" (kişisel), klasör **aesun**. Saat dilimi Europe/Istanbul. Hiçbir iş akışı yayında değil.

## İş akışları

| İş akışı | ID | Tetik | Zaman aşımı |
|---|---|---|---|
| AEMonitoring · Ana döngü | `0uPcmIjFGiZjGsLn` | Gündüz `*/15 5-19 * * *`, gece `0,30 0-4,20-23 * * *` | 180 sn |
| AEMonitoring · alt · Sungrow | `NxHobbuF95vE0K9c` | Ana döngüden | 35 sn |
| AEMonitoring · alt · FusionSolar | `DTjR9O7JpCLL94wP` | Ana döngüden | 30 sn |
| AEMonitoring · alt · Inavitas | `XuNH8m81DWnrje5a` | Ana döngüden (:00 ve :30) | 35 sn |
| AEMonitoring · alt · OSOS | `1pZY4rggv3OKTwKk` | Ana döngüden (:00) | 15 sn |
| AEMonitoring · Uyarı motoru (alt) | `dXJtI1t230MPBIfz` | Ana döngüden | 15 sn |
| AEMonitoring · Pi nabız + canlı veri | `4CaY5XeOFjK4B3Kr` | POST `/webhook/aesun-nabiz` (header auth) | 30 sn |
| AEMonitoring · Hata yakalayıcı | `QQkA9MHLmFtH6FYx` | Error Trigger | 60 sn |
| AEMonitoring · Arşiv + temizlik | `xOY3YabJkrISGkxv` | `5 0-5 * * *` (gece saatlik, kaçan günleri doldurur) | 180 sn |
| AEMonitoring · EPİAŞ PTF/SMF | `HwcYHM8phNl8SN4Z` | `5,35 13-17 * * *` ve `15 6 * * *` | 120 sn |

Alt iş akışlarını yalnız Ana döngü çağırabilir (callerPolicy).
Eski 5 iş akışı (`mGUBazyZw83HLiQG`, `wMuIzwWRebIRngsg`, `i783dL0YIX2xE0EL`, `v8WZV9rcADpvp9zT`, `3gaBo1YnRgSQ2Djp`) değiştirilmedi.

## Tablolar

| Tablo | Kolonlar | Yazan |
|---|---|---|
| aesun_son | anahtar, kaynak, plant_id, ad, ts, guc_kw, gunluk_kwh, alarm, hata, durum (ok/bayat/hata/kaldirildi), hata_mesaji, ardisik_hata, son_ok_ts, ek (JSON), inverterler (JSON) | Ana döngü, upsert kaynak+plant_id |
| aesun_olcum | ts, kaynak, plant_id, ad, guc_kw, gunluk_kwh, alarm, hata, ek (JSON, düz alanlar) | Ana döngü (yalnız durum=ok) |
| aesun_oturum | kaynak, token, cerez, son_giris, bekle_until, hata_sayisi, son_hata | Ana döngü, upsert kaynak |
| aesun_uyari_durum | anahtar, seviye, baslik, ilk_ts, son_bildirim_ts, aktif | Uyarı motoru, upsert anahtar |
| aesun_nabiz | cihaz, son_ts, servisler (JSON), not_ | Pi webhook, upsert cihaz |
| aesun_hata | ts, workflow, dugum, mesaj, execution_url | Hata yakalayıcı |
| aesun_arsiv | gun, yazildi_ts, satir | Arşiv, upsert gun |
| aesun_ptf | tarih, saat, ptf, ptf_usd, ptf_eur, smf, guncellendi | EPİAŞ, upsert tarih+saat |

## Hata ve oturum kuralları
- Toplayıcı hata mesajı önekleri: `GIRIS:` → `bekle_until = şimdi + 1 saat`, giriş denenmez; `OTURUM:` → token/çerez silinir, sonraki turda yeniden giriş; `LIMIT:` → normal hata.
- HTTP düğümleri: zaman aşımı 10 sn, `retryOnFail`, 3 deneme, 5 sn ara (n8n üst sınırı 5 sn). Giriş cevapları 200 döndüğü için yanlış şifre tekrar denenmez; Inavitas giriş POST'unda tekrar deneme hiç yok.
- Token yeniden kullanımı: Sungrow 12 saat, FusionSolar son başarılı kullanımdan 25 dk (her başarılı turda `son_giris` yenilenir, oturum düşerse `OTURUM:` ile yeniden giriş), Inavitas çerezi 12 saat (RememberMe=true).
- Kaynak hatasında son bilinen değer korunur, `durum=bayat`, `ardisik_hata+1`; bayat satırlar üretim kurallarına girmez.
- OSOS: zaman damgası öncekiyle aynıysa `aesun_olcum`'a yeni satır eklenmez.
- Sungrow "şebekede değil" kuralı yalnız üretim saatinde çalışır.

## Arşiv
- Her çalıştırma arşivlenmemiş en eski günü (yoksa dünü) `n8n/arsiv/YYYY-MM-DD.json`'a yazar; gece 6 çalıştırma ile en fazla 6 kaçan gün/gece geri dolar.
- Temizlik: 7 günden eski ve `aesun_arsiv`'de kaydı olan günler silinir; arşivlenmemiş bir güne gelince durur.

## Kimlik bilgileri (n8n > Credentials)

| Ad | Tür | İçerik |
|---|---|---|
| Sungrow iSolarCloud | Templated Custom Auth | `{"headers":{"x-access-key":"{{secret}}","sys_code":"901"},"body":{"appkey":"{{appkey}}","user_account":"{{kullanici}}","user_password":"{{sifre}}"}}` |
| FusionSolar Northbound | Templated Custom Auth | `{"body":{"userName":"{{kullanici}}","systemCode":"{{sifre}}"}}` |
| Inavitas | Templated Custom Auth | `{"body":{"UserName":"{{kullanici}}","Password":"{{sifre}}"}}` |
| GitHub epias-ptf | GitHub API | fine-grained token, yalnız epias-ptf, Contents: Read and write |
| EPİAŞ Şeffaflık | Templated Custom Auth | `{"body":{"username":"{{kullanici}}","password":"{{sifre}}"}}` |
| Twilio | Twilio API | SID + token (düğümler kapalı) |
| aesun Pi anahtarı | Header Auth | ad `X-Aesun-Anahtar`, değer: rastgele uzun anahtar (Pi `env.txt` → `AESUN_PI_ANAHTAR`) |

## Pi
```bash
cd ~/aesun && git pull
echo 'AESUN_PI_ANAHTAR=<n8n credential ile aynı değer>' >> env.txt
sudo cp pi/aesun-nabiz.service pi/aesun-nabiz.timer /etc/systemd/system/
sudo systemctl daemon-reload && sudo systemctl enable --now aesun-nabiz.timer
```
Yanıt `onbellek/son.json`'a, n8n'e ulaşılamazsa GitHub yedeği `onbellek/son_yedek.json`'a yazılır; `onbellek/kaynak.txt` hangisinin kullanıldığını söyler.

## EPİAŞ
- TGT girişi (giris.epias.com.tr/cas/v1/tickets) → GÖP PTF (`markets/dam/data/mcp`) ve DGP SMF (`markets/bpm/data/system-marginal-price`), dün/bugün/yarın.
- `aesun_son` içinde `kaynak=epias, plant_id=ptf` satırı: ek alanında bugün/yarın PTF dizileri ve özetler; Pi yanıtıyla panele gider.
- 06:15 tetiği son 7 günü yeniden çeker (kaçanları doldurur); diğer tetikler dünden başlar.
- `aylik_ptf.json` yalnız yeni/değişen tam gün varsa güncellenir (eski panel biçimi korunur).
- Uyarılar: 15:30'dan sonra yarının PTF'si yoksa; EPİAŞ verisi 26 saattir alınamıyorsa.
- GitHub Actions'taki `main.py` (madencilik kârlılık sinyali, WhatsApp) şimdilik çalışmaya devam ediyor; aynı dosyaya aynı değerleri yazar.

## Web paneli
- Sayfa: `docs/index.html` (GitHub Pages ile yayınlanır; Pages'i repo sahibi açar).
- Ana döngü her turda `epias-ptf/n8n/aesun_son.json` dosyasına `{guncellendi, ozet, son, uyarilar, pi}` yazar; sayfa bu dosyayı okur, 2 dakikada bir yeniler. Açılışlar n8n kotasından düşmez.

## OSOS (Pi)
MEDAŞ n8n bulut IP'lerini kabul etmediği için OSOS Pi'den çekilir: `toplayicilar/osos_toplayici.py`, her saat xx:10 (`pi/aesun-osos.timer`).
6 abone (T1, T2, A3, YD, Anka, AE) dün+bugün 15 dk profilini saatliğe toplar; tamamlanmış saatleri `epias-ptf/2026_osos_endeks.json`'a birleştirir, n8n "OSOS veri alıcı"ya da gönderir.
Ayar: `~/.aesun/osos.env` (chmod 600): `OSOS_KULLANICI`, `OSOS_SIFRE`, `GITHUB_TOKEN` (epias-ptf, Contents: Read and write), `AESUN_ANAHTAR`.
```bash
cd ~/aesun && git pull
mkdir -p ~/.aesun && nano ~/.aesun/osos.env && chmod 600 ~/.aesun/osos.env
python3 toplayicilar/osos_toplayici.py --gun 3   # ilk elle deneme, son 3 gün
sudo cp pi/aesun-osos.service pi/aesun-osos.timer /etc/systemd/system/
sudo systemctl daemon-reload && sudo systemctl enable --now aesun-osos.timer
```
