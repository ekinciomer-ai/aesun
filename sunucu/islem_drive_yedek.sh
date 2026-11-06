#!/bin/bash
# Yedeğin dış kopyası: şifreli restic deposu → Google Drive (yalnız uygulamanın kendi açtığı klasör; drive.file izni).
# Aşama 1 (kod yoksa): rclone kurulur, depo boyutu ve onay adresi yazılır.
# Aşama 2 (sunucu/drive/kod.sifreli varsa): kod belirtece çevrilir, rclone ayarı yazılır, ilk eşitleme yapılır,
#   gece yedeğinden sonra otomatik eşitleme eklenir. Belirteç yalnız root okuyabilen dosyada durur, yazdırılmaz.
set -u
D=/opt/aesun/drive; mkdir -p $D; chmod 700 $D
I=/opt/aesun/youtube/istemci.json
command -v rclone >/dev/null || { curl -fsS https://rclone.org/install.sh | bash >/dev/null 2>&1; }
echo "NOT: rclone $(rclone version 2>/dev/null | head -1) · depo boyutu: $(du -sh /var/yedek/restic | cut -f1) · dökümler: $(du -sh /var/yedek/dump 2>/dev/null | cut -f1)"
SC="https://www.googleapis.com/auth/drive.file"
if [ ! -f /tmp/aesun_paket/sunucu/drive/kod.sifreli ] && [ ! -f $D/rclone.conf ]; then
  python3 - "$I" "$SC" <<'PY'
import json,sys,urllib.parse
c=json.load(open(sys.argv[1]))
q={"client_id":c["client_id"],"redirect_uri":"http://127.0.0.1:8765","response_type":"code","scope":sys.argv[2],
   "access_type":"offline","prompt":"consent"}
print("NOT: ONAY_ADRESI https://accounts.google.com/o/oauth2/v2/auth?"+urllib.parse.urlencode(q))
PY
  exit 0
fi
# Aşama 2 (belirteç zaten varsa yalnız eşitleme)
if [ ! -f $D/rclone.conf ]; then
A=/opt/aesun/sir/ozel.pem
coz() {
  python3 - "$1" "$2" "$A" <<'PY0'
import base64, json, subprocess, sys, tempfile, os
d = json.load(open(sys.argv[1])); out, key = sys.argv[2], sys.argv[3]
with tempfile.TemporaryDirectory() as t:
    open(t+"/ak","wb").write(base64.b64decode(d["ak"])); open(t+"/ct","wb").write(base64.b64decode(d["ct"]))
    subprocess.run(["openssl","pkeyutl","-decrypt","-inkey",key,"-pkeyopt","rsa_padding_mode:oaep","-pkeyopt","rsa_oaep_md:sha256","-in",t+"/ak","-out",t+"/k"],check=True)
    k = open(t+"/k","rb").read().hex()
    subprocess.run(["openssl","enc","-d","-aes-256-cbc","-K",k,"-iv",d["iv"],"-in",t+"/ct","-out",out],check=True)
os.chmod(out, 0o600)
PY0
}
coz /tmp/aesun_paket/sunucu/drive/kod.sifreli $D/kod.txt
python3 - "$I" "$D" <<'PY'
import json,sys,base64,subprocess,urllib.request,urllib.parse,urllib.error,datetime
I,D=sys.argv[1],sys.argv[2]; c=json.load(open(I))
kod=open(D+"/kod.txt").read().strip()
tok=None
for k in [x.strip() for x in kod.splitlines() if x.strip()]:
    b=urllib.parse.urlencode({"code":k,"client_id":c["client_id"],"client_secret":c["client_secret"],"redirect_uri":"http://127.0.0.1:8765","grant_type":"authorization_code"}).encode()
    try: tok=json.load(urllib.request.urlopen(urllib.request.Request("https://oauth2.googleapis.com/token",data=b),timeout=30)); break
    except urllib.error.HTTPError as e: print("NOT: kod denemesi:",e.code,e.read().decode()[:120])
if not tok: raise SystemExit("NOT: HATA kod belirtece çevrilemedi")
son=(datetime.datetime.utcnow()+datetime.timedelta(seconds=tok.get("expires_in",3600))).strftime("%Y-%m-%dT%H:%M:%SZ")
t=json.dumps({"access_token":tok["access_token"],"token_type":"Bearer","refresh_token":tok.get("refresh_token",""),"expiry":son})
open(D+"/rclone.conf","w").write(f"[gdrive]\ntype = drive\nclient_id = {c['client_id']}\nclient_secret = {c['client_secret']}\nscope = drive.file\ntoken = {t}\n")
print("NOT: belirteç alındı · yenileme belirteci:", "var" if tok.get("refresh_token") else "YOK")
PY
rm -f $D/kod.txt; chmod 600 $D/rclone.conf 2>/dev/null
fi
[ -f $D/rclone.conf ] || exit 1
RC="rclone --config $D/rclone.conf"
$RC mkdir gdrive:aesun-yedek && echo "NOT: Drive klasörü hazır: $($RC lsd gdrive: 2>&1 | grep -c aesun-yedek) · kota: $($RC about gdrive: 2>/dev/null | tr '\n' ' ')"
timeout 7000 $RC sync /var/yedek/restic gdrive:aesun-yedek/restic --transfers 4 --stats-one-line --stats 0 2>&1 | tail -2 | sed 's/^/NOT: eşitleme: /'
echo "NOT: Drive'daki dosya sayısı: $($RC size gdrive:aesun-yedek/restic 2>/dev/null | tr '\n' ' ')"
# Gece yedeğinden sonra otomatik dış kopya (yalnız şifreli depo; yerel silinen eski anlık görüntüler Drive'da da silinir)
cat > /opt/aesun/yedek/dis_kopya.sh <<'SH'
#!/bin/bash
timeout 7000 rclone --config /opt/aesun/drive/rclone.conf sync /var/yedek/restic gdrive:aesun-yedek/restic --transfers 4 >> /var/log/aesun-dis-kopya.log 2>&1 \
  && echo "$(date -Is) tamam" >> /var/log/aesun-dis-kopya.log || echo "$(date -Is) HATA" >> /var/log/aesun-dis-kopya.log
SH
chmod 700 /opt/aesun/yedek/dis_kopya.sh
mkdir -p /etc/systemd/system/aesun-yedek.service.d
printf '[Service]\nExecStartPost=/opt/aesun/yedek/dis_kopya.sh\n' > /etc/systemd/system/aesun-yedek.service.d/dis-kopya.conf
systemctl daemon-reload && echo "NOT: gece yedeğinden sonra Drive kopyası eklendi"
