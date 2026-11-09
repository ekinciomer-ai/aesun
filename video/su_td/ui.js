// 1080 x 1920 dikey konsol: başlık bloğu, canlı veri paneli, güç eğrisi, altyazı, bölüm çipleri, çizgili etiketler,
// ölçü çizgileri, beyaz flaş ve kapanış kartı. update(s) her kareyi yeniden çizer.
export const C = {ink: '#16181b', mute: '#7d828a', faint: '#c9ccd0', line: '#e1e3e6', panel: 'rgba(248,248,249,.94)', acc: '#1590b5'};
const CSS = `
#ui{position:absolute;left:0;top:0;transform-origin:0 0;pointer-events:none;font-family:Inter,system-ui,sans-serif;color:${C.ink};-webkit-font-smoothing:antialiased;font-variant-numeric:tabular-nums}
#ui .mo{font-family:'JetBrains Mono',monospace;font-variant-ligatures:none}
#ui .cp{position:absolute;background:${C.panel};border:2px solid ${C.line};border-radius:10px;box-shadow:0 4px 18px rgba(30,40,60,.07)}
#ui .ph{position:absolute;display:flex;align-items:center;gap:14px;font:700 25px 'JetBrains Mono',monospace;letter-spacing:.12em}
#ui .ph i{display:block;width:5px;height:24px;background:${C.acc}}
#ui .pn{position:absolute;font:500 22px 'JetBrains Mono',monospace;color:${C.mute};letter-spacing:.08em}
#ui .sm{font:600 22px 'JetBrains Mono',monospace;letter-spacing:.1em;color:${C.mute};text-transform:uppercase;white-space:nowrap}
#ui .call{position:absolute;white-space:nowrap}
#ui .call b{display:flex;align-items:center;gap:12px;font:700 32px 'JetBrains Mono',monospace;letter-spacing:.04em;color:${C.ink};text-shadow:0 0 10px rgba(243,244,246,.9),0 0 3px rgba(243,244,246,.9)}
#ui .call b i{display:block;width:13px;height:13px;background:${C.acc};flex:none}
#ui .call span{display:block;font:600 25px 'JetBrains Mono',monospace;letter-spacing:.06em;color:#5d636b;margin:4px 0 0 25px;text-shadow:0 0 8px rgba(243,244,246,.95)}
#ui .chip{position:absolute;height:44px;padding:0 16px;display:flex;align-items:center;border:2px solid ${C.faint};border-radius:7px;background:#fdfdfd;font:700 21px 'JetBrains Mono',monospace;letter-spacing:.08em;white-space:nowrap}
#alt2{position:absolute;left:60px;right:60px;bottom:584px;text-align:center}
#alt2 span{display:inline;font:700 47px/1.32 Inter,sans-serif;color:${C.ink};background:rgba(250,250,251,.93);padding:6px 22px;box-decoration-break:clone;-webkit-box-decoration-break:clone;border-radius:10px;box-shadow:0 3px 14px rgba(20,30,50,.10)}
#alt2 em{font-style:normal;color:${C.acc}}
`;
const el = (h) => {
  const d = document.createElement('div');
  d.innerHTML = h.trim();
  return d.firstElementChild;
};

