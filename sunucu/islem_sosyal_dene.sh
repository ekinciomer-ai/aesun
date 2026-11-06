#!/bin/bash
# Sosyal Stüdyo uçtan uca deneme. Gerçek hafızaya ve gerçek kuyruğa dokunmaz:
# kapsayıcı içinde geçici veri klasörü (/tmp/dene), işçi için geçici kuyruk (/opt/sosyal/dene_kuyruk).
set -uo pipefail
docker exec sosyal-studyo rm -rf /tmp/dene
T=$(date +%s)
docker exec -i -e SOSYAL_VERI=/tmp/dene -e SOSYAL_KUYRUK=/tmp/dene/kuyruk sosyal-studyo python - <<'PY' > /tmp/sosyal_dene.txt 2>&1
import json, time
from sosyal.uretim import Studyo
s = Studyo()
t = time.time()
oid = s.oturum_ac("youtube_shorts", "tr", "Tarihi Magazin", "Napolyon'un düğün gecesini bir köpek mahvetti")
d = s.uret(oid)
print("NOT: üretim süresi", round(time.time() - t), "sn · motorlar:", sorted({m["motor"] for m in d["mesajlar"] if m["motor"]}))
print("NOT: aşamalar:", [m["asama"] for m in d["mesajlar"]])
print("NOT: denetim:", json.dumps(d["denetim"], ensure_ascii=False)[:400])
for satir in d["son"].splitlines()[:40]:
    if satir.strip(): print("NOT: |", satir[:220])
s.geri_bildirim(oid, "Kancayı bir rakamla aç ve metni 100 kelimenin altında tut")
iid = s.onayla(oid, puan=4)
k = s.kapat(oid)
print("NOT: öğrenilen:", json.dumps(k, ensure_ascii=False)[:600])
print("NOT: hata günlüğü:", [g["ayrinti"][:200] for g in s.h.gunluk_listesi() if "hata" in g["olay"]][:3])
j = s.arac_isi(iid, "ses", "piper")
print("ISJSON", json.dumps(j, ensure_ascii=False))
PY
grep '^NOT:' /tmp/sosyal_dene.txt | cut -c1-400
grep -q ISJSON /tmp/sosyal_dene.txt || { echo "NOT: HATA üretim denemesi: $(tail -5 /tmp/sosyal_dene.txt | tr '\n' ' ' | cut -c1-400)"; exit 1; }
# Piper ses işi geçici kuyrukta
K=/opt/sosyal/dene_kuyruk; rm -rf $K; mkdir -p $K/bekleyen
grep ISJSON /tmp/sosyal_dene.txt | sed 's/^ISJSON //' > $K/bekleyen/dene.json
python3 -c "import json;p='$K/bekleyen/dene.json';j=json.load(open(p));print('NOT: seslendirilecek metin:',j['metin'][:300])"
SOSYAL_KUYRUK_HOST=$K timeout 1200 python3 /opt/sosyal/isci.py
for d in $K/cikti/*/; do echo "NOT: ses işi: $(cat $d/durum.json | tr '\n' ' ' | cut -c1-300)"; ls -la $d | grep mp3 | awk '{print "NOT: ses dosyası "$5" bayt"}'
  [ -f $d/ses.mp3 ] && echo "NOT: ses süresi $(ffprobe -v error -show_entries format=duration -of csv=p=0 $d/ses.mp3) sn"; done
echo "NOT: toplam süre $(( $(date +%s) - T )) sn"
docker exec sosyal-studyo rm -rf /tmp/dene; rm -rf $K /tmp/sosyal_dene.txt
