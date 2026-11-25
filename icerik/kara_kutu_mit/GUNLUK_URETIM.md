# Kara Kutu · "Mit mi Gerçek mi?" — Günlük Üretim (her gün 3 bölüm)

Bu dosya zamanlanmış görevin talimatıdır. Görev her gün bu klasörü kullanarak **3 yeni bölüm** üretir ve Yükleme Yöneticisi'ne **teslim + planla** yapar. Yayın onayı yalnız Ömer'dedir: `onay`, `yonlendir` ve yt_kuyruk adımları **asla** çalıştırılmaz.

Ayrıntılı kurallar: `URETIM_REHBERI.md`. Konu listesi: `KONU_HAVUZU.md`. Yapılanlar: `uretilenler.json`.

## Değişmez kurallar
- Günde EN AZ 3 video teslim edilir (Ömer, 25.11.2026). Kota yüzünden kalan bölüm aynı gün kota yenilenince (11:00) tamamlanır; ertesi güne kalan bölüm o günün 3'üne sayılmaz.
- Senaryoda söylenen yer/yol tipi sahnede birebir görünmeli ("virajlı" dendiyse viraj sahnesi: S[11]). Ömer, 25.11.2026.
- Kesinleşmiş karar (Yargıtay/Danıştay `onama`) ve sonu net (beraat / mahkûmiyet + ceza / tazminat tutarı ya da oranı). Sonu belirsiz dava kullanılmaz.
- Videoda kişi adı, plaka, şehir adı, esas/karar numarası, daire, tarih yok (bunlar yalnız teslim kartındaki `kaynaklar`da).
- Sıradan araçlar (lüks değil), yüzsüz mankenler, geniş açı. Ölüm/yaralanma anı gösterilmez: siyah ekran + yazı.
- Tek ses: Gemini `gemini-3.1-flash-tts-preview`, Charon, `model_kilit: true`. Kota dolarsa eksik parçalar ayrı iş (`KOD_B`) ile aynı modelde okutulur; başka model/ses ASLA karıştırılmaz.
- Karar metninde olmayan bilgi uydurulmaz. Güncel ceza tutarı söylenecekse `madde_oku` + web ile doğrulanır.
- Aynı mit iki kez yapılmaz (`uretilenler.json`).

## Kurulum (her oturumda bir kez)
```bash
cd <aesun>/icerik/kara_kutu_mit && npm install --silent      # three 0.170
pkill -f "http.server 8765"; (nohup python3 -m http.server 8765 >/tmp/http.log 2>&1 &)
export AESUN=<aesun klasörü>
```
Playwright `/opt/npm-tools`, Chrome `/usr/bin/google-chrome` ortamda hazırdır.

## Bir bölümün adımları
1. **Konu:** `KONU_HAVUZU.md`'den yapılmamış, en ilgi çekici miti seç (aynı gün 3 farklı tür: ceza / tazminat / idare karışık olsun).
2. **Karar:** Lexara `ictihat_ara` (`hukum: onama`) → `karar_oku` ile tam metni oku. Sonuç net değilse sıradaki adaya geç.
3. **Senaryo:** 7 parça (V1 kanca · V2 olay · V3 kaza anı · V4 oylama · V5 geri sarma/3 ipucu · V6 karar+gerekçe+"Yargıtay/Danıştay onadı" · V7 ders + "Sen hangi şıkkı seçtin?"). Sayılar yazıyla. 3 şık, biri doğru.
4. **Ses:** `sunucu/tts_kuyruk/KK_MIT_NN.json` yaz, push et (tts_kuyruk iş akışı ~5 dk). Çıktı: `sunucu/tts_kuyruk/cikti/KK_MIT_NN__V1..V7.mp3`. `gunluk.txt`'de 7 parçanın da `gemini-3.1-flash-tts-preview` ile okunduğunu kontrol et.
5. **Sahne:** `scene.html`'deki hazır sahnelerden uygun olanı kullan, gerekirse yeni `upd` fonksiyonu/sahne ekle (mevcutları bozmadan):
   - `S[0]` ışıklı kavşak (gündüz) — `upd`, `upd2` (kırmızı→yeşil, sağdan sola kıran), `upd3` (yeşilde hızlı araç + kırmızıda yaya)
   - `S[1]` gece yağmur, yaya geçidi · `S[2]` köy yolu, motosiklet · `S[3]` 3 şeritli çevre yolu (ani fren)
   - `S[4]` şehir, refüjden çıkan yaya · `S[5]` şehir, ayna çarpıp kaçma · `S[6]` köy yolu, uyarısız kazı çukurları
   - `S[7]` gece karlı devlet yolu, otobüs + kar temizleme aracı · `S[8]` köy yolu, yola çıkan büyükbaş
   - Modeller: `makeCar`, `makeTruck`, `makeBus`, `makePlow`, `makeCow`, `makePed` (yüzsüz manken)
