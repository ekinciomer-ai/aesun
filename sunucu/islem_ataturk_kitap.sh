#!/bin/bash
# Atatürk'ün Okuduğu Kitaplar (Anıtkabir Derneği, 24 cilt) — sunucuya indirir, metnini çıkarır.
# Kalıcı klasör: /opt/kaynaklar/ataturk-okudugu-kitaplar  (var olan cilt tekrar indirilmez)
# Metin paketi dizin çıkarmak için /opt/tampon/disari/ üzerinden geri gelir.
set -u
K=/opt/kaynaklar/ataturk-okudugu-kitaplar
mkdir -p "$K/pdf" "$K/metin" /opt/tampon/disari
command -v pdftotext >/dev/null || { apt-get update -qq >/dev/null && apt-get install -y -qq poppler-utils >/dev/null; }
U=https://www.anitkabir.com.tr/Files/Kitaplar
for n in $(seq 1 24); do
  f="$K/pdf/cilt-$(printf %02d $n).pdf"
  if [ ! -s "$f" ] || ! head -c5 "$f" | grep -q '%PDF'; then
    curl -sSL --retry 3 --max-time 900 -A "Mozilla/5.0" -o "$f.tmp" "$U/Ataturkun-Okudugu-Kitaplar-Cilt-$n.pdf" \
      && head -c5 "$f.tmp" | grep -q '%PDF' && mv "$f.tmp" "$f" || { rm -f "$f.tmp"; echo "NOT: cilt $n İNDİRİLEMEDİ"; continue; }
  fi
  t="$K/metin/cilt-$(printf %02d $n).txt"
  pdftotext -layout "$f" "$t" 2>/dev/null
  s=$(pdfinfo "$f" 2>/dev/null | awk '/^Pages/{print $2}')
  echo "NOT: cilt $n: $(du -h "$f" | cut -f1) · $s sayfa · metin $(wc -w < "$t" 2>/dev/null) kelime"
done
cd "$K" && tar czf /opt/tampon/disari/ataturk_metin.tgz metin
echo "NOT: toplam $(du -sh "$K/pdf" | cut -f1) · klasör $K"
