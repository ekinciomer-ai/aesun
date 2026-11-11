#!/bin/bash
# Tampon bölge, salt okunur: referans videoyu (TikTok/YouTube) indirir; 12 kare + istatistik (info.json) + ses (mp3) çıkarır.
# Yalnız /opt/tampon/video_kare içinde çalışır; sır okumaz, port açmaz, diğer uygulamalara dokunmaz.
# Çıktı /opt/tampon/disari/video_kare.tgz → iş akışı artifact olarak geri getirir. Bağlantı: sunucu/video_kare_url.txt
set -u
KOK=/opt/tampon/video_kare; mkdir -p $KOK /opt/tampon/disari; cd $KOK || exit 1
URL=$(head -1 /tmp/aesun_paket/sunucu/video_kare_url.txt 2>/dev/null | tr -d '\r\n ')
case "$URL" in https://www.tiktok.com/*|https://www.youtube.com/*|https://youtu.be/*) ;; *) echo "NOT: HATA geçersiz bağlantı"; exit 1;; esac
command -v ffmpeg >/dev/null || { echo "NOT: HATA sunucuda ffmpeg yok"; exit 1; }
[ -x $KOK/venv/bin/yt-dlp ] || { python3 -m venv $KOK/venv && $KOK/venv/bin/pip install -q -U yt-dlp; } >/dev/null 2>&1
$KOK/venv/bin/pip install -q -U yt-dlp >/dev/null 2>&1
rm -rf $KOK/is && mkdir -p $KOK/is/kare && cd $KOK/is
if timeout 300 $KOK/venv/bin/yt-dlp -q -f "b[height<=720]/bv*[height<=720]+ba/b" --write-info-json -o "v.%(ext)s" "$URL" 2> hata.txt; then
  F=$(ls v.* | grep -v json | head -1); S=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$F")
  for i in $(seq 0 11); do T=$(python3 -c "print(round($S*($i+0.5)/12,2))"); ffmpeg -v error -y -ss "$T" -i "$F" -frames:v 1 -vf "scale=360:-2" -q:v 4 "kare/k$(printf %02d $i).jpg"; done
  ffmpeg -v error -y -i "$F" -vn -ac 1 -ar 22050 -b:a 64k kare/ses.mp3
  python3 - <<'PY'
import json, glob
j = json.load(open(glob.glob("*.info.json")[0]))
keep = {k: j.get(k) for k in ["title","description","uploader","channel","channel_follower_count","duration","width","height","view_count","like_count","comment_count","repost_count","save_count","upload_date","track","artist","tags"]}
json.dump(keep, open("kare/bilgi.json","w",encoding="utf-8"), ensure_ascii=False, indent=1)
print("NOT: başlık:", (keep.get("title") or "")[:120])
print("NOT: izlenme/beğeni/yorum/paylaşım/kaydetme:", keep.get("view_count"), keep.get("like_count"), keep.get("comment_count"), keep.get("repost_count"), keep.get("save_count"))
PY
  echo "NOT: süre $S sn, kare ve ses hazır"
  tar czf /opt/tampon/disari/video_kare.tgz -C $KOK/is kare
else
  echo "NOT: HATA indirilemedi: $(tail -2 hata.txt | cut -c1-200)"
fi
rm -rf $KOK/is
