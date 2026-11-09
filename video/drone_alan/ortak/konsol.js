// Dikey konsol 1080 × 1920 (Shorts). Açık stüdyo, tek accent. guncelle(d) her karede çizer.
// Alt 260 px altyazıya ayrılır (kurguda ASS ile yakılır).
export const C = {ink: '#16181b', mute: '#8b8f95', faint: '#c9ccd0', cizgi: '#e1e3e6', panel: 'rgba(248,248,249,.94)'};

const el = (h) => { const d = document.createElement('div'); d.innerHTML = h.trim(); return d.firstElementChild; };

export function konsolKur(app, {acc, ust, baslik, alt, rozet, rozetAlt, satirlar, formul, sira}) {
  const st = document.createElement('style');
  st.textContent = `
#app{font-family:Inter,system-ui,sans-serif;color:${C.ink};-webkit-font-smoothing:antialiased;font-variant-numeric:tabular-nums}
.ui{position:absolute;left:0;top:0;width:1080px;height:1920px;pointer-events:none;transform-origin:0 0}
.mo{font-family:'JetBrains Mono',monospace;font-variant-ligatures:none}
.sm{font:600 24px 'JetBrains Mono',monospace;letter-spacing:.1em;color:${C.mute};text-transform:uppercase;white-space:nowrap}
.cp{position:absolute;background:${C.panel};border:2px solid ${C.cizgi};border-radius:10px;box-shadow:0 4px 18px rgba(40,44,52,.07)}
.etk{position:absolute;white-space:nowrap}
.etk b{display:flex;align-items:center;gap:10px;font:700 34px 'JetBrains Mono',monospace;letter-spacing:.04em;color:${C.ink}}
.etk b i{display:block;width:12px;height:12px;background:${acc}}
.etk span{display:block;font:500 26px 'JetBrains Mono',monospace;letter-spacing:.06em;color:${C.mute};margin-top:4px}
.bar{position:absolute;height:8px;background:#e6e7e9;border-radius:4px;overflow:hidden}.bar s{position:absolute;inset:0;background:${acc};transform-origin:left}
`;
  document.head.appendChild(st);
  const ui = el('<div class="ui"></div>'); app.appendChild(ui);
  const fit = () => { const k = Math.min(innerWidth / 1080, innerHeight / 1920); ui.style.transform = `scale(${k})`; };
  fit(); addEventListener('resize', fit);
  const add = (h) => { const n = el(h); ui.appendChild(n); return n; };

  // başlık
  add(`<div style="position:absolute;left:64px;top:84px;width:8px;height:132px;background:${acc}"></div>`);
  add(`<div class="sm" style="position:absolute;left:90px;top:78px">${ust}</div>`);
  add(`<div style="position:absolute;left:88px;top:112px;font-size:76px;font-weight:700;letter-spacing:-1.5px;line-height:1">${baslik}</div>`);
  add(`<div class="mo" style="position:absolute;left:90px;top:200px;font-size:26px;letter-spacing:.08em;color:#5d6168">${alt}</div>`);
  const roz = add(`<div style="position:absolute;right:64px;top:250px;text-align:right"><div style="color:${acc};font-size:84px;font-weight:700;letter-spacing:-2px;line-height:1"></div><div class="sm" style="margin-top:6px"></div></div>`);
  roz.children[0].textContent = rozet; roz.children[1].textContent = rozetAlt;
  const siraEl = add(`<div class="sm" style="position:absolute;right:64px;top:82px;color:${C.ink}">${sira}</div>`);

  // gösterge paneli
  const PX = 52, PY = 1262, PW = 976, PH = 380;
  add(`<div class="cp" style="left:${PX}px;top:${PY}px;width:${PW}px;height:${PH}px"></div>`);
  const durum = add(`<div style="position:absolute;left:${PX + 30}px;top:${PY + 26}px;display:flex;align-items:center;gap:14px;font:700 26px 'JetBrains Mono',monospace;letter-spacing:.12em"><i style="display:block;width:6px;height:26px;background:${acc}"></i><span></span></div>`);
  const kol = satirlar.length;
  const hucre = satirlar.map((s, i) => {
    const x = PX + 30 + (i % 3) * 316, y = PY + 86 + Math.floor(i / 3) * 128;
    add(`<div class="sm" style="position:absolute;left:${x}px;top:${y}px">${s.ad}</div>`);
    const v = add(`<div style="position:absolute;left:${x}px;top:${y + 30}px;font-size:58px;font-weight:700;letter-spacing:-1px;line-height:1"></div>`);
    const b = s.bar ? add(`<div class="bar" style="left:${x}px;top:${y + 98}px;width:270px"><s></s></div>`) : null;
    return {v, b};
  });
  add(`<div style="position:absolute;left:${PX + 30}px;top:${PY + PH - 62}px;width:${PW - 60}px;height:2px;background:${C.cizgi}"></div>`);
  const fo = add(`<div class="mo" style="position:absolute;left:${PX + 30}px;top:${PY + PH - 46}px;font-size:26px;color:#5d6168;letter-spacing:.02em"></div>`);
  fo.textContent = formul;
  void kol;

  // çizgili etiketler
  const svg = add(`<svg style="position:absolute;left:0;top:0;overflow:visible" width="1080" height="1920"></svg>`);
  const etk = [];
  const etkAl = (i) => { while (etk.length <= i) etk.push(add('<div class="etk"><b><i></i><em style="font-style:normal"></em></b><span></span></div>')); return etk[i]; };

  const altY = add(`<div style="position:absolute;left:70px;right:70px;top:1690px;text-align:center;font:700 50px/1.25 Inter,sans-serif;color:${C.ink}"><span style="background:rgba(255,255,255,.92);padding:6px 22px;border-radius:12px;box-decoration-break:clone;-webkit-box-decoration-break:clone;box-shadow:0 4px 16px rgba(0,0,0,.08)"></span></div>`);
  return {
    guncelle(d) {
      altY.firstChild.textContent = d.altyazi || ''; altY.style.opacity = d.altyazi ? 1 : 0;
      durum.children[1].textContent = d.durum || '';
      d.degerler.forEach((v, i) => { const h = hucre[i]; if (!h) return; h.v.innerHTML = v.m; if (h.b) h.b.firstChild.style.transform = `scaleX(${Math.max(0, Math.min(1, v.oran)).toFixed(4)})`; });
      let s = '';
      (d.etiketler || []).forEach((e, i) => {
        const n = etkAl(i); n.style.display = ''; n.style.opacity = e.o.toFixed(3);
        n.querySelector('em').textContent = e.ad; n.querySelector('span').textContent = e.alt;
        const sag = e.sag;
        n.style.left = sag ? '' : `${e.lx}px`; n.style.right = sag ? `${1080 - e.lx}px` : ''; n.style.top = `${e.ly - 22}px`; n.style.textAlign = sag ? 'right' : 'left';
        if (sag) n.querySelector('b').style.flexDirection = 'row-reverse'; else n.querySelector('b').style.flexDirection = 'row';
        const ax = e.lx + (sag ? 16 : -16);
        s += `<path d="M${e.px.toFixed(1)} ${e.py.toFixed(1)} L${ax.toFixed(1)} ${e.ly.toFixed(1)}" stroke="${C.ink}" stroke-width="2.5" fill="none" opacity="${e.o.toFixed(3)}"/><circle cx="${e.px.toFixed(1)}" cy="${e.py.toFixed(1)}" r="7" fill="${acc}" opacity="${e.o.toFixed(3)}"/>`;
      });
      for (let i = (d.etiketler || []).length; i < etk.length; i++) etk[i].style.display = 'none';
      svg.innerHTML = s;
      siraEl.style.opacity = 1;
    },
  };
}
