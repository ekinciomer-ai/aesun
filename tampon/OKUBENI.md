# Tampon bölge (yalıtılmış deneme)

Dışarıdan bulunan bir araç sisteme alınmadan önce burada denenir. Bilgisayar ve sunucu gerekmez, ücretsizdir.

- `deneme/<id>.json` dosyası eklenip gönderilince `.github/workflows/tampon_dene.yml` çalışır.
- Araç GitHub'ın geçici makinesinde kurulur ve duman testi yapılır. Bu adım **hiçbir şifre ve yazma yetkisi almaz**; denenen kod depoya ya da sunucuya dokunamaz.
- Sonuç `sonuc/<id>.json` dosyasına yazılır: `durum` (basarili/basarisiz), kurulum ve test çıkış kodları, süre, basit güvenlik taraması bulguları, son log satırları.

GDEO'nun OU ajanı önerilerini buradan dener (gece oturumunda dış kod kurulamadığı için).
