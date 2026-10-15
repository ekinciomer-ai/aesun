#!/usr/bin/env python3
"""Tek dosyayı bir alan adının kök klasöründeki alt klasöre yükler (cPanel UAPI). Kullanım: tek_yukle.py <yerel> <alt_klasör>"""
import io, json, os, ssl, sys, urllib.parse, urllib.request, uuid
H, U, T, ALAN = os.environ.get("CP_HOST", "aksarayenerji.net"), os.environ["CP_USER"], os.environ["CP_TOKEN"], os.environ["CP_ALAN"]
ctx = ssl._create_unverified_context()
def istek(yol, veri=None, tip=None):
    h = {"Authorization": f"cpanel {U}:{T}"}
    if tip: h["Content-Type"] = tip
    with urllib.request.urlopen(urllib.request.Request(f"https://{H}:2083/{yol}", data=veri, headers=h), context=ctx, timeout=120) as r:
        return json.loads(r.read().decode())
d = istek("execute/DomainInfo/single_domain_data?" + urllib.parse.urlencode({"domain": ALAN}))["data"]
kok = d["documentroot"][len(d["homedir"]):].strip("/")
yerel, alt = sys.argv[1], sys.argv[2].strip("/")
try:
    istek("json-api/cpanel?" + urllib.parse.urlencode({"cpanel_jsonapi_version": 2, "cpanel_jsonapi_module": "Fileman", "cpanel_jsonapi_func": "mkdir", "path": kok, "name": alt}))
except Exception:
    pass
s = uuid.uuid4().hex; b = io.BytesIO()
for k, v in (("dir", kok + "/" + alt), ("overwrite", "1")):
    b.write(f"--{s}\r\nContent-Disposition: form-data; name=\"{k}\"\r\n\r\n{v}\r\n".encode())
b.write(f"--{s}\r\nContent-Disposition: form-data; name=\"file-1\"; filename=\"{os.path.basename(yerel)}\"\r\nContent-Type: application/json\r\n\r\n".encode())
b.write(open(yerel, "rb").read()); b.write(f"\r\n--{s}--\r\n".encode())
j = istek("execute/Fileman/upload_files", b.getvalue(), f"multipart/form-data; boundary={s}")
print("::notice::" + ("yüklendi: " if j.get("status") else "HATA: ") + f"{ALAN}/{alt}/{os.path.basename(yerel)} {os.path.getsize(yerel)} bayt {j.get('errors') or ''}")
