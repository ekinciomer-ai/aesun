# aesun — n8n mimarisi (v2)

n8n Cloud `xbay.app.n8n.cloud`, proje "ömer" (kişisel), klasör **aesun**. Saat dilimi Europe/Istanbul. Hiçbir iş akışı yayında değil.

## İş akışları

| İş akışı | ID | Tetik | Zaman aşımı |
|---|---|---|---|
| aesun · Ana döngü | `0uPcmIjFGiZjGsLn` | Gündüz `*/15 5-19 * * *`, gece `0,30 0-4,20-23 * * *` | 180 sn |
| aesun · alt · Sungrow | `NxHobbuF95vE0K9c` | Ana döngüden | 45 sn |
| aesun · alt · FusionSolar | `DTjR9O7JpCLL94wP` | Ana döngüden | 40 sn |
| aesun · alt · Inavitas | `XuNH8m81DWnrje5a` | Ana döngüden (:00 ve :30) | 45 sn |
| aesun · alt · OSOS | `1pZY4rggv3OKTwKk` | Ana döngüden (:00) | 30 sn |
| aesun · Uyarı motoru (alt) | `dXJtI1t230MPBIfz` | Ana döngüden | 15 sn |
| aesun · Pi nabız + canlı veri | `4CaY5XeOFjK4B3Kr` | POST `/webhook/aesun-nabiz` (header auth) | 30 sn |
| aesun · Hata yakalayıcı | `QQkA9MHLmFtH6FYx` | Error Trigger | 60 sn |
| aesun · Arşiv + temizlik | `xOY3YabJkrISGkxv` | `5 0 * * *` | 180 sn |
| aesun · EPİAŞ PTF/SMF | `HwcYHM8phNl8SN4Z` | `5,35 13-17 * * *` ve `15 6 * * *` | 120 sn |

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
- HTTP düğümleri: `retryOnFail`, 3 deneme, 5 sn ara (n8n üst sınırı 5 sn). Giriş cevapları 200 döndüğü için yanlış şifre tekrar denenmez; Inavitas giriş POST'unda tekrar deneme hiç yok.
- Token yeniden kullanımı: Sungrow 12 saat, FusionSolar 25 dk, Inavitas çerezi 12 saat (RememberMe=true).
- Kaynak hatasında son bilinen değer korunur, `durum=bayat`, `ardisik_hata+1`; bayat satırlar üretim kurallarına girmez.

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
- `aylik_ptf.json` yalnız yeni/değişen tam gün varsa güncellenir (eski panel biçimi korunur).
- Uyarılar: 15:30'dan sonra yarının PTF'si yoksa; EPİAŞ verisi 26 saattir alınamıyorsa.
- GitHub Actions'taki `main.py` (madencilik kârlılık sinyali, WhatsApp) şimdilik çalışmaya devam ediyor; aynı dosyaya aynı değerleri yazar.
