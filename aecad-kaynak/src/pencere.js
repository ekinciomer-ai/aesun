// ---- Taşınabilir pencereler: başlıktan tutup sürükle, kenarından boyutlandır; konum/boyut tarayıcıda hatırlanır ----
const PKEY_PEN = 'aecad.pencere.v1';
function penOku() { try { return JSON.parse(localStorage.getItem(PKEY_PEN) || '{}'); } catch (e) { return {}; } }
function penYaz(id, v) { try { const o = penOku(); o[id] = v; localStorage.setItem(PKEY_PEN, JSON.stringify(o)); } catch (e) { /* ignore */ } }
function penSinir(el, x, y) {   // pencerenin en az 60 px'i ekranda kalsın
  const r = el.getBoundingClientRect(), W = innerWidth, H = innerHeight;
  return [Math.min(Math.max(x, 60 - r.width), W - 60), Math.min(Math.max(y, 0), H - 36)];
}
function penKonum(el, x, y) { [x, y] = penSinir(el, x, y); el.style.left = x + 'px'; el.style.top = y + 'px'; el.style.transform = 'none'; el.style.margin = '0'; el.classList.add('tasindi'); }
function penUygula(el) {
  const v = penOku()[el.id]; if (!v) return;
  if (v.w && el.classList.contains('boyut')) { el.style.width = Math.min(v.w, innerWidth - 16) + 'px'; el.style.height = Math.min(v.h, innerHeight - 16) + 'px'; }
  requestAnimationFrame(() => penKonum(el, v.x, v.y));
}
function penTasinir(el, tutamak) {
  const h = el.querySelector(tutamak) || el; h.classList.add('pen-tut');
  let d = null;
  h.addEventListener('pointerdown', (e) => {
    if (e.button !== 0 || e.target.closest('button, input, select, textarea, a, label')) return;
    const r = el.getBoundingClientRect(); d = { dx: e.clientX - r.left, dy: e.clientY - r.top, id: e.pointerId };
    h.setPointerCapture(e.pointerId); e.preventDefault();
  });
  h.addEventListener('pointermove', (e) => { if (d && e.pointerId === d.id) penKonum(el, e.clientX - d.dx, e.clientY - d.dy); });
  const bit = (e) => { if (!d) return; d = null; const r = el.getBoundingClientRect(); penYaz(el.id, { x: r.left, y: r.top, w: r.width, h: r.height }); };
  h.addEventListener('pointerup', bit); h.addEventListener('pointercancel', bit);
  h.addEventListener('dblclick', (e) => { if (e.target.closest('button, input, select, textarea')) return; el.style.left = el.style.top = el.style.transform = el.style.margin = el.style.width = el.style.height = ''; el.classList.remove('tasindi'); penYaz(el.id, null); });
  if (el.classList.contains('boyut')) new ResizeObserver(() => { if (!el.open || d) return; const r = el.getBoundingClientRect(); if (r.width > 0) { const o = penOku()[el.id] || {}; penYaz(el.id, { x: o.x ?? r.left, y: o.y ?? r.top, w: r.width, h: r.height }); } }).observe(el);
  // açılışta son konum
  const ac0 = el.show.bind(el), acM = el.showModal.bind(el);
  el.show = () => { ac0(); penUygula(el); };
  el.showModal = () => { acM(); penUygula(el); };
}
function pencereInit() {
  // proje penceresi modal değil: arkadaki çizim kullanılabilir; Esc kapatır
  const pj = gv('pjdlg'); pj.classList.add('boyut'); penTasinir(pj, '.pjh');
  pj.showModal = pj.show;   // her yerde show() (modal değil)
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && pj.open && !e.target.closest('#cmd')) pj.close(); });
  penTasinir(gv('qdlg'), 'h3');
  window.addEventListener('resize', () => { for (const el of [gv('pjdlg'), gv('qdlg')]) if (el.open && el.classList.contains('tasindi')) { const r = el.getBoundingClientRect(); penKonum(el, r.left, r.top); } });
}
