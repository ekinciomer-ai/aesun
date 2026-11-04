#!/bin/bash
# Gmail bağlantısı (Kanal Yönetim uygulaması — ancient-episode-513619-r1).
# Sırlar depoda yalnız şifreli durur; çözülmüş hali yalnız sunucuda root'a özeldir (/opt/aesun/gmail/token.json).
set -euo pipefail
YT=/opt/aesun/youtube; D=/opt/aesun/gmail; A=/opt/aesun/sir/ozel.pem; umask 077; mkdir -p $YT $D; chmod 700 $YT $D
coz() {
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
[ -f sunucu/yt/istemci.sifreli ] && [ ! -f $YT/istemci.json ] && coz sunucu/yt/istemci.sifreli $YT/istemci.json
if [ -f sunucu/yt/gmail_kod.sifreli ]; then
  coz sunucu/yt/gmail_kod.sifreli $D/kod.txt
  python3 - $YT $D <<'PY'
import json, os, sys, urllib.request, urllib.parse, urllib.error
YT, D = sys.argv[1], sys.argv[2]
c = json.load(open(YT+"/istemci.json"))
r = None
for kod in [k.strip() for k in open(D+"/kod.txt").read().split() if k.strip()]:
    body = urllib.parse.urlencode({
        "code": kod,
        "client_id": c["client_id"],
        "client_secret": c["client_secret"],
        "redirect_uri": "http://127.0.0.1:8765",
        "grant_type": "authorization_code"
    }).encode()
    try:
        r = json.load(urllib.request.urlopen("https://oauth2.googleapis.com/token", body, timeout=30))
        break
    except urllib.error.HTTPError as e:
        print("NOT: aday kod reddedildi:", json.load(e).get("error_description", e.code))
if r is None:
    print("NOT: HATA hiçbir aday kod kabul edilmedi"); sys.exit(1)
if "refresh_token" not in r:
    print("NOT: HATA yenileme anahtarı gelmedi"); sys.exit(1)
json.dump({"refresh_token": r["refresh_token"], "scope": r.get("scope", "")}, open(D+"/token.json", "w"))
os.chmod(D+"/token.json", 0o600)
print("NOT: gmail yenileme anahtarı kaydedildi · izinler:", " ".join(s.rsplit("/",1)[-1] for s in r.get("scope","").split()))
PY
  rm -f $D/kod.txt
fi
if [ -f $D/token.json ]; then
  python3 - $YT $D <<'PY'
import json, sys, urllib.request, urllib.parse, urllib.error
YT, D = sys.argv[1], sys.argv[2]
c = json.load(open(YT+"/istemci.json"))
t = json.load(open(D+"/token.json"))
body = urllib.parse.urlencode({
    "client_id": c["client_id"],
    "client_secret": c["client_secret"],
    "refresh_token": t["refresh_token"],
    "grant_type": "refresh_token"
}).encode()
at = json.load(urllib.request.urlopen("https://oauth2.googleapis.com/token", body, timeout=30))["access_token"]
try:
    q = urllib.request.Request("https://gmail.googleapis.com/gmail/v1/users/me/profile", headers={"Authorization": "Bearer " + at})
    prof = json.load(urllib.request.urlopen(q, timeout=30))
    print("NOT: bağlı gmail:", prof.get("emailAddress"), "· toplam mesaj:", prof.get("messagesTotal"))
except urllib.error.HTTPError as e:
    err = e.read().decode("utf-8", "ignore")[:240].replace("\n", " ")
    print("NOT: gmail api uyarısı:", e.code, err)
PY
else
  echo "NOT: henüz gmail yenileme anahtarı yok (izin adımı bekleniyor)"
fi
