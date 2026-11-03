#!/bin/bash
# YouTube bağlantısı (Kanal Yönetim uygulaması). Sırlar depoda yalnız şifreli durur; çözülmüş hali yalnız sunucuda root'a özeldir.
#  1) sunucu/yt/istemci.sifreli  → /opt/aesun/youtube/istemci.json   (OAuth istemci kimliği)
#  2) sunucu/yt/kod.sifreli varsa → kodu yenileme anahtarına çevirir → /opt/aesun/youtube/token.json
#  3) token varsa: erişimi doğrular (kanal adı, abone, video sayısı) — çıktıda sır yok
set -euo pipefail
D=/opt/aesun/youtube; A=/opt/aesun/sir/ozel.pem; umask 077; mkdir -p $D; chmod 700 $D
coz() {  # coz <şifreli json> <çıktı>
  python3 - "$1" "$2" "$A" <<'PY'
import base64, json, subprocess, sys, tempfile, os
d = json.load(open(sys.argv[1])); out, key = sys.argv[2], sys.argv[3]
with tempfile.TemporaryDirectory() as t:
    open(t+"/ak","wb").write(base64.b64decode(d["ak"])); open(t+"/ct","wb").write(base64.b64decode(d["ct"]))
    subprocess.run(["openssl","pkeyutl","-decrypt","-inkey",key,"-pkeyopt","rsa_padding_mode:oaep","-pkeyopt","rsa_oaep_md:sha256","-in",t+"/ak","-out",t+"/k"],check=True)
    k = open(t+"/k","rb").read().hex()
    subprocess.run(["openssl","enc","-d","-aes-256-cbc","-K",k,"-iv",d["iv"],"-in",t+"/ct","-out",out],check=True)
os.chmod(out, 0o600)
PY
}
[ -f sunucu/yt/istemci.sifreli ] && coz sunucu/yt/istemci.sifreli $D/istemci.json && echo "NOT: istemci kimliği yazıldı"
if [ -f sunucu/yt/kod.sifreli ]; then
  coz sunucu/yt/kod.sifreli $D/kod.txt
  python3 - $D <<'PY'
import json, sys, urllib.request, urllib.parse
D = sys.argv[1]; c = json.load(open(D+"/istemci.json")); kod = open(D+"/kod.txt").read().strip()
body = urllib.parse.urlencode({"code": kod, "client_id": c["client_id"], "client_secret": c["client_secret"],
    "redirect_uri": "http://127.0.0.1:8765", "grant_type": "authorization_code"}).encode()
try:
    r = json.load(urllib.request.urlopen("https://oauth2.googleapis.com/token", body, timeout=30))
except urllib.error.HTTPError as e:
    print("NOT: HATA kod değişimi:", json.load(e).get("error_description", e.code)); sys.exit(1)
if "refresh_token" not in r: print("NOT: HATA yenileme anahtarı gelmedi"); sys.exit(1)
json.dump({"refresh_token": r["refresh_token"], "scope": r.get("scope", "")}, open(D+"/token.json", "w"))
print("NOT: yenileme anahtarı kaydedildi · izinler:", " ".join(s.rsplit("/",1)[-1] for s in r.get("scope","").split()))
PY
  rm -f $D/kod.txt; chmod 600 $D/token.json
fi
if [ -f $D/token.json ]; then
  python3 - $D <<'PY'
import json, sys, urllib.request, urllib.parse
D = sys.argv[1]; c = json.load(open(D+"/istemci.json")); t = json.load(open(D+"/token.json"))
body = urllib.parse.urlencode({"client_id": c["client_id"], "client_secret": c["client_secret"], "refresh_token": t["refresh_token"], "grant_type": "refresh_token"}).encode()
at = json.load(urllib.request.urlopen("https://oauth2.googleapis.com/token", body, timeout=30))["access_token"]
q = urllib.request.Request("https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&mine=true", headers={"Authorization": "Bearer " + at})
for ch in json.load(urllib.request.urlopen(q, timeout=30)).get("items", []):
    s = ch["statistics"]
    print("NOT: bağlı kanal:", ch["snippet"]["title"], ch["snippet"].get("customUrl", ""), "· abone", s.get("subscriberCount"), "· video", s.get("videoCount"), "· izlenme", s.get("viewCount"))
PY
else
  echo "NOT: henüz yenileme anahtarı yok (izin adımı bekleniyor)"
fi
ls -l $D | awk 'NR>1{print "NOT: dosya "$1" "$NF}'
