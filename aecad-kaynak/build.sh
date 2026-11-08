#!/bin/bash
set -e
cd "$(dirname "$0")"
mkdir -p out/dist out/wasm
L=../lw/node_modules/@mlightcad/libredwg-web
cp $L/dist/libredwg-web.js out/dist/
cp $L/wasm/libredwg-web.js $L/wasm/libredwg-web.wasm out/wasm/
cp worker.js out/gesciz-worker.js
PY=../pyo/pyodide
mkdir -p out/py out_portal/py
for f in pyodide.js pyodide.asm.js pyodide.asm.wasm python_stdlib.zip pyodide-lock.json numpy-1.26.4-cp312-cp312-pyodide_2024_0_wasm32.whl shapely-2.0.2-cp312-cp312-pyodide_2024_0_wasm32.whl pyparsing-3.1.2-py3-none-any.whl typing_extensions-4.11.0-py3-none-any.whl fonttools-4.51.0-py3-none-any.whl ezdxf-1.3.5-py3-none-any.whl cycler-0.12.1-py3-none-any.whl kiwisolver-1.4.5-cp312-cp312-pyodide_2024_0_wasm32.whl pillow-10.2.0-cp312-cp312-pyodide_2024_0_wasm32.whl python_dateutil-2.9.0.post0-py2.py3-none-any.whl pytz-2024.1-py2.py3-none-any.whl six-1.16.0-py2.py3-none-any.whl packaging-23.2-py3-none-any.whl; do cp -u $PY/$f out/py/; done
# matplotlib: inceltilmiş tekerlek (yalnız DejaVu Sans, örnek veri/test yok) — PDF paftalar için
mkdir -p out/py/mpl && cp -u ../pyo/mplslim/matplotlib-3.5.2-cp312-cp312-pyodide_2024_0_wasm32.whl out/py/mpl/
cp ../pyo/ges_ciz.py out/py/
mkdir -p out/lib && cp ../lw/node_modules/pdfjs-dist/build/pdf.min.js ../lw/node_modules/pdfjs-dist/build/pdf.worker.min.js out/lib/
{ cat shell.html; echo '<script>'; cat ../lw/node_modules/polygon-clipping/dist/polygon-clipping.umd.min.js; echo; echo '</script>'; echo '<script>'; echo '"use strict";'; for f in core acds sab doc items render dxf app ges gesui gesproj gesalt gesduzen gesdwg cephe tasarim tarif pencere main; do cat src/$f.js; echo; done; echo 'window.addEventListener("DOMContentLoaded", init);'; echo '</script>'; } > out/index.html
sed -i "s/__BUILD__/$(date +%y%m%d%H%M)/" out/index.html
node -e "const s=require('fs').readFileSync('out/index.html','utf8');const i=s.lastIndexOf('<script>');const b=s.slice(i+8,s.lastIndexOf('</script>'));try{new Function(b);console.log('syntax ok',s.length)}catch(e){console.log('SYNTAX',e.message)}"

# portal variant (portal.aksarayenerji.net/cad/): login gate via portal session
mkdir -p out_portal && cp -r out/dist out/wasm out/lib out_portal/ && cp out/gesciz-worker.js out_portal/ && cp -ru out/py out_portal/
python3 - <<'PY'
s=open('out/index.html',encoding='utf-8').read()
gate="""<script>(function(){var S=null;try{var o=JSON.parse(localStorage.getItem('ae_portal')||'null');if(o&&o.S&&Date.now()<(o.son||0))S=o.S;}catch(e){}if(!S||!(S.ka||(S.anahtarlar&&S.anahtarlar.cad))){location.replace('../portal/?git=cad');return;}window.AE_PORTAL=S;})();</script>
"""
i=s.index('</title>')+len('</title>')
s=s[:i]+'\n'+gate+s[i:]
s=s.replace('<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">','<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">\n<meta name="robots" content="noindex">',1)
s='<!doctype html>\n<html lang="tr">\n'+s+'</html>\n'
open('out_portal/index.html','w',encoding='utf-8').write(s)
PY
