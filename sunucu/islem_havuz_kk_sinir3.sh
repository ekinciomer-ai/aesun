#!/bin/bash
# Yükleme Yöneticisi: Kara Kutu (KK_TR) günde 3 yayın · Ömer onayı 22.11.2026. Önce yedek alır, diğer kanallara dokunmaz.
set -e
F=/opt/aesun/havuz/sinirlar.json
[ -f "$F" ] && cp "$F" "$F.yedek_$(date +%Y%m%d_%H%M%S)" && echo "NOT: yedek alındı"
python3 - "$F" <<'PY'
import json,sys,os
f=sys.argv[1];d=json.load(open(f,encoding='utf-8')) if os.path.exists(f) else {}
k=d.get("KK_TR",{});print("önce KK_TR:",k)
k.update({"gunluk":3,"ara_saat":3,"saatler":["12:30","16:30","20:30"],"not":"Ömer onayı 22.11.2026: günde 3 yayın"})
d["KK_TR"]=k;tmp=f+".tmp";json.dump(d,open(tmp,"w",encoding="utf-8"),ensure_ascii=False,indent=1);os.replace(tmp,f)
print("sonra KK_TR:",d["KK_TR"])
PY
python3 /opt/aesun/havuz/yonetici.py planla | grep -E "KK_MIT|KK_TR" || true
