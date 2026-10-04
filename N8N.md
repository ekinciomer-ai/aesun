# n8n çalışma mimarisi

Sürekli çalışan toplayıcılar bilgisayarlardan alınıp n8n Cloud'a (xbay.app.n8n.cloud, **aesun** klasörü) taşındı.
Sahaya bağlı kalması gereken işler (OSOS tarayıcısı, madenci yönetimi) saha Pi'sinde kalır; Pi n8n'e nabız yollar.

```
                ┌──────────── n8n Cloud (aesun klasörü) ────────────┐
 iSolarCloud ──►│ Sungrow toplayıcı      15 dk ─┐                   │
 FusionSolar ──►│ FusionSolar toplayıcı  15 dk ─┼─► GitHub epias-ptf/n8n/*.json
 Inavitas    ──►│ Inavitas toplayıcı     15 dk ─┘   + veri tabloları (geçmiş)
                │                                                   │
 saha Pi ──────►│ Pi nabız (webhook) ──► aesun_nabiz                │
 (OSOS, miner)  │                                                   │
                │ Uyarı motoru 15 dk: OSOS + n8n/*.json + nabız ──► WhatsApp (Twilio)
                │                     └─► n8n/uyarilar.json, aesun_uyari_durum
                └───────────────────────────────────────────────────┘
 aesun paneli  ◄── GitHub raw (2026_osos_endeks.json, n8n/*.json)
```

| İş akışı | Tetik | Çıktı |
|---|---|---|
| aesun · Sungrow toplayıcı | 15 dk | n8n/sungrow_son.json, `aesun_sungrow` |
| aesun · FusionSolar toplayıcı | 15 dk | n8n/fusion_son.json, `aesun_fusion` |
| aesun · Inavitas toplayıcı | 15 dk | n8n/inavitas_son.json, `aesun_inavitas` |
| aesun · Pi nabız | Pi POST (5 dk) | `aesun_nabiz` |
| aesun · Uyarı motoru | 15 dk (+08:30 özet) | WhatsApp, n8n/uyarilar.json, `aesun_uyari_durum` |

## Kimlik bilgileri (n8n > Credentials, elle girilir)

| Ad | Tür | İçerik |
|---|---|---|
| Sungrow iSolarCloud | Templated Custom Auth | `{"headers":{"x-access-key":"{{secret}}","sys_code":"901"},"body":{"appkey":"{{appkey}}","user_account":"{{kullanici}}","user_password":"{{sifre}}"}}` |
| FusionSolar Northbound | Templated Custom Auth | `{"body":{"userName":"{{kullanici}}","systemCode":"{{sifre}}"}}` |
| Inavitas | Templated Custom Auth | `{"body":{"UserName":"{{kullanici}}","Password":"{{sifre}}"}}` |
| GitHub epias-ptf | GitHub API | fine-grained token, yalnız epias-ptf, Contents: Read and write |
| Twilio | Twilio API | Account SID + Auth Token |

## Pi tarafı (nabız)

```bash
cd ~/aesun && git pull
sudo cp pi/aesun-nabiz.service pi/aesun-nabiz.timer /etc/systemd/system/
sudo systemctl daemon-reload && sudo systemctl enable --now aesun-nabiz.timer
```

Takip edilen servisler `AESUN_SERVISLER` ile değişir (varsayılan: `osos altminer`).

## Geçiş sırası
1. Kimlik bilgilerini gir, her iş akışını bir kez elle çalıştır, çıktıyı kontrol et.
2. Toplayıcıları etkinleştir; birkaç gün GitHub Actions ile paralel çalışsın.
3. Sonra bilgisayardaki Sungrow / Inavitas betiklerini ve fusion_solar.py Action'ını kapat.
