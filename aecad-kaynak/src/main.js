// ---- bootstrap, events, file io ----
let _lib = null;
async function libre() {
  if (_lib) return _lib;
  const base = new URL('./', document.baseURI).href;
  let mod;
  try { mod = await import(base + 'dist/libredwg-web.js'); }
  catch (e) { mod = await import('https://cdn.jsdelivr.net/npm/@mlightcad/libredwg-web@0.7.14/dist/libredwg-web.js'); }
  _lib = { mod, inst: await mod.LibreDwg.create(base + 'wasm') };
  return _lib;
}
function busy(t) { const b = $('#busy'); if (t) { b.hidden = false; $('#busyt').textContent = t; } else b.hidden = true; }
const tick = () => new Promise((r) => setTimeout(r, 16));

function setDoc(doc, name) {
  S.doc = doc; V().doc = doc; doc.name = name; V().sel = new Set(); S.curLayer = doc.layers.has('0') ? '0' : [...doc.layers.keys()][0];
  $('#fname').textContent = name; document.title = name + ' · AeCAD';
  renderLayers(); updateProps(); zoomExtents(false); S.fitPending = true; redraw();
}
async function openFile(file) {
  if (S.cmd) cancelCmd();
  const ext = (file.name.split('.').pop() || '').toLowerCase();
  try {
    busy('Dosya okunuyor…'); await tick();
    const buf = new Uint8Array(await file.arrayBuffer());
    let norm; const t0 = performance.now();
    if (ext === 'dxf') { busy('DXF çözümleniyor…'); await tick(); norm = parseDxf(decodeDxfBytes(buf)); }
    else if (ext === 'dwg') {
      const sig = String.fromCharCode(...buf.subarray(0, 6));
      if (!/^AC10(1[2-9]|2\d|3\d)/.test(sig)) throw new Error('Bu DWG sürümü (' + sig + ') desteklenmiyor. AutoCAD R14 (1997) ve sonrası açılabilir.');
      busy('DWG okuyucu yükleniyor…'); await tick();
      const L = await libre();
      busy('DWG çözümleniyor…'); await tick();
      const dwg = L.inst.dwg_read_data(buf.slice(0).buffer, L.mod.Dwg_File_Type.DWG);
      if (!dwg) throw new Error('DWG dosyası okunamadı.');
      busy('Nesneler dönüştürülüyor…'); await tick();
      const db = L.inst.convert(dwg); try { L.inst.dwg_free(dwg); } catch (e) { /* ignore */ }
      let solids = new Map();
      if (sig >= 'AC1018') {
        busy('3B katılar (paneller, kazıklar) çözülüyor…'); await tick();
        try {
          const r = readSections(buf); const ds = r.getSection('AcDb:AcDsPrototype_1b');
          if (ds && ds.length) { const raw = extractSolids(ds); for (const [h, u] of raw) { try { solids.set(h, sabEdges(u)); } catch (e) { /* skip */ } } }
        } catch (e) { console.warn('AcDs', e); }
      }
      norm = normalizeDwg(db, solids);
    } else throw new Error('Yalnızca .dwg ve .dxf dosyaları açılabilir.');
    busy('Bloklar derleniyor…'); await tick();
    const doc = importNormalized(norm);
    setDoc(doc, file.name.replace(/\.(dwg|dxf)$/i, ''));
    const ns = norm.solids ? norm.solids.size : 0;
    msg(file.name + ' açıldı: ' + doc.items.size.toLocaleString('tr') + ' nesne, ' + doc.blocks.size + ' blok, ' + doc.layers.size + ' katman' + (ns ? ', ' + ns.toLocaleString('tr') + ' 3B katı' : '') + ' · ' + ((performance.now() - t0) / 1000).toFixed(1) + ' sn', 'res');
  } catch (e) { console.error(e); msg('Açılamadı: ' + (e.message || e), 'err'); toast('Dosya açılamadı'); }
  finally { busy(null); }
}
async function saveDxf() {
  if (!S.doc) return;
  busy('DXF hazırlanıyor…'); await tick();
  try {
    const txt = writeDxf(S.doc); const data = new TextEncoder().encode(txt);
    const name = (S.doc.name || 'cizim').replace(/[\\/:*?"<>|]/g, '_');
    let dl = null; try { dl = window.claude && window.claude.use ? await window.claude.use('downloads') : null; } catch (e) { dl = null; }
    if (dl) {
      const zip = zipStore(name + '.dxf', data);
      busy(null);
      try { await dl.save({ filename: name + '.zip', data: zip }); msg(name + '.zip kaydedildi (içinde ' + name + '.dxf).', 'res'); S.doc.dirty = false; }
      catch (e) { if (e && e.code === 'declined') msg('Kaydetme iptal edildi.'); else msg('Kaydedilemedi: ' + (e && (e.message || e.code) || e), 'err'); }
    } else {
      const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([data], { type: 'application/dxf' })); a.download = name + '.dxf'; document.body.appendChild(a); a.click(); a.remove();
      msg(name + '.dxf indirildi.', 'res'); S.doc.dirty = false;
    }
  } finally { busy(null); }
}

// sample drawing: small GES block layout (example)
function sampleDoc() {
  const doc = new Doc(); doc.ctx = { blocks: doc.blocks, solids: doc.solids };
  doc.addLayer('ORNEK-PANEL', 5); doc.addLayer('ORNEK-CIT', 3, 'DASHED'); doc.addLayer('ORNEK-YOL', 8); doc.addLayer('ORNEK-YAZI', 7); doc.addLayer('ORNEK-OLCU', 2); doc.addLayer('ORNEK-TRAFO', 1);
  // block: table 2x13 modules (2.384 x 1.303), portrait
  const ents = []; const mw = 1.134, mh = 2.384, gap = 0.02;
  for (let r = 0; r < 2; r++) for (let c = 0; c < 13; c++) { const x = c * (mw + gap), y = r * (mh + gap); ents.push({ type: 'LWPOLYLINE', layer: '0', colorIndex: 256, flag: 1, vertices: [{ x, y }, { x: x + mw, y }, { x: x + mw, y: y + mh }, { x, y: y + mh }] }); }
  const W = 13 * (mw + gap) - gap, H = 2 * (mh + gap) - gap;
  ents.push({ type: 'LINE', layer: '0', colorIndex: 8, startPoint: { x: 0, y: H / 2 }, endPoint: { x: W, y: H / 2 } });
  doc.blocks.set('MASA_2x13', { name: 'MASA_2x13', base: [0, 0, 0], ents });
  const items = [];
  const add = (o) => { const it = { id: newId(), lt: '', c: 256, ...o }; items.push(it); };
  const ox = 0, oy = 0, pitch = 9.5;
  for (let row = 0; row < 6; row++) for (let col = 0; col < 3; col++) add({ t: 'insert', layer: 'ORNEK-PANEL', block: 'MASA_2x13', M: mT(ox + col * (W + 4), oy + row * pitch), ap: [] });
  const fx0 = -6, fy0 = -8, fx1 = 3 * (W + 4) + 2, fy1 = 6 * pitch + 3;
  add({ t: 'pline', layer: 'ORNEK-CIT', cl: true, pts: [[fx0, fy0, 0], [fx1, fy0, 0], [fx1, fy1, 0], [fx0, fy1, 0]] });
  add({ t: 'pline', layer: 'ORNEK-YOL', cl: false, pts: [[fx0 + 2, fy0 + 2.5, 0], [fx1 - 2, fy0 + 2.5, 0]] });
  add({ t: 'pline', layer: 'ORNEK-YOL', cl: false, pts: [[fx0 + 2, fy0 + 6.5, 0], [fx1 - 14, fy0 + 6.5, 0], [fx1 - 10, fy0 + 2.5, 0.0]] });
  add({ t: 'pline', layer: 'ORNEK-TRAFO', cl: true, pts: [[fx1 - 9, fy0 + 3.5, 0], [fx1 - 3, fy0 + 3.5, 0], [fx1 - 3, fy0 + 6.5, 0], [fx1 - 9, fy0 + 6.5, 0]] });
  add({ t: 'text', layer: 'ORNEK-TRAFO', x: fx1 - 6, y: fy0 + 5, h: 0.8, rot: 0, s: 'TRAFO', ha: 1, va: 2 });
  add({ t: 'circle', layer: 'ORNEK-TRAFO', cx: fx1 - 12, cy: fy0 + 5, r: 0.9 });
  add({ t: 'text', layer: 'ORNEK-YAZI', x: fx0, y: fy1 + 3, h: 2, rot: 0, s: 'ÖRNEK ÇİZİM · GES Blok A (18 masa · 468 modül)', ha: 0, va: 0 });
  add({ t: 'text', layer: 'ORNEK-YAZI', x: fx0, y: fy1 + 1, h: 0.9, rot: 0, s: 'Kendi DWG/DXF dosyanızı açmak için üstteki “Aç” düğmesini kullanın veya dosyayı buraya sürükleyin.', ha: 0, va: 0 });
  add({ t: 'dim', layer: 'ORNEK-OLCU', x1: fx0, y1: fy0, x2: fx1, y2: fy0, lx: 0, ly: fy0 - 4, ang: 0, h: 1.2 });
  add({ t: 'dim', layer: 'ORNEK-OLCU', x1: fx1, y1: fy0, x2: fx1, y2: fy1, lx: fx1 + 4, ly: 0, ang: Math.PI / 2, h: 1.2 });
  add({ t: 'dim', layer: 'ORNEK-OLCU', x1: 0, y1: pitch, x2: 0, y2: 2 * pitch, lx: -3, ly: 0, ang: Math.PI / 2, h: 0.8 });
  for (const it of items) doc.items.set(it.id, it);
  return doc;
}

function init() {
  const view = new View($('#scene'), $('#overlay')); S.view = view; view.gridOn = false;
  buildPalette();
  gesInit();
  pjInit(); pjDuzenInit(); cepheInit(); pencereInit();
  if (window.AE_PORTAL) { const P = window.AE_PORTAL; const box = document.createElement('div'); box.className = 'pbadge';
    const nm = document.createElement('span'); nm.textContent = P.ad || P.kul || ''; const a = document.createElement('a'); a.href = '../portal/'; a.textContent = 'Portal';
    const c = document.createElement('a'); c.href = '#'; c.textContent = 'Çıkış'; c.onclick = (e) => { e.preventDefault(); try { localStorage.removeItem('ae_portal'); } catch (x) { /* ignore */ } location.replace('../portal/'); };
    box.append(nm, a, c); document.querySelector('header').insertBefore(box, document.querySelector('.hbtns')); }
  const resize = () => { view.resize(); if (S.fitPending) zoomExtents(false); redraw(); };
  new ResizeObserver(resize).observe($('#stage')); resize();
  blankDoc('Yeni çizim'); S.doc.isSample = true; tarifInit();
  msg('AeCAD hazır. Komut yazın (ör. L, PL, C, M) veya soldaki araçları kullanın. Kısayollar için ? yazın.', 'note');
  setPrompt('Komut:');
  setTimeout(() => { libre().then(() => { S.libOk = true; }).catch((e) => { console.error(e); msg('DWG okuyucu yüklenemedi (' + (e.message || e) + '). DXF dosyaları yine açılabilir.', 'err'); }); }, 1200);

  const st = $('#stage'), ov = $('#overlay');
  const pos = (e) => { const r = ov.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
  ov.addEventListener('wheel', (e) => {
    e.preventDefault(); S.fitPending = false; const [X, Y] = pos(e); const [wx, wy] = view.s2w(X, Y);
    const f = Math.exp(-Math.max(-60, Math.min(60, e.deltaY)) * (e.ctrlKey ? 0.01 : 0.0035) * (e.deltaMode === 1 ? 16 : 1));
    view.s *= f; view.cx = wx - (X - view.W / 2) / view.s; view.cy = wy + (Y - view.H / 2) / view.s;
    view.fast = view.lastMs > 45; redraw(); clearTimeout(init._wt); init._wt = setTimeout(() => { view.fast = false; redraw(); }, 180);
  }, { passive: false });
  let touches = new Map();
  ov.addEventListener('pointerdown', (e) => {
    ov.setPointerCapture(e.pointerId); S.fitPending = false; const [X, Y] = pos(e); S.mouse = [X, Y]; S.inside = true;
    if (e.pointerType === 'touch') { touches.set(e.pointerId, [X, Y]); if (touches.size === 2) { S.dragging = { kind: 'pinch' }; return; } }
    if (e.button === 1 || (e.button === 0 && e.shiftKey && e.altKey) || (e.button === 0 && S.space)) { S.dragging = { kind: 'pan', X, Y, cx: view.cx, cy: view.cy }; e.preventDefault(); return; }
    if (e.button === 2) return;
    if (e.button !== 0) return;
    if (S.pending && S.pending.kind === 'point') { S.dragging = { kind: 'click', X, Y }; return; }
    S.dragging = { kind: 'maybe', x0: X, y0: Y, x1: X, y1: Y, shift: e.shiftKey, touch: e.pointerType === 'touch', cx: view.cx, cy: view.cy };
  });
  ov.addEventListener('pointermove', (e) => {
    const [X, Y] = pos(e); S.mouse = [X, Y]; S.inside = true;
    const d = S.dragging;
    if (d && d.kind === 'pinch') {
      const prev = touches.get(e.pointerId); if (!prev) return; const pts = [...touches.values()]; const before = Math.hypot(pts[0][0] - pts[1][0], pts[0][1] - pts[1][1]);
      touches.set(e.pointerId, [X, Y]); const p2 = [...touches.values()]; const after = Math.hypot(p2[0][0] - p2[1][0], p2[0][1] - p2[1][1]);
      const mx = (p2[0][0] + p2[1][0]) / 2, my = (p2[0][1] + p2[1][1]) / 2; const [wx, wy] = view.s2w(mx, my);
      if (before > 0) view.s *= after / before; view.cx = wx - (mx - view.W / 2) / view.s; view.cy = wy + (my - view.H / 2) / view.s;
      const dx = X - prev[0], dy = Y - prev[1]; view.cx -= dx / 2 / view.s; view.cy += dy / 2 / view.s; view.fast = true; redraw(); return;
    }
    if (d && d.kind === 'pan') { view.cx = d.cx - (X - d.X) / view.s; view.cy = d.cy + (Y - d.Y) / view.s; view.fast = view.lastMs > 40; redraw(); return; }
    if (d && d.kind === 'maybe' && d.touch && Math.hypot(X - d.x0, Y - d.y0) > 6 && !S.pending) { S.dragging = { kind: 'pan', X: d.x0, Y: d.y0, cx: d.cx, cy: d.cy }; return; }
    if (d && d.kind === 'maybe' && Math.hypot(X - d.x0, Y - d.y0) > 5) { d.kind = 'win'; }
    if (d && d.kind === 'win') { d.x1 = X; d.y1 = Y; }
    S.mw = S.pending && S.pending.kind === 'point' ? cursorWorld() : view.s2w(X, Y);
    clearTimeout(init._acq);
    if (S.otrack && S.snap && S.pending && S.pending.kind === 'point' && S.snap.t !== 'NEA' && S.snap.t !== 'PER') { const sp = [S.snap.x, S.snap.y]; init._acq = setTimeout(() => { if (S.snap && Math.hypot(S.snap.x - sp[0], S.snap.y - sp[1]) < 1e-9) acquireTrack(sp); }, 450); }
    if (!S.pending && !d) { clearTimeout(init._ht); init._ht = setTimeout(() => { const it = pickItem(S.mouse[0], S.mouse[1]); const h = it ? it.id : null; if (h !== S.hover) { S.hover = h; redrawOverlay(); } }, 40); }
    redrawOverlay(); updateStatus();
  });
  const up = (e) => {
    const [X, Y] = pos(e); const d = S.dragging; S.dragging = null; touches.delete(e.pointerId);
    if (!d) return;
    if (d.kind === 'pan' || d.kind === 'pinch') { view.fast = false; redraw(); if (touches.size) S.dragging = null; return; }
    if (d.kind === 'click') { if (S.pending && S.pending.kind === 'point') { const p = cursorWorld(); resolvePending(p); } return; }
    if (d.kind === 'maybe') {
      const it = pickItem(X, Y);
      if (S.pending && S.pending.kind === 'select') { if (it) setSel([it.id], d.shift ? 'toggle' : true); return; }
      if (it) setSel([it.id], d.shift ? 'toggle' : (e.ctrlKey || e.metaKey) ? true : false); else if (!d.shift) setSel([]);
      return;
    }
    if (d.kind === 'win') {
      const ids = windowSelect(d.x0, d.y0, X, Y, X < d.x0);
      setSel(ids, d.shift ? 'toggle' : (S.pending && S.pending.kind === 'select') ? true : (e.ctrlKey || e.metaKey) ? true : false);
      redrawOverlay(); return;
    }
  };
  ov.addEventListener('pointerup', up); ov.addEventListener('pointercancel', (e) => { touches.delete(e.pointerId); S.dragging = null; redrawOverlay(); });
  ov.addEventListener('pointerleave', () => { S.inside = false; redrawOverlay(); });
  ov.addEventListener('contextmenu', (e) => { e.preventDefault(); enterKey(); });
  ov.addEventListener('dblclick', (e) => { if (S.pending) { if (S.pending.kind === 'point' && S.pending.opts && S.pending.opts.base) enterKey(); return; } const [X, Y] = pos(e); if (!pickItem(X, Y)) zoomExtents(false); });   // komut sürerken çift tık = Enter (çizimi bitir)

  // command line
  const inp = $('#cmd');
  function enterKey() {
    const v = inp.value; inp.value = '';
    if (S.pending) { if (S.pending.kind === 'select') { if (!v.trim()) resolvePending(null); else if (/^(t|all|tümü|tumu)$/i.test(v.trim())) { setSel([...S.doc.items.keys()].filter((id) => layerVisible(S.doc.items.get(id))), true); } return; } parseInput(v); return; }
    const t = v.trim();
    if (!t) { if (S.lastCmd) runCommand(S.lastCmd); return; }
    if (t === '?') { showHelp(); return; }
    runCommand(t);
  }
  window.enterKey = enterKey;
  inp.addEventListener('keydown', (e) => {
    // boşluk = Enter yalnız komut beklerken (nokta/sayı girişi) ya da yazılan tek kelime bilinen bir komutsa; aksi halde cümle yazılır
    const komutMu = (v) => { const k = v.trim().toUpperCase().replace(/İ/g, 'I').replace(/Ş/g, 'S').replace(/Ç/g, 'C').replace(/Ö/g, 'O').replace(/Ü/g, 'U').replace(/Ğ/g, 'G').replace(/^[_.\-]/, ''); return !k || !!ALIAS[k]; };
    const bosluk = e.key === ' ' && (S.pending ? S.pending.kind !== 'text' : komutMu(inp.value));
    if (e.key === 'Enter' || bosluk) { e.preventDefault(); enterKey(); }
    else if (e.key === 'Escape') { e.preventDefault(); inp.value = ''; if (S.cmd) cancelCmd(); else setSel([]); }
  });
  document.addEventListener('keydown', (e) => {
    if (e.target.closest('input, textarea, select') && e.target !== inp) return;
    if (document.body.classList.contains('ovl')) return;
    if (e.key === 'F3') { e.preventDefault(); S.osnap = !S.osnap; msg('Nesne yakalama ' + (S.osnap ? 'açık' : 'kapalı')); updateStatus(); return; }
    if (e.key === 'F8') { e.preventDefault(); S.ortho = !S.ortho; msg('Orto ' + (S.ortho ? 'açık' : 'kapalı')); updateStatus(); return; }
    if (e.key === 'F11') { e.preventDefault(); S.otrack = !S.otrack; S.track = []; msg('Nesne yakalama izi ' + (S.otrack ? 'açık' : 'kapalı')); updateStatus(); return; }
    if (e.key === 'F7') { e.preventDefault(); view.gridOn = !view.gridOn; redraw(); return; }
    if ((e.ctrlKey || e.metaKey) && (e.key === 'z' || e.key === 'Z')) { e.preventDefault(); if (!S.cmd) runCommand(e.shiftKey ? 'REDO' : 'U'); return; }
    if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || e.key === 'Y')) { e.preventDefault(); if (!S.cmd) runCommand('REDO'); return; }
    if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'S')) { e.preventDefault(); saveDxf(); return; }
    if ((e.ctrlKey || e.metaKey) && (e.key === 'o' || e.key === 'O')) { e.preventDefault(); $('#file').click(); return; }
    if ((e.ctrlKey || e.metaKey) && (e.key === 'a' || e.key === 'A')) { e.preventDefault(); setSel([...S.doc.items.keys()].filter((id) => layerVisible(S.doc.items.get(id)))); return; }
    if (e.target === inp) return;
    if (e.key === 'Escape') { if (S.cmd) cancelCmd(); else setSel([]); return; }
    if (e.key === 'Delete' && !S.cmd && V().sel.size) { runCommand('ERASE'); return; }
    if (e.key === 'Enter') { e.preventDefault(); enterKey(); return; }
    if (e.key === ' ' && !e.repeat) { if (S.pending && S.pending.kind !== 'text') { e.preventDefault(); enterKey(); } else if (!S.cmd) { e.preventDefault(); S.space = true; } return; }
    if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) { inp.focus(); }
  });
  document.addEventListener('keyup', (e) => { if (e.key === ' ') S.space = false; });

  // buttons
  document.querySelectorAll('.tool').forEach((b) => b.addEventListener('click', () => { runCommand(b.dataset.cmd); inp.focus({ preventScroll: true }); }));
  $('#bopen').onclick = () => $('#file').click();
  $('#file').onchange = (e) => { const f = e.target.files[0]; if (f) openFile(f); e.target.value = ''; };
  $('#bnew').onclick = async () => { if (S.doc && S.doc.dirty && S.doc.undo.length) { const r = await askDlg('Yeni çizim', 'Açık çizimde kaydedilmemiş değişiklikler var.', [['Kaydet ve devam et', 'save', 'primary'], ['Kaydetmeden devam et', 'drop'], ['Vazgeç', null, 'ghost']]); if (!r) return; if (r === 'save') await saveDxf(); } blankDoc('Yeni çizim'); msg('Yeni çizim. Birim: metre önerilir.'); };
  $('#bsave').onclick = saveDxf;
  $('#bundo').onclick = () => !S.cmd && runCommand('U');
  $('#bredo').onclick = () => !S.cmd && runCommand('REDO');
  $('#bext').onclick = () => zoomExtents(false);
  $('#bsnap').onclick = () => { S.osnap = !S.osnap; updateStatus(); };
  $('#bortho').onclick = () => { S.ortho = !S.ortho; updateStatus(); };
  $('#bgrid').onclick = () => { view.gridOn = !view.gridOn; redraw(); };
  $('#btrack').onclick = () => { S.otrack = !S.otrack; S.track = []; updateStatus(); };
  $('#bclose').onclick = closeDoc;
  $('#bside').onclick = () => $('#side').classList.toggle('open');
  $('#layerq').oninput = (e) => { S.layerFilter = e.target.value; renderLayers(); };
  $('#lall').onclick = () => { for (const L of S.doc.layers.values()) { L.on = true; L.fz = false; } renderLayers(); redraw(); };
  $('#lnew').onclick = async () => {
    const nm = $('#layerq').value.trim(); if (!nm) { msg('Yeni katman adı için arama kutusuna adı yazıp + düğmesine basın.'); $('#layerq').focus(); return; }
    if (S.doc.layers.has(nm)) { S.curLayer = nm; } else { S.doc.addLayer(nm, 7); S.curLayer = nm; msg('Katman oluşturuldu: ' + nm); }
    $('#layerq').value = ''; S.layerFilter = ''; renderLayers(); updateStatus();
  };
  // drag & drop
  ['dragenter', 'dragover'].forEach((t) => st.addEventListener(t, (e) => { e.preventDefault(); st.classList.add('drop'); }));
  ['dragleave', 'drop'].forEach((t) => st.addEventListener(t, (e) => { e.preventDefault(); st.classList.remove('drop'); }));
  st.addEventListener('drop', (e) => { const f = e.dataTransfer.files[0]; if (f) openFile(f); });
  window.addEventListener('beforeunload', (e) => { if (S.doc && S.doc.dirty && S.doc.undo.length) { e.preventDefault(); e.returnValue = ''; } });
}
function blankDoc(name) { const d = new Doc(); d.ctx = { blocks: d.blocks, solids: d.solids }; setDoc(d, name); S.textH = 2.5; V().cx = 50; V().cy = 30; V().s = Math.min(V().W, V().H) / 120; S.fitPending = false; redraw(); }
function askDlg(title, text, buttons) { // buttons: [[label, value, cls]] -> Promise(value)
  return new Promise((res) => {
    const d = $('#qdlg'); d.querySelector('h3').textContent = title; d.querySelector('p').textContent = text; const box = d.querySelector('.qb'); box.innerHTML = '';
    for (const [l, v, c] of buttons) { const b = document.createElement('button'); b.className = 'gb' + (c ? ' ' + c : ''); b.textContent = l; b.onclick = () => { d.close(); res(v); }; box.appendChild(b); }
    d.oncancel = () => res(null); d.showModal();
  });
}
async function closeDoc() {
  if (!S.doc) return; if (S.cmd) cancelCmd();
  if (S.doc.dirty && S.doc.undo.length) {
    const r = await askDlg('Çizimi kapat', '“' + S.doc.name + '” üzerinde kaydedilmemiş değişiklikler var.', [['Kaydet ve kapat', 'save', 'primary'], ['Kaydetmeden kapat', 'drop'], ['Vazgeç', null, 'ghost']]);
    if (!r) return; if (r === 'save') await saveDxf();
  }
  const nm = S.doc.name; G.bound = null; if (typeof boundInfo === 'function') boundInfo();
  blankDoc('Yeni çizim'); msg('“' + nm + '” kapatıldı.');
}
function showHelp() {
  const lines = [
    'ÇİZİM  L çizgi · PL polyline · REC dikdörtgen · C daire · A yay (3 nokta) · T yazı · DLI doğrusal ölçü · DAL hizalı ölçü · PO nokta',
    'DÜZENLE  M taşı · CO kopyala · RO döndür · SC ölçekle · MI aynala · O ofset · TR buda · F köşe · E sil · X patlat',
    'ÖLÇ  DI mesafe · AA alan · ID koordinat · LI liste    GÖRÜNÜM  Z zoom (K/T/P) · çift tık boş alana = kapsam',
    'KOORDİNAT  100,200 mutlak · @50,0 göreli · @25<45 kutupsal · sadece sayı = imleç yönünde mesafe',
    'İZ (F11)  imleci bir uç/orta/merkez noktasında yarım saniye bekletin (yeşil +), sonra yatay/dikey hizasında gezdirin: kesikli iz çıkar, tıklayınca o hizaya oturur',
    'TUŞLAR  Enter/Boşluk/sağ tık = onay veya son komutu tekrar · Esc iptal · F3 yakalama · F8 orto · F7 ızgara · F11 iz · Del sil · Ctrl+Z/Y',
    'GEZİNME  tekerlek zoom · orta tuş veya Boşluk+sürükle kaydır · sol→sağ pencere: içindekiler · sağ→sol: değenler · Shift+tık seçimden çıkar',
  ];
  for (const l of lines) msg(l, 'help');
}
