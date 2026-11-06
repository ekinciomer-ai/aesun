# Nükte ve Akım Kütüphanesi (Antik Stüdyo)

Vizyon: Tarih geçmişte kalmaz. Her içerik geçmişteki bir olayı bugünün akımı, anlayışı ve diliyle yorumlar.
Formül: bugünün akımı → tarihteki ilk örneği → bugüne mesaj.

- `nukte_kutuphanesi.json`: 12 hazır cevap tekniği, tarihî kişilerin tavır kayıtları, akım ↔ tarih eşlemeleri, tek fotoğraflık söz kartları, yanlış atfedilen sözler listesi.
- `nukte_motoru.py` (harici paket gerekmez):
  - `sec --durum <tip> --sahne "..."`: sahneye uygun 3 nükte tekniği ve hazır senaryo istemi
  - `akim --bolge TR|EN|ES`: akım → tarih eşlemeleri
  - `soz --bolge TR|EN|ES`: günün söz kartı (dil kanalına göre)
  - `ekle --dosya yeni.json`: doğrulamalı ekleme, her eklemede otomatik yedek
  - `liste`

Kurallar: birebir söz yalnız kamu malı kişilerden; çeviriler kendi çevirimiz; her söz yayından önce asıl eserde kontrol edilir; telifli kişilerden yalnız tavır kalıbı.
