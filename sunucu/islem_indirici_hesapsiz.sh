#!/bin/bash
# Tampon: indiriciye hesapsız YouTube/TikTok yolu ekler.
#  1) bgutil PO-token sağlayıcı (yalnız 127.0.0.1:4416) + yt-dlp eklentisi
#  2) Cloudflare WARP (wgcf + wireproxy) → yalnız indiricinin kullandığı SOCKS5 127.0.0.1:40000
# Diğer uygulamaların ağına dokunmaz; sunucu trafiği değişmez. Sır yazmaz/okumaz (WARP hesabı anonim).
set -u
KOK=/opt/tampon/indirici; W=$KOK/warp; mkdir -p $W $KOK/bin
[ -x $KOK/venv/bin/yt-dlp ] || { echo "NOT: HATA önce indirici_kur"; exit 1; }
ARCH=amd64

# 1) PO-token sağlayıcı
$KOK/venv/bin/pip install -q -U bgutil-ytdlp-pot-provider >/dev/null 2>&1 && echo "NOT: pot eklentisi kuruldu" || echo "NOT: HATA pot eklentisi"
if ! docker ps --format '{{.Names}}' | grep -qx tampon-bgutil; then
  docker rm -f tampon-bgutil >/dev/null 2>&1
  docker run -d --name tampon-bgutil --restart unless-stopped --memory 512m -p 127.0.0.1:4416:4416 brainicism/bgutil-ytdlp-pot-provider >/dev/null 2>&1 \
    && echo "NOT: pot sağlayıcı çalışıyor" || echo "NOT: HATA pot sağlayıcı başlamadı"
fi

# 2) WARP: wgcf (anonim hesap) + wireproxy (kullanıcı alanı SOCKS5)
cd $W
if [ ! -x $KOK/bin/wgcf ]; then
  U=$(curl -fsSL https://api.github.com/repos/ViRb3/wgcf/releases/latest | grep -o "https://[^\"]*linux_${ARCH}" | head -1)
  curl -fsSL --max-time 120 -o $KOK/bin/wgcf "$U" && chmod +x $KOK/bin/wgcf || { echo "NOT: HATA wgcf"; exit 1; }
fi
if [ ! -x $KOK/bin/wireproxy ]; then
  T=$(mktemp -d); curl -fsSL --max-time 120 -o $T/w.tgz https://github.com/whyvl/wireproxy/releases/latest/download/wireproxy_linux_${ARCH}.tar.gz \
    && tar xzf $T/w.tgz -C $T && install -m755 $T/wireproxy $KOK/bin/wireproxy || { echo "NOT: HATA wireproxy"; exit 1; }; rm -rf $T
fi
[ -s wgcf-account.toml ] || $KOK/bin/wgcf register --accept-tos >/dev/null 2>&1
[ -s wgcf-profile.conf ] || $KOK/bin/wgcf generate >/dev/null 2>&1
[ -s wgcf-profile.conf ] || { echo "NOT: HATA WARP profili oluşmadı"; exit 1; }
chmod 600 wgcf-account.toml wgcf-profile.conf
cat > wireproxy.conf <<EOF
WGConfig = $W/wgcf-profile.conf

[Socks5]
BindAddress = 127.0.0.1:40000
EOF
cat > /etc/systemd/system/tampon-warp.service <<EOF
[Unit]
Description=Tampon indirici WARP SOCKS5 (yalniz 127.0.0.1:40000)
After=network-online.target
[Service]
ExecStart=$KOK/bin/wireproxy -c $W/wireproxy.conf
Restart=always
RestartSec=10
MemoryMax=128M
[Install]
WantedBy=multi-user.target
EOF
systemctl daemon-reload; systemctl enable --now tampon-warp >/dev/null 2>&1; systemctl restart tampon-warp; sleep 4
systemctl is-active --quiet tampon-warp && echo "NOT: WARP yolu çalışıyor" || echo "NOT: HATA WARP servisi"
IP1=$(curl -s --max-time 10 https://www.cloudflare.com/cdn-cgi/trace | grep -E '^warp=')
IP2=$(curl -s --max-time 15 --socks5-hostname 127.0.0.1:40000 https://www.cloudflare.com/cdn-cgi/trace | grep -E '^warp=')
echo "NOT: sunucu doğrudan: ${IP1:-?} · WARP yolu: ${IP2:-?}"

# 3) indir komutu: önce doğrudan, olmazsa WARP yolundan
cat > $KOK/indir <<'EOF'
#!/bin/bash
# indir <url> [klasör] — en iyi kalite; doğrudan olmazsa WARP yolundan dener
KOK=/opt/tampon/indirici
export PATH=$KOK/bin:$PATH
URL=${1:?url ver}; HEDEF=${2:-$KOK/cikti}; mkdir -p "$HEDEF"
if [ -z "$(find $KOK/.guncel -mtime -1 2>/dev/null)" ]; then
  $KOK/venv/bin/pip install -q -U "yt-dlp[default,curl-cffi]" bgutil-ytdlp-pot-provider >/dev/null 2>&1 && touch $KOK/.guncel
fi
CEREZ=(); case "$URL" in *instagram.com*) [ -s $KOK/cerez/instagram.txt ] && CEREZ=(--cookies $KOK/cerez/instagram.txt);; esac
calis() {
  $KOK/venv/bin/yt-dlp --no-warnings --no-playlist "$@" \
    -f "bv*+ba/b" -S "res,fps,hdr:12,vcodec:av01,acodec,br" \
    --merge-output-format mp4 --remux-video mp4 --embed-metadata --embed-thumbnail \
    --restrict-filenames -o "$HEDEF/%(extractor)s_%(id)s_%(height)sp.%(ext)s" \
    --print after_move:filepath "${CEREZ[@]}" "$URL"
}
calis || { echo "doğrudan olmadı, WARP yolu deneniyor" >&2; calis --proxy socks5://127.0.0.1:40000; }
EOF
chmod +x $KOK/indir

# 4) Testler (indirmeden, yalnız format): doğrudan ve WARP
export PATH=$KOK/bin:$PATH
t() { local AD=$1 URL=$2; shift 2
  local S; S=$(timeout 150 $KOK/venv/bin/yt-dlp --no-warnings --no-playlist "$@" -f "bv*+ba/b" -S "res,fps,hdr:12,vcodec:av01,acodec,br" \
    --simulate --print "%(resolution)s %(fps)sfps %(vcodec)s+%(acodec)s" "$URL" 2>&1 | tail -1 | cut -c1-170)
  echo "NOT: TEST $AD → $S"; }
YT="https://www.youtube.com/watch?v=aqz-KE-bpKQ"
TT1="https://www.tiktok.com/@leenabhushan/video/6748451240264420610"
TT2="https://www.tiktok.com/@patroxofficial/video/6742501081818877190"
t "YouTube doğrudan" "$YT"
t "YouTube WARP" "$YT" --proxy socks5://127.0.0.1:40000
t "TikTok1 doğrudan" "$TT1"
t "TikTok1 WARP" "$TT1" --proxy socks5://127.0.0.1:40000
t "TikTok2 doğrudan" "$TT2"
t "TikTok2 WARP" "$TT2" --proxy socks5://127.0.0.1:40000
echo "NOT: bitti"
