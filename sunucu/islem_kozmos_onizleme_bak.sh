#!/bin/bash
# Yalnız okur: Kozmos arşivinin küçük önizlemeleri + manifest, iş günlüğüne paket olarak basılır (galeri sayfası için).
# Diske kalıcı bir şey yazmaz; içerik yalnız görsel adı/ölçü/kredi bilgisi ve küçük resimlerdir.
python3 -I - <<'P'
import json,io,os,base64,gzip
from PIL import Image
Image.MAX_IMAGE_PIXELS=None
H="/var/kozmos/arsiv"; m=json.load(open(H+"/manifest.json")); out=[]
for x in m:
    kay=os.path.join(H,x["turev"].get("4k") or x["turev"].get("dikey") or x["dosya"])
    try:
        with Image.open(kay) as im:
            if im.format=="JPEG": im.draft("RGB",(1200,1200))
            im=im.convert("RGB"); im.thumbnail((720,720),Image.LANCZOS)
            b=io.BytesIO(); im.save(b,"JPEG",quality=72,optimize=True,progressive=True)
            x=dict(x); x["onizleme"]=base64.b64encode(b.getvalue()).decode()
    except Exception as e:
        x=dict(x); x["onizleme"]=""; x["onizleme_hata"]=str(e)[:80]
    out.append(x)
p=base64.b64encode(gzip.compress(json.dumps(out,ensure_ascii=False).encode())).decode()
print("KOZMOS_PAKET_BASLA")
for i in range(0,len(p),4000): print(p[i:i+4000])
print("KOZMOS_PAKET_BITTI")
print(f"NOT: önizleme paketi: {len(out)} görsel, {len(p)//1024} KB")
P
