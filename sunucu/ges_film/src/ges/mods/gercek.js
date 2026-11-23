// Stil 2 (gerçekçi doku) yardımcıları: kabartmalı zemin/yol, kuru ot, C profil, galvaniz, monokristal panel, toz.
// Hepsi kodla üretilir (dış doku dosyası yok). Rastgelelik sabit tohumla.

// yükseklik alanından normal haritası (döşemeli)
function normalHaritasi(THREE, h, N, guc) {
  const d = new Uint8Array(N * N * 4);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const i = y * N + x;
    const dx = (h[y * N + ((x + 1) % N)] - h[y * N + ((x - 1 + N) % N)]) * guc;
    const dy = (h[((y + 1) % N) * N + x] - h[((y - 1 + N) % N) * N + x]) * guc;
    const l = Math.hypot(dx, dy, 1);
    d[i * 4] = (-dx / l * 0.5 + 0.5) * 255; d[i * 4 + 1] = (-dy / l * 0.5 + 0.5) * 255; d[i * 4 + 2] = (1 / l * 0.5 + 0.5) * 255; d[i * 4 + 3] = 255;
  }
  const t = new THREE.DataTexture(d, N, N, THREE.RGBAFormat);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.NoColorSpace;
  t.magFilter = THREE.LinearFilter; t.minFilter = THREE.LinearMipmapLinearFilter; t.generateMipmaps = true; t.anisotropy = 8; t.needsUpdate = true;
  return t;
}
function renkDokusu(THREE, rgb, N) {
  const cv = document.createElement('canvas'); cv.width = cv.height = N;
  const g = cv.getContext('2d'); const im = g.createImageData(N, N); im.data.set(rgb); g.putImageData(im, 0, 0);
  const t = new THREE.CanvasTexture(cv); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  return t;
}

// kuru kil toprak + çakıl + kuru ot lekeleri, ince çatlaklar
export function zeminMalzeme(ctx, tekrar) {
  const { THREE, TEX } = ctx;
  const N = 1024, f1 = TEX.tileFbm(6, 6, 101, 0.55), f2 = TEX.tileFbm(48, 3, 202, 0.5), f3 = TEX.tileFbm(3, 4, 303, 0.5), f4 = TEX.tileFbm(20, 3, 404, 0.6);
  const h = new Float32Array(N * N), rgb = new Uint8ClampedArray(N * N * 4);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const u = x / N, v = y / N, i = y * N + x;
    const a = f1(u, v), b = f2(u, v), c = f3(u, v), k = f4(u, v);
    let r = 150 + (a - 0.5) * 70, gg = 128 + (a - 0.5) * 60, bb = 98 + (a - 0.5) * 45;   // kil
    let hh = a * 0.5;
    const tas = Math.max(0, (b - 0.6) * 4);                                               // çakıl taneleri
    r += tas * 45; gg += tas * 45; bb += tas * 48; hh += tas * 0.6;
    const ot = Math.max(0, (c - 0.58) * 3);                                               // kuru ot lekesi
    r = r * (1 - ot) + 132 * ot; gg = gg * (1 - ot) + 122 * ot; bb = bb * (1 - ot) + 74 * ot;
    const catlak = Math.abs(k - 0.5) < 0.008 ? 1 : 0;                                      // ince çatlak
    r -= catlak * 40; gg -= catlak * 36; bb -= catlak * 30; hh -= catlak * 0.25;
    rgb[i * 4] = r; rgb[i * 4 + 1] = gg; rgb[i * 4 + 2] = bb; rgb[i * 4 + 3] = 255; h[i] = hh;
  }
  const map = renkDokusu(THREE, rgb, N); map.repeat.set(tekrar, tekrar);
  const nrm = normalHaritasi(THREE, h, N, 14); nrm.repeat.set(tekrar, tekrar);
  const m = new THREE.MeshStandardMaterial({ map, normalMap: nrm, normalScale: new THREE.Vector2(1.3, 1.3), roughness: 0.96, metalness: 0, envMapIntensity: 0.4 });
  ctx.applyWeather(m, { tex: 0.025, grain: 0.25, dirt: 0.55, streak: 0, moss: 0.12, mossColor: 0x5a5a2c, wet: 0, bump: 0, chip: 0, rust: 0 });
  return m;
}