export function createUI(app, L, YT = false) {
  const UW = YT ? 1920 : 1080, UH = YT ? 1080 : 1920;
  // yatay (16:9) yerleşim: paneller sağ sütunda, çipler başlığın altında, altyazı altta ortada
  const P1 = YT ? [1388, 300] : [40, 1372], P2 = YT ? [1388, 592] : [548, 1372], CY = YT ? 272 : 1664;
  const st = document.createElement('style');
  st.textContent = CSS;
  document.head.appendChild(st);
  const ui = el(`<div id="ui" style="width:${UW}px;height:${UH}px"></div>`);
  app.appendChild(ui);
  const add = (h) => {
    const n = el(h);
    ui.appendChild(n);
    return n;
  };
  const panel = (x, y, w, h, title, n) => {
    add(`<div class="cp" style="left:${x}px;top:${y}px;width:${w}px;height:${h}px"></div>`);
    add(`<div class="ph" style="left:${x + 24}px;top:${y + 22}px"><i></i>${title}</div>`);
    add(`<div class="pn" style="right:${UW - x - w + 22}px;top:${y + 24}px">${n}</div>`);
  };
  const fit = () => {
    const k = Math.min(innerWidth / UW, innerHeight / UH);
    ui.style.transform = `translate(${(innerWidth - UW * k) / 2}px,${(innerHeight - UH * k) / 2}px) scale(${k})`;
  };
  fit();
  addEventListener('resize', fit);

  // ------------------------------------------------------------ başlık
  add(`<div style="position:absolute;left:0;top:96px;width:150px;height:150px;background:${C.acc}"></div>`);
  add(`<div class="mo" style="position:absolute;left:0;top:118px;width:150px;text-align:center;color:#fff;font-size:68px;font-weight:700;letter-spacing:-.02em">${L.no}</div>`);
  add(`<div class="mo" style="position:absolute;left:0;top:206px;width:150px;text-align:center;color:rgba(255,255,255,.85);font-size:19px;font-weight:700;letter-spacing:.2em">${L.bolum}</div>`);
  add(`<div class="sm" style="position:absolute;left:180px;top:100px;font-size:23px;letter-spacing:.16em">${L.seri}</div>`);
  const baslik = add(`<div style="position:absolute;left:177px;top:130px;font-size:76px;font-weight:700;letter-spacing:-.02em;line-height:1;white-space:nowrap"></div>`);
  const altb = add(`<div class="mo" style="position:absolute;left:181px;top:222px;font-size:24px;letter-spacing:.1em;color:#5d636b;white-space:nowrap"></div>`);
  add(`<div class="mo" style="position:absolute;right:48px;top:44px;font-size:24px;font-weight:700;letter-spacing:.3em">KOZMOS <span style="color:${C.acc}">LAB</span></div>`);
  add(`<div class="mo" style="position:absolute;left:48px;top:46px;font-size:21px;letter-spacing:.14em;color:${C.mute}">${L.etut}</div>`);
  {
    let h = '';
    for (let r = 0; r < 2; r++) for (let c = 0; c < 9; c++) h += `<path d="M${c * 30 + 6} ${r * 30}v12M${c * 30} ${r * 30 + 6}h12" stroke="${C.acc}" stroke-width="2" opacity=".6"/>`;
    add(`<svg style="position:absolute;left:${UW - 300}px;top:${YT ? 110 : 280}px" width="280" height="50">${h}</svg>`);
  }

  // ------------------------------------------------------------ altyazı
  const alt = add(`<div id="alt2"></div>`);
  if (YT) Object.assign(alt.style, {left: '260px', right: '600px', bottom: '70px'});

  const n0 = ui.children.length;
  // ------------------------------------------------------------ 01 canlı veri
  const [p1x, p1y] = P1, [p2x, p2y] = P2;
  panel(p1x, p1y, 492, 272, L.canli, '01');
  const ROWS = L.rows;
  const bars = ROWS.map((n, i) => {
    const y = p1y + 56 + i * 41;
    add(`<div class="sm" style="position:absolute;left:${p1x + 24}px;top:${y + 2}px;font-size:19px;letter-spacing:.06em">${n}</div>`);
    add(`<div style="position:absolute;left:${p1x + 174}px;top:${y + 11}px;width:84px;height:7px;background:#e6e7e9;border-radius:4px"></div>`);
    const f = add(`<div style="position:absolute;left:${p1x + 174}px;top:${y + 11}px;height:7px;background:${C.acc};border-radius:4px"></div>`);
    const v = add(`<div class="mo" style="position:absolute;right:${UW - p1x - 472}px;top:${y - 6}px;font-size:29px;font-weight:700;white-space:nowrap"></div>`);
    return {f, v};
  });

  // ------------------------------------------------------------ 02 güç eğrisi
  panel(p2x, p2y, YT ? 492 : 440, 272, L.egri, '02');
  const ch = add(`<svg style="position:absolute;left:${p2x + 18}px;top:${p2y + 48}px" width="404" height="190"></svg>`);
  const formul = add(`<div class="mo" style="position:absolute;left:${p2x + 24}px;top:${p2y + 232}px;font-size:21px;color:#5d636b;letter-spacing:.04em"></div>`);
  void formul;

  const pnl = Array.from(ui.children).slice(n0);
  // ------------------------------------------------------------ 03 bölümler
  const chips = {};
  {
    let x = YT ? 180 : 40;
    const y = CY;
    for (const k of L.bolumler) {
      const w = Math.round(L.ad[k].length * 13.4 + 34);
      chips[k] = add(`<div class="chip" style="left:${x}px;top:${y}px;width:${w}px">${L.ad[k]}</div>`);
      x += w + 9;
    }
  }

  // ------------------------------------------------------------ etiketler, ölçüler, flaş, kapanış
  const callSvg = add(`<svg style="position:absolute;left:0;top:0;overflow:visible" width="${UW}" height="${UH}"></svg>`);
  const callG = add(`<div style="position:absolute;inset:0"></div>`);
  const kart = add(`<div style="position:absolute;left:0;right:${YT ? 520 : 0}px;top:${YT ? 380 : 700}px;text-align:center;opacity:0"></div>`);
  const bilgi = add(`<div style="position:absolute;left:${YT ? 1388 : 40}px;top:${YT ? 300 : 1372}px;width:${YT ? 492 : 948}px;height:272px;display:none"></div>`);
  // uydu sahnelerinde başlık okunurluğu için üst perde
  const perde = add(`<div style="position:absolute;left:0;top:0;width:${UW}px;height:${YT ? 300 : 420}px;background:linear-gradient(rgba(244,244,245,.96) 55%,rgba(244,244,245,0));display:none"></div>`);
  ui.insertBefore(perde, ui.firstChild);
  // konum haritası (küçük) ve uydu kaynak notu
  const konum = add(`<div style="position:absolute;left:${UW - 300}px;top:${YT ? 160 : 330}px;width:260px;height:120px;border:2px solid #fff;border-radius:8px;box-shadow:0 4px 14px rgba(20,30,50,.18);background-size:cover;background-position:center;display:none;overflow:hidden"><i style="position:absolute;width:14px;height:14px;margin:-7px 0 0 -7px;border-radius:50%;background:${C.acc};border:3px solid #fff"></i><span class="mo" style="position:absolute;left:8px;bottom:5px;font-size:15px;font-weight:700;color:#fff;letter-spacing:.08em;text-shadow:0 0 4px #000"></span></div>`);
  const kaynak = add(`<div class="mo" style="position:absolute;right:48px;top:${YT ? 1040 : 1346}px;font-size:16px;letter-spacing:.06em;color:#5d636b;display:none"></div>`);
  const flas = add(`<div style="position:absolute;inset:0;background:#fff;opacity:0"></div>`);

  const fmt = (x, d) => x.toFixed(d).replace('.', L.ondalik);
  const egriD = (pts, W, H, vmax, pmax) => pts.map(([v, p], i) => `${i ? 'L' : 'M'}${((v / vmax) * W).toFixed(1)} ${(H - (p / pmax) * H).toFixed(1)}`).join('');

  return {
    fit,
    update(s) {
      baslik.textContent = s.baslik;
      altb.textContent = s.alt;
      alt.innerHTML = s.yazi ? `<span>${s.yazi}</span>` : '';
      // canlı veri: s.vals = [[oran, metin], ...], s.grafik = svg iç metni
      s.vals.forEach((v, i) => {
        bars[i].f.style.width = `${(Math.max(0, Math.min(1, v[0])) * 84).toFixed(1)}px`;
        bars[i].v.textContent = v[1];
      });
      ch.innerHTML = s.grafik;
      formul.textContent = s.formul ?? '';
      // çipler
      if (s.cipYok) for (const k in chips) chips[k].style.visibility = 'hidden';
      else for (const k in chips) chips[k].style.visibility = 'visible';
      for (const k in chips) {
        const on = k === s.bolum;
        const gecti = L.bolumler.indexOf(k) < L.bolumler.indexOf(s.bolum);
        chips[k].style.background = on ? C.acc : '#fdfdfd';
        chips[k].style.color = on ? '#fff' : gecti ? C.ink : C.mute;
        chips[k].style.borderColor = on ? C.acc : gecti ? '#9aa0a8' : C.faint;
      }
      // etiketler + ölçüler
      let lh = '';
      let chh = '';
      for (const c of s.etiketler) {
        if (c.o < 0.02 || !c.at) continue;
        const [ax, ay] = c.at;
        const [lx, ly] = c.label;
        const sag = lx > ax;
        const ex = sag ? lx - 10 : lx + c.w + 10;
        lh += `<polyline points="${ax.toFixed(1)},${ay.toFixed(1)} ${ex.toFixed(1)},${(ly + 18).toFixed(1)}" fill="none" stroke="${C.acc}" stroke-width="2.2" opacity="${c.o.toFixed(2)}"/><circle cx="${ax.toFixed(1)}" cy="${ay.toFixed(1)}" r="6" fill="${C.acc}" stroke="#fff" stroke-width="2" opacity="${c.o.toFixed(2)}"/>`;
        chh += `<div class="call" style="left:${lx.toFixed(1)}px;top:${ly.toFixed(1)}px;opacity:${c.o.toFixed(2)}"><b><i></i>${c.ad}</b>${c.alt ? `<span>${c.alt}</span>` : ''}</div>`;
      }
      for (const m of s.olculer) {
        if (m.o < 0.02 || !m.a || !m.b) continue;
        const [x0, y0] = m.a, [x1, y1] = m.b;
        const dx = x1 - x0, dy = y1 - y0, L2 = Math.hypot(dx, dy) || 1, nx = (-dy / L2) * 14, ny = (dx / L2) * 14;
        const o = m.o.toFixed(2);
        lh += `<g opacity="${o}"><line x1="${x0}" y1="${y0}" x2="${x1}" y2="${y1}" stroke="${C.ink}" stroke-width="2.4"/>`;
        lh += `<line x1="${x0 - nx}" y1="${y0 - ny}" x2="${x0 + nx}" y2="${y0 + ny}" stroke="${C.ink}" stroke-width="2.4"/><line x1="${x1 - nx}" y1="${y1 - ny}" x2="${x1 + nx}" y2="${y1 + ny}" stroke="${C.ink}" stroke-width="2.4"/></g>`;
        const mx = (x0 + x1) / 2 + (m.dx ?? 0), my = (y0 + y1) / 2 + (m.dy ?? 0);
        chh += `<div class="mo" style="position:absolute;left:${mx.toFixed(1)}px;top:${my.toFixed(1)}px;transform:translate(-50%,-50%);opacity:${o};font-size:34px;font-weight:700;background:${C.acc};color:#fff;padding:4px 14px;border-radius:6px;white-space:nowrap">${m.metin}</div>`;
      }
      callSvg.innerHTML = lh;
      callG.innerHTML = chh;
      // kapanış
      for (const e of pnl) e.style.visibility = s.bilgi ? 'hidden' : 'visible';
      bilgi.style.display = s.bilgi ? 'block' : 'none';
      if (s.bilgi) bilgi.innerHTML = s.bilgi;
      if (s.konum) {
        konum.style.display = 'block';
        konum.style.backgroundImage = `url(${s.konum.img})`;
        konum.firstElementChild.style.left = `${s.konum.x * 100}%`;
        konum.firstElementChild.style.top = `${s.konum.y * 100}%`;
        konum.lastElementChild.textContent = s.konum.ad;
      } else konum.style.display = 'none';
      kaynak.style.display = s.kaynak ? 'block' : 'none';
      perde.style.display = s.kaynak ? 'block' : 'none';
      if (s.kaynak) kaynak.textContent = s.kaynak;
      kart.style.opacity = String(s.kart?.o ?? 0);
      if (s.kart) kart.innerHTML = s.kart.html;
      flas.style.opacity = String(s.flas ?? 0);
    },
  };
}
