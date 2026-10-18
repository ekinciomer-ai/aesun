// GES-ÇİZ runner (Pyodide). Messages: {id, base, json, pdf} -> {id, stage} | {id, ok, files:{name:Uint8Array}, rapor} | {id, err}
let py = null, mpl = false;
const post = (m, tr) => self.postMessage(m, tr || []);
async function init(base, id) {
  if (py) return;
  post({ id, stage: 'Python ortamı yükleniyor…' });
  importScripts(base + 'py/pyodide.js');
  py = await loadPyodide({ indexURL: base + 'py/' });
  post({ id, stage: 'Paketler yükleniyor (numpy, shapely, ezdxf)…' });
  await py.loadPackage(['numpy', 'shapely', 'pyparsing', 'typing-extensions', 'fonttools']);
  await py.loadPackage(base + 'py/ezdxf-1.3.5-py3-none-any.whl');
  const src = await (await fetch(base + 'py/ges_ciz.py', { cache: 'no-cache' })).text();
  py.FS.mkdirTree('/home/pyodide'); py.FS.writeFile('/home/pyodide/ges_ciz.py', src);
}
self.onmessage = async (e) => {
  const { id, base, json, pdf } = e.data;
  try {
    await init(base, id);
    let usePdf = !!pdf;
    if (usePdf && !mpl) { post({ id, stage: 'PDF için matplotlib yükleniyor…' }); try { await py.loadPackage(['matplotlib']); mpl = true; } catch (x) { usePdf = false; post({ id, stage: 'PDF bu ortamda üretilemiyor; DXF ve metraj üretiliyor…' }); } }
    py.FS.writeFile('/home/pyodide/p.json', new TextEncoder().encode(json));
    post({ id, stage: 'GES-ÇİZ çalışıyor: yerleşim, inverter, trafo, kablo, tek hat, metraj…' });
    const out = await py.runPythonAsync(`
import sys, json, os, shutil, importlib
sys.path.insert(0, '/home/pyodide'); sys.argv = ['ges_ciz']
import shapely
import ges_ciz as g
importlib.reload(g)
g.unary_union = lambda gs: shapely.union_all(list(getattr(gs, 'geoms', gs)), grid_size=0.001)
g.dwg_cevir = lambda p: None
if ${usePdf ? 'True' : 'False'}:
    import matplotlib; matplotlib.use('Agg')
else:
    g.pdf_yaz = lambda *a, **k: None
shutil.rmtree('/home/pyodide/out', ignore_errors=True)
d, r = g.calistir('/home/pyodide/p.json', '/home/pyodide/out')
json.dumps({'d': d, 'r': r}, ensure_ascii=False, default=str)
`);
    const o = JSON.parse(out); const files = {}; const tr = [];
    for (const f of py.FS.readdir(o.d)) { if (f === '.' || f === '..') continue; const b = py.FS.readFile(o.d + '/' + f); files[f] = b; tr.push(b.buffer); }
    post({ id, ok: true, files, rapor: o.r, pdf: usePdf }, tr);
  } catch (err) {
    post({ id, err: String(err && err.message || err).split('\n').slice(-6).join('\n') });
  }
};