6. **Zaman çizelgesi:** `mk_tl.py` içindeki `build()` ile `tl/mit<N>_tl.json` üret (ses sürelerinden otomatik), sonra çarpma anı, ipucu, gerekçe, `hukum`, `onay`, `next` saniyelerini sese göre elle düzelt; uzun altyazıyı iki satıra böl.
7. **Bölüm fonksiyonu:** `mk_ep.py` içindeki `mk()` ile `window.renderMit<N>` üret (kanca, şıklar, gerekçe başlığı, sonuç, ders kartı, kamera, çip, siyah ekran yazısı, etiketler). Danıştay kararıysa `src='Danıştay'`, `stamp="'DANIŞTAY<br>ONADI'"`.
8. **Test kareleri:** `RF=renderMit<N> node render.mjs 540 960 30 0 0 test<N> 3,12,…` ile 10 kare çek, birleştirip **gözle bak**: araçlar görünüyor mu, kaza geniş açıdan net mi, yazılar çakışıyor mu, şerit yönü doğru mu (sağdan trafik). Sorun varsa düzelt, tekrar bak.
9. **Üret:** `./bitir.sh <N> KK_MIT_NN KK_MIT_NN_KONU` (~30–45 dk). Çıkan önizlemeden 9 kare alıp son kontrol yap.
10. **Teslim kartı:** `sunucu/havuz/teslim/<HAVUZ_KOD>.json` — önceki kartı (ör. `KK_MIT_09_HAYVAN.json`) şablon al; `kod, sira, konu, amac, baslik, aciklama (uyarı notu dahil), etiketler, kaynaklar, kaynak_dosya` güncelle.
11. Üç bölüm bitince tek işlem dosyası `sunucu/islem_havuz_kk_gunluk_<YYYYMMDD>.sh` (yalnız `teslim` + `planla`, şablon: `sunucu/islem_havuz_kk_mit89.sh`) yaz, video + kart + işlemi tek commit ile push et, `sunucu_islem.yml`'i REST ile tetikle:
   `gh api -X POST repos/ekinciomer-ai/aesun/actions/workflows/sunucu_islem.yml/dispatches -f ref=main -f 'inputs[islem]=havuz_kk_gunluk_<YYYYMMDD>'`
   Video 100 MB'ı geçmemeli (crf 24, maxrate 6M zaten sağlar).
12. **Kayıt:** `uretilenler.json`'a ekle, `KONU_HAVUZU.md`'de konuyu "yapıldı" olarak işaretle; aynı commit'te `scene.html`, `tl/`, `mk_*` değişikliklerini de kaydet (bir sonraki gün bunları kullanır).

## Sıra ve süre
- Seslendirmeyi 3 bölüm için en başta toplu gönder (kota sabah 11:00'de yenilenir).
- Render'ları sırayla çalıştır (aynı anda en fazla 2 render süreci; 4 süreç her şeyi yavaşlatır).
- Bir bölüm herhangi bir adımda düzelmiyorsa onu bırak, havuzdan başka konuyla devam et; gün sonunda kaç bölüm teslim edildiğini ve nedenini raporla.

## Gün sonu raporu (SendUserMessage ile, kısa)
- Teslim edilen bölümler: kod · başlık · tek cümle sonuç
- Atlanan konu varsa nedeni
- "Yayın için panelden onay bekliyor" hatırlatması
