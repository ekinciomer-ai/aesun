#!/usr/bin/env python3
"""cPanel PHP sürümü (alan başına) ve kök .htaccess'teki PHP işleyici satırları (yalnız okuma)."""
import json, os, ssl, urllib.parse, urllib.request
H, U, T = os.environ.get("CP_HOST", "aksarayenerji.net"), os.environ["CP_USER"], os.environ["CP_TOKEN"]
ctx = ssl._create_unverified_context()
def istek(yol):
    with urllib.request.urlopen(urllib.request.Request(f"https://{H}:2083/{yol}", headers={"Authorization": f"cpanel {U}:{T}"}), context=ctx, timeout=60) as r:
        return json.loads(r.read().decode())
try:
    v = istek("execute/LangPHP/php_get_vhost_versions")["data"]
    print("::notice title=php sürümleri::" + " · ".join(f"{x.get('vhost')}={x.get('version')}({'miras' if x.get('php_fpm') is None else ''}{x.get('phpversion_source',{}) if isinstance(x.get('phpversion_source'),str) else ''})" for x in v)[:900])
except Exception as e:
    print("::notice title=php sürümleri::okunamadı", e)
try:
    print("::notice title=sistem varsayılanı::" + json.dumps(istek("execute/LangPHP/php_get_system_default_version")["data"]))
    print("::notice title=kurulu::" + json.dumps(istek("execute/LangPHP/php_get_installed_versions")["data"])[:400])
except Exception as e:
    print("::notice::", e)
for alan in ("portal.aksarayenerji.net",):
    d = istek("execute/DomainInfo/single_domain_data?" + urllib.parse.urlencode({"domain": alan}))["data"]
    c = istek("execute/Fileman/get_file_content?" + urllib.parse.urlencode({"dir": d["documentroot"], "file": ".htaccess"}))["data"]["content"]
    print(f"::notice title={alan} .htaccess php satırları::" + " ⏎ ".join(s for s in c.splitlines() if "php" in s.lower())[:800] or "yok")
