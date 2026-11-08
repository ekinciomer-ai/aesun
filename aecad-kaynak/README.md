# AeCAD kaynak

Canlı: `docs/aecad/` (portal.aksarayenerji.net/aecad/). Bu klasör derleme öncesi parçalı kaynaktır.

- `shell.html` + `src/*.js` → `build.sh` tek `index.html` üretir (modül sırası build.sh içinde).
- `worker.js` → `gesciz-worker.js` (Pyodide, `py/ges_ciz.py`).
- Bağımlılıklar (`../lw/node_modules`): `@mlightcad/libredwg-web`, `pdfjs-dist`, `polygon-clipping`. Pyodide paketleri ve ince matplotlib tekerleği `docs/aecad/py/` içinde.
- `ges_ciz.py` tek kaynağı GES-ÇİZ artifact'ıdır; `docs/aecad/py/ges_ciz.py` onun kopyasıdır.

Yayın: `./build.sh` → `out_portal/.` → `docs/aecad/` → push → `cpanel_yukle.yml`.
