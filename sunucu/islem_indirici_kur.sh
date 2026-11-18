#!/bin/bash
# Tampon bölge: genel video indirici (yt-dlp, Unlicense) — YouTube / Instagram / TikTok, en iyi kalite.
# Yalnız /opt/tampon/indirici içinde çalışır; port açmaz, sır okumaz, diğer uygulamalara dokunmaz.
# Kullanım (sunucuda): /opt/tampon/indirici/indir <url> [hedef_klasör]
set -u
KOK=/opt/tampon/indirici
mkdir -p $KOK/bin $KOK/cikti $KOK/cerez
command -v ffmpeg >/dev/null || { apt-get install -y -qq ffmpeg >/dev/null 2>&1 || { echo "NOT: HATA ffmpeg kurulamadı"; exit 1; }; }

# 1) yt-dlp (+ yt-dlp-ejs, curl_cffi vb.) ayrı sanal ortamda
[ -x $KOK/venv/bin/python ] || python3 -m venv $KOK/venv
$KOK/venv/bin/pip install -q -U pip >/dev/null 2>&1
$KOK/venv/bin/pip install -q -U "yt-dlp[default,curl-cffi]" >/dev/null 2>&1 || $KOK/venv/bin/pip install -q -U "yt-dlp[default]" >/dev/null 2>&1 || { echo "NOT: HATA yt-dlp kurulamadı"; exit 1; }

# 2) Deno (YouTube en yüksek kalite formatları için JS motoru) — resmi GitHub sürümü, sağlama kontrollü
if [ ! -x $KOK/bin/deno ]; then
  T=$(mktemp -d); cd $T
  U=https://github.com/denoland/deno/releases/latest/download/deno-x86_64-unknown-linux-gnu.zip
  curl -fsSL --max-time 180 -o d.zip $U && curl -fsSL --max-time 60 -o d.zip.sha256sum $U.sha256sum || { echo "NOT: HATA deno indirilemedi"; exit 1; }
  B=$(awk '{print $1}' d.zip.sha256sum | head -1); G=$(sha256sum d.zip | awk '{print $1}')
  [ "$B" = "$G" ] || { echo "NOT: HATA deno sağlama tutmadı"; exit 1; }
  python3 -c "import zipfile;zipfile.ZipFile('d.zip').extract('deno','$KOK/bin')" && chmod +x $KOK/bin/deno
  cd /; rm -rf $T
fi

# 3) indir komutu: en iyi görüntü + en iyi ses, mp4 olarak birleştirir; günde bir kendini günceller
cat > $KOK/indir <<'EOF'
#!/bin/bash
# indir <url> [klasör]  — en iyi kalitede indirir
KOK=/opt/tampon/indirici
export PATH=$KOK/bin:$PATH
URL=${1:?url ver}; HEDEF=${2:-$KOK/cikti}; mkdir -p "$HEDEF"
if [ -z "$(find $KOK/.guncel -mtime -1 2>/dev/null)" ]; then
  $KOK/venv/bin/pip install -q -U "yt-dlp[default,curl-cffi]" >/dev/null 2>&1 && touch $KOK/.guncel
fi
CEREZ=(); case "$URL" in *instagram.com*) [ -s $KOK/cerez/instagram.txt ] && CEREZ=(--cookies $KOK/cerez/instagram.txt);; esac
exec $KOK/venv/bin/yt-dlp --no-warnings --no-playlist \
  -f "bv*+ba/b" -S "res,fps,hdr:12,vcodec:av01,acodec,br" \
  --merge-output-format mp4 --remux-video mp4 \
  --embed-metadata --embed-thumbnail \
  --restrict-filenames -o "$HEDEF/%(extractor)s_%(id)s_%(height)sp.%(ext)s" \
  --print after_move:filepath "${CEREZ[@]}" "$URL"
EOF
chmod +x $KOK/indir; touch $KOK/.guncel

echo "NOT: yt-dlp $($KOK/venv/bin/yt-dlp --version)"
echo "NOT: deno $($KOK/bin/deno --version 2>/dev/null | head -1)"
echo "NOT: ffmpeg $(ffmpeg -version | head -1 | awk '{print $3}')"

# 4) Test: yalnız format kontrolü (indirmeden). YouTube testi serbest lisanslı Big Buck Bunny (Blender, CC-BY).
export PATH=$KOK/bin:$PATH
test_et() {
  local AD=$1 URL=$2
  local S
  S=$(timeout 120 $KOK/venv/bin/yt-dlp --no-warnings --no-playlist -f "bv*+ba/b" -S "res,fps,hdr:12,vcodec:av01,acodec,br" \
      --simulate --print "%(resolution)s %(fps)sfps %(vcodec)s+%(acodec)s" "$URL" 2>&1 | tail -1 | cut -c1-200)
  echo "NOT: TEST $AD → $S"
}
test_et YouTube "https://www.youtube.com/watch?v=aqz-KE-bpKQ"
test_et TikTok  "https://www.tiktok.com/@leenabhushan/video/6748451240264420610"
test_et Instagram "https://www.instagram.com/p/aye83DjauH/"
echo "NOT: kurulum tamam · komut: $KOK/indir <url>"
