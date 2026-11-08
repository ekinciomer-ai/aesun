#!/bin/bash
# n8n toplayıcı anahtarını ns1'de iptal eder (19 Eki: n8n artık sunucuya anahtarla yazmıyor/okumuyor). Yalnız özet dosyası; değer yok.
set -e
docker exec -i aesun-api python - <<'PY'
import json, shutil, time
p = "/veri/anahtarlar.json"
shutil.copy(p, p + ".yedek-" + time.strftime("%Y%m%d%H%M"))
d = json.load(open(p))
d.pop("n8n", None)
json.dump(d, open(p, "w"))
print("NOT: ns1 kalan anahtar adları:", list(d))
PY
