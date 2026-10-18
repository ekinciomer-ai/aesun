#!/usr/bin/env python3
"""cPanel PHP hata kaydının son satırları + disk kotası (yalnız okuma; uzun anahtar benzeri dizeler maskelenir)."""
import json, os, re, ssl, sys, urllib.parse, urllib.request
H, U, T, ALAN = os.environ.get("CP_HOST", "aksarayenerji.net"), os.environ["CP_USER"], os.environ["CP_TOKEN"], os.environ.get("CP_ALAN", "portal.aksarayenerji.net")
ctx = ssl._create_unverified_context()
def istek(yol):
    with urllib.request.urlopen(urllib.request.Request(f"https://{H}:2083/{yol}", headers={"Authorization": f"cpanel {U}:{T}"}), context=ctx, timeout=60) as r:
        return json.loads(r.read().decode())
d = istek("execute/DomainInfo/single_domain_data?" + urllib.parse.urlencode({"domain": ALAN}))["data"]
try:
    q = istek("execute/Quota/get_quota_info")["data"]
    print(f"::notice title=kota::kullanılan {q.get('megabytes_used')} MB / sınır {q.get('megabyte_limit')} MB · dosya {q.get('inodes_used')} / {q.get('inode_limit')}")
except Exception as e:
    print("::notice title=kota::okunamadı", e)
gizli = re.compile(r"[A-Za-z0-9+/=_\-]{32,}")
for alt in sys.argv[1:] or ["api/error_log"]:
    yol, ad = d["documentroot"] + "/" + alt.rsplit("/", 1)[0], alt.rsplit("/", 1)[1]
    try:
        c = istek("execute/Fileman/get_file_content?" + urllib.parse.urlencode({"dir": yol, "file": ad}))["data"]["content"]
    except Exception as e:
        print(f"::notice title={alt}::okunamadı {e}"); continue
    s = [gizli.sub("***", x.strip())[:300] for x in c.splitlines() if x.strip()][-12:]
    for i in range(0, len(s), 3):
        print(f"::notice title={alt} son::" + " ⏎ ".join(s[i:i + 3]))
