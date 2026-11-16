#!/bin/bash
# salt okunur: saha.db sayıları
DB=/var/lib/docker/volumes/aesun_aesun_veri/_data/saha.db
python3 - "$DB" <<'PY'
import sqlite3,sys
c=sqlite3.connect("file:"+sys.argv[1]+"?mode=ro",uri=True)
for p,n in c.execute("select proje,count(*) from kv group by proje"): print("NOT: kv",p,n)
print("NOT: arpay",c.execute("select count(*) from kv where anahtar like 'arpay:%' and deger<>'null'").fetchone()[0],"· tombstone",c.execute("select count(*) from kv where deger='null'").fetchone()[0])
print("NOT: foto",c.execute("select count(*), coalesce(sum(length(veri)),0) from foto").fetchone())
print("NOT: en buyuk kv KB",c.execute("select max(length(deger))/1024 from kv").fetchone()[0])
PY
