#!/usr/bin/env python3
"""cPanel'deki bir PHP dosyasının YAPISINI özetler (fonksiyon, eylem, oturum satırları). Sır içerebilecek satırlar yazılmaz."""
import json, os, re, ssl, sys, urllib.parse, urllib.request
H, U, T, ALAN = os.environ.get("CP_HOST", "aksarayenerji.net"), os.environ["CP_USER"], os.environ["CP_TOKEN"], os.environ.get("CP_ALAN", "portal.aksarayenerji.net")
ctx = ssl._create_unverified_context()
def istek(yol):
    with urllib.request.urlopen(urllib.request.Request(f"https://{H}:2083/{yol}", headers={"Authorization": f"cpanel {U}:{T}"}), context=ctx, timeout=60) as r:
        return json.loads(r.read().decode())
d = istek("execute/DomainInfo/single_domain_data?" + urllib.parse.urlencode({"domain": ALAN}))["data"]
kok = d["documentroot"]
for alt in sys.argv[1:]:
    yol = kok + "/" + alt.rsplit("/", 1)[0] if "/" in alt else kok
    ls = istek("execute/Fileman/list_files?" + urllib.parse.urlencode({"dir": yol}))
    print("::notice title=klasör " + yol.replace(d["homedir"], "~") + "::" + " ".join(f.get("file", "") for f in (ls.get("data") or []))[:900])
    try:
        c = istek("execute/Fileman/get_file_content?" + urllib.parse.urlencode({"dir": yol, "file": alt.rsplit("/", 1)[-1]}))["data"]["content"]
    except Exception as e:
        print(f"::notice title={alt}::okunamadı {e}"); continue
    gizli = re.compile(r"(pass|sifre|şifre|secret|token|key|anahtar|salt|tuz)\s*[=:]", re.I)
    sat = [s.strip() for s in c.splitlines() if re.search(r"function |case |\$_(GET|POST|COOKIE|SERVER)\[|setcookie|session_|header\(|hash_|file_get_contents|json_decode\(\s*file", s) and not gizli.search(s)]
    print(f"::notice title={alt} ({len(c.splitlines())} satır)::" + " ¦ ".join(x[:110] for x in sat[:60])[:3800])
