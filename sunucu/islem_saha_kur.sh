#!/bin/bash
# Saha eşitleme API'sini (saha.py: saha-get/saha-set/foto-get/foto-set) aesun-api'ye ekler; n8n Cloud kotası dolduğu için
# saha uygulamasının sunucusu artık burası. Veri tabanı: /veri/saha.db (aesun_veri birimi, gece restic yedeğinde).
# Güvenli dağıtım: önceki imaj ve dosyalar saklanır; sağlık kontrolü başarısızsa otomatik geri alınır.
# Ardından Saha_yedek (gizli depo, /opt/depolar kopyası) içindeki son kv+foto yedeği tabana YALNIZ eksik kayıtlar için aktarılır.
set -uo pipefail
cd /tmp/aesun_paket
ONCE=$(docker inspect aesun-api --format '{{.Image}}' 2>/dev/null)
for f in docker-compose.yml Dockerfile app.py saha.py; do [ -f /opt/aesun/$f ] && cp /opt/aesun/$f /opt/aesun/$f.onceki; done
cp -r sunucu/aesun/. /opt/aesun/
cd /opt/aesun
saglik() {
  for i in $(seq 1 20); do
    s=$(docker exec aesun-api python -c "import urllib.request;print(urllib.request.urlopen('http://127.0.0.1:8000/v1/saglik',timeout=5).status)" 2>/dev/null)
    [ "$s" = 200 ] && break; sleep 2
  done
  k=$(docker exec aesun-api python -c "
import urllib.request,urllib.error
try: print(urllib.request.urlopen('http://127.0.0.1:8000/v1/saha/saha-get?proje=SHAMS1-tr1',timeout=5).status)
except urllib.error.HTTPError as e: print(e.code)" 2>/dev/null)
  echo "saglik=$s saha_get=$k"
  [ "$s" = 200 ] && [ "$k" = 200 ]
}
if docker compose build -q api >/tmp/saha_build.log 2>&1 && docker compose up -d --no-deps api >/dev/null 2>&1 && R=$(saglik); then
  echo "NOT: saha API yayında · $R · dışarıdan: $(curl -s -o /dev/null -w '%{http_code}' --max-time 15 'https://api.aksarayenerji.net/v1/saha/saha-get?proje=SHAMS1-tr1') · sağlık: $(curl -s -o /dev/null -w '%{http_code}' --max-time 15 https://api.aksarayenerji.net/v1/saglik)"
  rm -f docker-compose.yml.onceki Dockerfile.onceki app.py.onceki saha.py.onceki
else
  echo "NOT: HATA saha dağıtımı başarısız (${R:-derleme}) · $(tail -3 /tmp/saha_build.log | tr '\n' ' ' | cut -c1-200) · geri alınıyor"
  for f in docker-compose.yml Dockerfile app.py; do [ -f $f.onceki ] && mv $f.onceki $f; done
  rm -f saha.py saha.py.onceki
  [ -n "$ONCE" ] && docker tag "$ONCE" aesun-api:latest 2>/dev/null
  docker compose up -d --no-deps api >/dev/null 2>&1; sleep 6
  echo "NOT: geri alındı · sağlık: $(curl -s -o /dev/null -w '%{http_code}' --max-time 15 https://api.aksarayenerji.net/v1/saglik)"
  exit 1
fi
# --- yedekten aktarım (yalnız eksik kayıtlar; var olana dokunmaz) ---
DB=/var/lib/docker/volumes/aesun_aesun_veri/_data/saha.db
python3 - "$DB" <<'PY'
import json, sqlite3, sys, os
db = sys.argv[1]; Y = "/opt/depolar/Saha_yedek"
c = sqlite3.connect(db, timeout=30); c.execute("PRAGMA journal_mode=WAL")
c.execute("CREATE TABLE IF NOT EXISTS kv(proje TEXT NOT NULL, anahtar TEXT NOT NULL, deger TEXT, cihaz TEXT DEFAULT '', guncellendi TEXT NOT NULL, PRIMARY KEY(proje, anahtar))")
c.execute("CREATE TABLE IF NOT EXISTS foto(proje TEXT NOT NULL, fid TEXT NOT NULL, veri TEXT, tur TEXT DEFAULT 'img', guncellendi TEXT NOT NULL, PRIMARY KEY(proje, fid))")
kv = foto = 0
try:
    d = json.load(open(Y + "/saha_kv.json"))
    for r in d["satirlar"]:
        cur = c.execute("INSERT INTO kv(proje,anahtar,deger,cihaz,guncellendi) VALUES(?,?,?,?,?) ON CONFLICT(proje,anahtar) DO NOTHING",
                        (r["proje"], r["anahtar"], r.get("deger"), r.get("cihaz") or "", r.get("guncellendi") or d["alindi"]))
        kv += cur.rowcount
    d = json.load(open(Y + "/saha_foto.json"))
    for r in d["satirlar"]:
        cur = c.execute("INSERT INTO foto(proje,fid,veri,tur,guncellendi) VALUES(?,?,?,?,?) ON CONFLICT(proje,fid) DO NOTHING",
                        (r["proje"], r["fid"], r.get("veri"), r.get("tur") or "img", r.get("guncellendi") or d["alindi"]))
        foto += cur.rowcount
    c.commit()
    print("NOT: yedekten aktarıldı · yeni kv", kv, "· yeni foto", foto)
except Exception as e:
    print("NOT: UYARI yedekten aktarım yapılamadı:", str(e)[:200])
print("NOT: tabloda kv", c.execute("select count(*) from kv").fetchone()[0], "· foto", c.execute("select count(*) from foto").fetchone()[0])
PY
chown 1001:1001 $DB $DB-wal $DB-shm 2>/dev/null
echo "NOT: yedek tarihi: kv $(python3 -c "import json;print(json.load(open('/opt/depolar/Saha_yedek/saha_kv.json'))['alindi'])" 2>/dev/null) · foto $(python3 -c "import json;print(json.load(open('/opt/depolar/Saha_yedek/saha_foto.json'))['alindi'])" 2>/dev/null)"