// mıcır yol: iri taneli, tekerlek izi
export function yolMalzeme(ctx, rx, ry) {
  const { THREE, TEX } = ctx;
  const N = 512, f1 = TEX.tileFbm(64, 2, 515, 0.5), f2 = TEX.tileFbm(8, 4, 616, 0.5);
  const h = new Float32Array(N * N), rgb = new Uint8ClampedArray(N * N * 4);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const u = x / N, v = y / N, i = y * N + x;
    const t = f1(u, v), b = f2(u, v);
    const tane = t > 0.5 ? (t - 0.5) * 2 : 0;
    const iz = Math.exp(-Math.pow((v - 0.3) * 18, 2)) + Math.exp(-Math.pow((v - 0.7) * 18, 2));   // iki tekerlek izi
    let c = 104 + tane * 50 + (b - 0.5) * 36 - iz * 20;
    rgb[i * 4] = c; rgb[i * 4 + 1] = c * 0.94; rgb[i * 4 + 2] = c * 0.84; rgb[i * 4 + 3] = 255; h[i] = tane * 0.8 - iz * 0.3;
  }
  const map = renkDokusu(THREE, rgb, N); map.repeat.set(rx, ry);
  const nrm = normalHaritasi(THREE, h, N, 10); nrm.repeat.set(rx, ry);
  return new THREE.MeshStandardMaterial({ map, normalMap: nrm, normalScale: new THREE.Vector2(1.5, 1.5), roughness: 0.93, envMapIntensity: 0.4 });
}

// kuru ot öbekleri (çapraz iki düzlem, alfa testli)
export function otlar(ctx, adet, alanFn) {
  const { THREE, TEX, scene } = ctx;
  const rng = ctx.rng(777);
  const tex = TEX.canvasTexture(128, 128, (g, w, h) => {
    g.clearRect(0, 0, w, h); g.lineCap = 'round';
    const r = ctx.rng(31);
    for (let i = 0; i < 70; i++) {
      const x0 = w * (0.3 + r() * 0.4), len = h * (0.35 + r() * 0.6), ang = (r() - 0.5) * 1.1;
      const k = 0.95 + r() * 0.35;
      g.strokeStyle = `rgb(${Math.round(168 * k)},${Math.round(150 * k)},${Math.round(98 * k)})`; g.lineWidth = 1 + r() * 1.6;
      g.beginPath(); g.moveTo(x0, h); g.quadraticCurveTo(x0 + Math.sin(ang) * len * 0.3, h - len * 0.6, x0 + Math.sin(ang) * len, h - len); g.stroke();
    }
  });
  const p1 = new THREE.PlaneGeometry(0.6, 0.42); p1.translate(0, 0.21, 0);
  const p2 = p1.clone(); p2.rotateY(Math.PI / 2);
  const { mergeGeometries } = ctx.BGU;
  const geo = mergeGeometries([p1, p2]);
  const m = new THREE.InstancedMesh(geo, new THREE.MeshStandardMaterial({ map: tex, alphaTest: 0.45, side: THREE.DoubleSide, roughness: 0.92 }), adet);
  const o = new THREE.Object3D(); let n = 0;
  for (let i = 0; i < adet * 3 && n < adet; i++) {
    const p = alanFn(rng); if (!p) continue;
    o.position.set(p[0], 0, p[1]); o.rotation.set(0, rng() * 6.28, 0); const s = 0.3 + rng() * rng() * 0.8; o.scale.set(s, s * (0.7 + rng() * 0.6), s);
    o.updateMatrix(); m.setMatrixAt(n++, o.matrix);
  }
  m.count = n; m.receiveShadow = true; scene.add(m);
  return m;
}

// C profil kesiti (metre): gövde yüksekliği hw, flanş fw, et kalınlığı t
function cSekli(THREE, hw, fw, t) {
  const s = new THREE.Shape();
  s.moveTo(0, -hw / 2); s.lineTo(fw, -hw / 2); s.lineTo(fw, -hw / 2 + t); s.lineTo(t, -hw / 2 + t);
  s.lineTo(t, hw / 2 - t); s.lineTo(fw, hw / 2 - t); s.lineTo(fw, hw / 2); s.lineTo(0, hw / 2); s.closePath();
  return s;
}
// kazık: Y boyunca 0..1 (C 150×65)
export function kazikGeo(THREE) {
  const g = new THREE.ExtrudeGeometry(cSekli(THREE, 0.15, 0.065, 0.005), { depth: 1, bevelEnabled: false });
  g.translate(-0.03, 0, 0); g.rotateX(-Math.PI / 2); return g;
}
// mertek: Z boyunca, merkezde (C 120×50)
export function mertekGeo(THREE) {
  const g = new THREE.ExtrudeGeometry(cSekli(THREE, 0.12, 0.05, 0.004), { depth: 1, bevelEnabled: false });
  g.translate(-0.025, 0, -0.5); return g;
}
// aşık: X boyunca, merkezde (C 80×40)
export function asikGeo(THREE) {
  const g = new THREE.ExtrudeGeometry(cSekli(THREE, 0.08, 0.04, 0.003), { depth: 1, bevelEnabled: false });
  g.translate(-0.02, 0, -0.5); g.rotateY(Math.PI / 2); return g;
}
export function galvaniz(ctx, koyu = false) {
  const { THREE } = ctx;
  const m = new THREE.MeshStandardMaterial({ color: koyu ? 0x9ea4a8 : 0xb8bec2, metalness: 0.7, roughness: koyu ? 0.45 : 0.38, envMapIntensity: 0.35 });
  ctx.applyWeather(m, { tex: 2.0, grain: 0.6, dirt: 0.12, streak: 0.15, moss: 0, rust: 0.0, wet: 0.0, bump: 0.0004, chip: 0 });
  return m;
}

