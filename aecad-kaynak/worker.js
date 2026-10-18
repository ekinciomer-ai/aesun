// GES-ÇİZ runner (Pyodide). Messages: {id, base, json, pdf} -> {id, stage} | {id, ok, files:{name:Uint8Array}, rapor} | {id, err}
let py = null, mpl = false, mplP = null;
const post = (m, tr) => self.postMessage(m, tr || []);
async function init(base, id) {
  if (py) return;
  post({ id, stage: 'Python ortamı yükleniyor…' });
  importScripts(base + 'py/pyodide.js');
  py = await loadPyodide({ indexURL: base + 'py/', stdout: () => {} });
  post({ id, stage: 'Paketler yükleniyor (numpy, shapely, ezdxf)…' });
  await py.loadPackage(['numpy', 'shapely', 'pyparsing', 'typing-extensions', 'fonttools']);
  await py.loadPackage(base + 'py/ezdxf-1.3.5-py3-none-any.whl');
  const src = await (await fetch(base + 'py/ges_ciz.py', { cache: 'no-cache' })).text();
  mplYukle(base);   // PDF modülü arka planda iner; yerleşim hesabıyla aynı anda
  py.FS.mkdirTree('/home/pyodide'); py.FS.writeFile('/home/pyodide/ges_ciz.py', src);
}
function mplYukle(base) {
  if (!mplP) mplP = (async () => { await py.loadPackage(['cycler', 'kiwisolver', 'pillow', 'python-dateutil', 'pytz', 'six', 'packaging'], { messageCallback: () => {} }); await py.loadPackage(base + 'py/mpl/matplotlib-3.5.2-cp312-cp312-pyodide_2024_0_wasm32.whl', { messageCallback: () => {} }); await py.runPythonAsync("import matplotlib; matplotlib.use('Agg'); import matplotlib.pyplot; from matplotlib.backends.backend_pdf import PdfPages"); mpl = true; })();
  return mplP;
}
async function yerlesim(id, json) {
  // Aşama 1: yalnız yerleşim (model + 01 genel + 04 kablo planı), alternatif karşılaştırması için hızlı
  py.FS.writeFile('/home/pyodide/p.json', new TextEncoder().encode(json));
  post({ id, stage: 'Yerleşim hesaplanıyor (masa, iç yol, inverter, trafo, kablo güzergâhı)…' });
  const out = await py.runPythonAsync(`
import sys, json, os, shutil, importlib, datetime
sys.path.insert(0, '/home/pyodide'); sys.argv = ['ges_ciz']
import shapely
import ges_ciz as g
importlib.reload(g)
g.unary_union = lambda gs: shapely.union_all(list(getattr(gs, 'geoms', gs)), grid_size=0.001)
P = g.birlestir(g.VARSAYILAN, json.load(open('/home/pyodide/p.json', encoding='utf-8')))
P["proje"]["tarih"] = P["proje"]["tarih"] or datetime.date.today().strftime("%d.%m.%Y")
M = g.Model(P).kur()
d = '/home/pyodide/yer'; shutil.rmtree(d, ignore_errors=True); os.makedirs(d)
kod, rev = P["proje"]["kod"], P["proje"]["revizyon"]
pf1 = g.pafta_yerlesim(M, P["proje"]["seviye"]); pf4 = g.pafta_kablo(M); pf1.toplam = pf4.toplam = 2
g.dxf_yaz(M, pf1, d + f"/{kod}_01_GENEL_{rev}.dxf"); g.dxf_yaz(M, pf4, d + f"/{kod}_04_KABLO_{rev}.dxf")
smax = max(M.stringler, key=lambda s: s["dc_tek_yon_m"]); imax = max(M.inverterler, key=lambda i: i["ac_m"])
oz = {"masa": len(M.masalar), "modul": len(M.masalar) * M.masa_modul, "string": len(M.stringler), "inverter": len(M.inverterler), "tm": M.n_tr,
      "ic_yol": len(M.ic_yollar), "dc_lim": round(M.dc_lim, 1), "dc_max": round(smax["dc_tek_yon_m"], 1), "ac_max": round(imax["ac_m"], 0),
      "yol_gecis": len(M.yol_gecis), "kesisim": len(M.kesisim), "cekme": M.cekme,
      "inv_kw": M.P["elektrik"].get("inverter_ac_kw"), "ac_kw": sum((i.get("ac_kw") or M.P["elektrik"].get("inverter_ac_kw") or 0) for i in M.inverterler),
      "tr_kva": list(getattr(M, "tr_kva", None) or [M.P["elektrik"].get("trafo_kva")] * M.n_tr), "cikis_kw": round(sum(M.tr_ac(t) for t in range(M.n_tr)))}
nes = {"tm": [{"ad": f"TM{t+1}", "x": M.W(q).centroid.x, "y": M.W(q).centroid.y} for t, q in enumerate(M.tm_loc)],
       "dm": {"x": M.W(M.dm_loc).centroid.x, "y": M.W(M.dm_loc).centroid.y},
       "inv": [{"ad": i["ad"], "x": M.Wp(i["x"], i["y"])[0], "y": M.Wp(i["x"], i["y"])[1]} for i in M.inverterler],
       "yol": [{"no": r["no"], "elle": bool(r.get("elle")), "pts": [list(c) for c in M.W(r["eksen"] if r["eksen"].geom_type == "LineString" else max(getattr(r["eksen"], "geoms", [r["eksen"]]), key=lambda g: g.length)).coords]} for r in M.ic_yollar]}
json.dumps({'d': d, 'oz': oz, 'nes': nes, 'kontrol': M.kontrol, 'metraj': M.metraj, 'uyari': M.uyari}, ensure_ascii=False, default=str)
`);
  const o = JSON.parse(out); const files = {}; const tr = [];
  for (const f of py.FS.readdir(o.d)) { if (f === '.' || f === '..') continue; const b = py.FS.readFile(o.d + '/' + f); files[f] = b; tr.push(b.buffer); }
  post({ id, ok: true, yer: true, files, oz: o.oz, nes: o.nes, kontrol: o.kontrol, metraj: o.metraj, uyari: o.uyari }, tr);
}
self.onmessage = async (e) => {
  const { id, base, json, pdf, mode } = e.data;
  try {
    await init(base, id);
    if (mode === 'yer') { await yerlesim(id, json); return; }
    let usePdf = !!pdf;
    if (usePdf && !mpl) {
      post({ id, stage: 'PDF modülü hazırlanıyor (ilk seferde ~7 MB, sonra önbellekten)…' });
      try { await Promise.race([mplYukle(base), new Promise((_, rj) => setTimeout(() => rj(new Error('zaman aşımı')), 120000))]); }
      catch (x) { usePdf = false; console.warn('mpl', x); post({ id, stage: 'PDF modülü yüklenemedi (' + (x && x.message || x) + '); DXF ve metraj üretiliyor…' }); }
    }
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
