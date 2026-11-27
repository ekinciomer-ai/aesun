# EÇED P.T.D. → Google Drive aktarımı

**Amaç:** EÇED "ÇED Süreci Başlayan" duyurularındaki 782 P.T.D. dosyasını (~50–100 GB) Drive'daki `EÇED PTD Dosyaları` klasörüne aktarmak.

**Neden tarayıcıdan:** EÇED (eced.csb.gov.tr) yurt dışındaki sunuculara kapalı (merkez sunucudan bağlantı zaman aşımı, 27.11.2026). Sunucu diski de dolu. Saha Pi'si seçeneği saha internet kotasını (100–200 GB) yiyeceği için seçilmedi.

**Nasıl çalışır (bilgisayara hiçbir şey kurulmaz):**
1. `Kod.gs` → Ömer'in Google hesabında Apps Script web uygulaması (ücretsiz). Parçaları alıp Drive'a yazar.
   Dağıtım: Yürüten = ben, Erişim = herkes. `ANAHTAR` komut dosyası özelliğine rastgele bir değer girilir; anahtarsız istek reddedilir.
2. `calistir.js` → evdeki bilgisayarda Chrome'da açık bir eced.csb.gov.tr sekmesinde çalışır. Dosyayı Türkiye bağlantısıyla indirir, 16 MB parçalarla Apps Script'e yollar. Diske yazmaz.
   Ayar: o sekmenin localStorage'ına `eced_url` (web uygulaması adresi) ve `eced_k` (ANAHTAR).
3. Kaldığı yerden devam eder; Drive'da `<no>_…` ile başlayan dosya varsa atlar. Sağ üstteki panelde ilerleme ve Durdur düğmesi var.

**Liste:** `ids.txt` (782 tekil EÇED no; 851 duyurudan, 27.11.2026). Yeni liste gerekirse duyuru sayfasında filtre "ÇED Süreci Başlayan", satır sayısı tümü, her satırın Detay'ındaki `jsp/ek1/<no>` bağlantısı.

**Not:** 27.11'de tarayıcı denemesinde 1 dosya (61793 Şebinkarahisar) Claude'un açtığı ayrı klasöre gitti; Drive'da iki küçük `_test_eced*.txt` deneme dosyası kaldı.