// monokristal panel: üst yüz cam + hücre, alt yüz beyaz backsheet, yanlar alüminyum
export function panelMalzemeleri(ctx) {
  const { THREE, TEX } = ctx;
  const W = 512, H = 1024;
  const tex = TEX.canvasTexture(W, H, (g) => {
    g.fillStyle = '#b8bec4'; g.fillRect(0, 0, W, H);                 // çerçeve
    const b = 12; g.fillStyle = '#e9ecef'; g.fillRect(b, b, W - 2 * b, H - 2 * b);   // hücre arası beyaz backsheet
    const cx = 6, cy = 12, pad = 3, cw = (W - 2 * b - pad * (cx + 1)) / cx, ch = (H - 2 * b - pad * (cy + 1)) / cy, kes = cw * 0.16;
    const r = ctx.rng(55);
    for (let i = 0; i < cx; i++) for (let j = 0; j < cy; j++) {
      const x = b + pad + i * (cw + pad), y = b + pad + j * (ch + pad);
      const v = 0.9 + r() * 0.12;
      g.fillStyle = `rgb(${Math.round(14 * v)},${Math.round(20 * v)},${Math.round(36 * v)})`;
      g.beginPath(); g.moveTo(x + kes, y); g.lineTo(x + cw - kes, y); g.lineTo(x + cw, y + kes); g.lineTo(x + cw, y + ch - kes);
      g.lineTo(x + cw - kes, y + ch); g.lineTo(x + kes, y + ch); g.lineTo(x, y + ch - kes); g.lineTo(x, y + kes); g.closePath(); g.fill();
      g.fillStyle = 'rgba(190,196,205,0.55)';                         // busbar
      for (let k = 1; k <= 9; k++) g.fillRect(x + k * cw / 10 - 0.5, y + 1, 1, ch - 2);
      g.fillStyle = 'rgba(120,130,150,0.18)';                         // ince parmaklar
      for (let k = 1; k < 26; k++) g.fillRect(x + 1, y + k * ch / 26, cw - 2, 0.5);
    }
  });
  tex.anisotropy = 8;
  const cam = new THREE.MeshPhysicalMaterial({ map: tex, metalness: 0.1, roughness: 0.32, clearcoat: 1, clearcoatRoughness: 0.035, envMapIntensity: 1.5 });
  const alu = new THREE.MeshStandardMaterial({ color: 0xc2c7cc, metalness: 1, roughness: 0.3 });
  const arka = new THREE.MeshStandardMaterial({ color: 0xe6e6e2, roughness: 0.75 });
  // BoxGeometry yüz sırası: +x, -x, +y, -y, +z, -z
  return [alu, alu, cam, arka, alu, alu];
}

// toz bulutları: kazık darbelerinde
export function tozHavuzu(ctx, adet) {
  const { THREE, TEX, scene } = ctx;
  const tex = TEX.canvasTexture(128, 128, (g, w, h) => {
    const gr = g.createRadialGradient(w / 2, h / 2, 2, w / 2, h / 2, w / 2);
    gr.addColorStop(0, 'rgba(200,180,150,0.9)'); gr.addColorStop(0.5, 'rgba(180,160,130,0.35)'); gr.addColorStop(1, 'rgba(170,150,120,0)');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
  });
  const havuz = [];
  for (let i = 0; i < adet; i++) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, opacity: 0 }));
    s.visible = false; scene.add(s); havuz.push(s);
  }
  return havuz;
}
