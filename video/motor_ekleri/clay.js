// clay.js — gerçek 3D, keçe/kil görünümlü karakter. Toon ile aynı arayüz: show(), hide(), place(x,y,z,cam), draw(p), castFrom().
// Ölçek: model 1 birim boyda kurulur, L.height (m) ile büyütülür. Yüz, kafa küresine boyanan bir dokudur (her karede ifadeye göre
// yeniden çizilir): kocaman parlak gözler, kaş, ağız, yanak. Gövde ve saç keçe dokulu Lambert malzeme (sahnenin ışığını ve gölgesini alır).
// L alanları: height, skin, cloth, skirt, boots, longHair, hairLen(0..1 boy oranı), shortHair, hat (helmet|mortar|peak), hatColor,
//   beard, buttons, trim (yelek bantları), sash, pocket, collar, child (büyük kafa), blush
// p alanları: expr (smile|laugh|grin|proud|surprised|worried|neutral), mouth 0..1, blink 0..1, look -1..1, lookY, armL/armR [kol°, dirsek°, ileri°],
//   bob (Toon pikseli; - yukarı), lean (° öne eğilme), turn (° gövde dönüşü), propL/propR (karanfil|karne|pen|simit)
import * as THREE from 'three';

const TEX = new Map();
function felt(hex, { rep = [2, 2], fuzz = .18 } = {}) {
  const key = hex + rep + fuzz; if (TEX.has(key)) return TEX.get(key);
  const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d');
  g.fillStyle = hex; g.fillRect(0, 0, 256, 256);
  let s = 7; const R = () => (s = (s * 9301 + 49297) % 233280) / 233280;
  const base = new THREE.Color(hex);
  for (let i = 0; i < 2600; i++) { const k = 1 + (R() - .5) * fuzz * 2, col = base.clone().multiplyScalar(k); g.fillStyle = '#' + col.getHexString(); g.globalAlpha = .5;
    g.fillRect(R() * 256, R() * 256, 1 + R() * 2.5, 1 + R() * 2.5); }
  g.globalAlpha = .12; g.strokeStyle = '#ffffff'; g.lineWidth = .8; for (let i = 0; i < 160; i++) { const x = R() * 256, y = R() * 256; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (R() - .5) * 8, y + (R() - .5) * 8); g.stroke(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...rep);
  const m = new THREE.MeshLambertMaterial({ map: t }); TEX.set(key, m); return m;
}
const sh = (hex, k) => { const c = new THREE.Color(hex); c.multiplyScalar(k); return '#' + c.getHexString(); };
function mesh(geo, mat, parent, pos = [0, 0, 0], rot = [0, 0, 0], scl = [1, 1, 1]) {
  const m = new THREE.Mesh(geo, mat); m.position.set(...pos); m.rotation.set(...rot); m.scale.set(...scl); m.castShadow = m.receiveShadow = true; parent.add(m); return m;
}
const D2R = Math.PI / 180;

// gövde dokusu: ön (u = 0/1 kenarları, Lathe/Capsule'da +z) düğmeler, bantlar, kuşak, cep
function bodyMat(L) {
  const c = document.createElement('canvas'); c.width = 512; c.height = 256; const g = c.getContext('2d');
  const base = felt(L.cloth || '#8899cc').map.image; g.drawImage(base, 0, 0, 256, 256); g.drawImage(base, 256, 0, 256, 256);
  const front = x => [x, 512 + x];                             // ön, dokunun iki kenarında
  if (L.trim) { g.fillStyle = L.trim; for (const y of [110, 170]) g.fillRect(0, y, 512, 16); }
  if (L.sash) { g.fillStyle = L.sash; for (const x0 of front(0)) { g.beginPath(); g.moveTo(x0 - 60, 40); g.lineTo(x0 - 30, 40); g.lineTo(x0 + 60, 256); g.lineTo(x0 + 30, 256); g.closePath(); g.fill(); } }
  if (L.buttons) { g.fillStyle = L.buttons; for (const x0 of front(0)) for (let y = 70; y < 230; y += 34) { g.beginPath(); g.arc(x0, y, 6, 0, 6.29); g.fill(); } }
  if (L.pocket) { g.strokeStyle = sh(L.cloth, .7); g.lineWidth = 3; for (const x0 of front(-60)) { g.strokeRect(x0 - 20, 150, 40, 34); } }
  if (L.collar) { g.fillStyle = '#f6f4ee'; for (const x0 of front(0)) { g.beginPath(); g.moveTo(x0 - 40, 14); g.lineTo(x0, 52); g.lineTo(x0 + 40, 14); g.lineTo(x0 + 26, 4); g.lineTo(x0, 30); g.lineTo(x0 - 26, 4); g.closePath(); g.fill(); } }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return new THREE.MeshLambertMaterial({ map: t });
}

const PROPS = {
  karanfil(grp) { const st = new THREE.MeshLambertMaterial({ color: '#3a8a3a' }), fl = felt('#d8283a', { fuzz: .25 });
    [[-.03, .2], [0, .24], [.03, .19]].forEach(([x, h]) => { mesh(new THREE.CylinderGeometry(.006, .006, h, 6), st, grp, [x, h / 2, 0]); mesh(new THREE.SphereGeometry(.035, 12, 8), fl, grp, [x, h, 0], [0, 0, 0], [1, .8, 1]); }); },
  karne(grp) { const c = document.createElement('canvas'); c.width = 128; c.height = 160; const g = c.getContext('2d'); g.fillStyle = '#fbf8ef'; g.fillRect(0, 0, 128, 160);
    g.fillStyle = '#c8323a'; g.fillRect(0, 0, 128, 26); g.strokeStyle = '#9a9ab6'; g.lineWidth = 3; for (let k = 0; k < 6; k++) { g.beginPath(); g.moveTo(14, 46 + k * 18); g.lineTo(90, 46 + k * 18); g.stroke(); }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; mesh(new THREE.BoxGeometry(.1, .13, .005), [0, 0, 0, 0, 0, 0].map(() => new THREE.MeshLambertMaterial({ map: t })), grp, [0, .06, .02]); },
  pen(grp) { mesh(new THREE.CylinderGeometry(.006, .006, .12, 8), new THREE.MeshLambertMaterial({ color: '#2a4a9a' }), grp, [0, .03, .02], [.6, 0, 0]); },
  simit(grp) { mesh(new THREE.TorusGeometry(.05, .018, 10, 20), felt('#c9803a'), grp, [0, .03, .03]); },
};

export class Clay {
  constructor(L, scene) {
    this.L = L; const H = L.height || 1.6, child = !!L.child;
    const g = this.g = new THREE.Group(); g.rotation.order = 'YXZ'; g.scale.setScalar(H); scene.add(g);
    const skin = felt(L.skin || '#f3d3bc', { fuzz: .08 }), cloth = bodyMat(L), shoe = felt(L.boots || '#3a2a2a');
    const hr = child ? .19 : .15;                                   // kafa yarıçapı (boy oranı)
    const shoulderY = child ? .5 : .6;
    // bacaklar ve ayakkabılar
    const legL = child ? .2 : .28;
    for (const s of [-1, 1]) { mesh(new THREE.CapsuleGeometry(.04, legL - .08, 4, 10), felt(L.legs || (L.skirt ? L.skin || '#f3d3bc' : sh(L.cloth || '#556', .7))), g, [s * .055, legL / 2 + .02, 0]);
      mesh(new THREE.SphereGeometry(.05, 14, 10), shoe, g, [s * .058, .03, .025], [0, 0, 0], [1, .65, 1.5]); }
    // gövde
    const bodyH = shoulderY - legL + .04;
    this.body = mesh(new THREE.CapsuleGeometry(child ? .12 : .13, bodyH - .2, 6, 20), cloth, g, [0, legL + bodyH / 2 - .02, 0], [0, 0, 0], [1, 1, .78]);
    if (L.skirt) mesh(new THREE.CylinderGeometry(.13, .2, child ? .14 : .18, 24, 1, true), felt(L.skirt), g, [0, legL + (child ? .05 : .07), 0]).material.side = THREE.DoubleSide;
    // kollar: omuz eklemi → üst kol → dirsek eklemi → ön kol + el
    this.arms = [-1, 1].map(s => {
      const sj = new THREE.Group(); sj.position.set(s * (child ? .13 : .15), shoulderY - .03, 0); g.add(sj);
      mesh(new THREE.CapsuleGeometry(.034, .1, 4, 8), cloth, sj, [0, -.07, 0]);
      const ej = new THREE.Group(); ej.position.set(0, -.15, 0); sj.add(ej);
      mesh(new THREE.CapsuleGeometry(.032, .08, 4, 8), cloth, ej, [0, -.06, 0]);
      const hand = new THREE.Group(); hand.position.set(0, -.14, 0); ej.add(hand);
      mesh(new THREE.SphereGeometry(.038, 12, 10), skin, hand);
      return { sj, ej, hand, s, prop: null, propName: null };
    });
    // kafa: boyalı yüz dokusu (u = .25 önde)
    const hj = this.headJ = new THREE.Group(); hj.position.set(0, shoulderY + hr * .78, 0); g.add(hj);
    this.faceC = document.createElement('canvas'); this.faceC.width = 1024; this.faceC.height = 512;
    this.faceT = new THREE.CanvasTexture(this.faceC); this.faceT.colorSpace = THREE.SRGBColorSpace;
    this.skinImg = skin.map.image;
    this.head = mesh(new THREE.SphereGeometry(hr, 40, 28), new THREE.MeshLambertMaterial({ map: this.faceT }), hj, [0, 0, 0], [0, 0, 0], [1, .96, .94]);
    this.hr = hr;
    // saç
    if (L.longHair || L.shortHair) {
      const hm = felt(L.longHair || L.shortHair, { fuzz: .22, rep: [3, 3] });
      // kafa tasını örten kep: arkaya yatık yarım küre (alın açık)
      mesh(new THREE.SphereGeometry(hr * 1.06, 32, 20, 0, Math.PI * 2, 0, Math.PI * .5), hm, hj, [0, hr * .06, -hr * .1], [-.62, 0, 0]);
      mesh(new THREE.SphereGeometry(hr * .5, 16, 10), hm, hj, [-hr * .3, hr * .62, hr * .62], [0, 0, .5], [1.2, .4, .6]);   // alnı az örten perçem
      if (L.longHair) {
        const len = (L.hairLen || .3);
        mesh(new THREE.CapsuleGeometry(hr * .92, len, 6, 16), hm, hj, [0, -len / 2 + hr * .1, -hr * .42], [0, 0, 0], [1.05, 1, .5]);
        for (const s of [-1, 1]) mesh(new THREE.CapsuleGeometry(hr * .18, hr * 1.6, 4, 10), hm, hj, [s * hr * .9, -hr * .6, -hr * .1], [0, 0, s * .1], [1, 1, .7]);
      } else mesh(new THREE.SphereGeometry(hr * .55, 16, 10), hm, hj, [hr * .18, hr * .72, hr * .55], [0, 0, 0], [1.3, .45, .7]);   // perçem
    }
    // şapkalar
    const hat = L.hat, hc = L.hatColor;
    if (hat === 'helmet') { const m = felt(hc || '#f6f4ee', { fuzz: .05 }); mesh(new THREE.SphereGeometry(hr * 1.12, 28, 16, 0, Math.PI * 2, 0, Math.PI * .5), m, hj, [0, hr * .2, 0]);
      mesh(new THREE.CylinderGeometry(hr * 1.3, hr * 1.3, hr * .08, 28), m, hj, [0, hr * .2, hr * .08], [.12, 0, 0], [1, 1, 1.1]); }
    if (hat === 'mortar') { const m = felt(hc || '#22222c'); mesh(new THREE.CylinderGeometry(hr * .95, hr * 1.0, hr * .5, 24), m, hj, [0, hr * .72, -hr * .05]);
      mesh(new THREE.BoxGeometry(hr * 2.4, hr * .08, hr * 2.4), m, hj, [0, hr * 1.0, -hr * .05], [0, Math.PI / 4, 0]);
      mesh(new THREE.CylinderGeometry(.006, .006, hr * .9, 6), new THREE.MeshLambertMaterial({ color: '#c8323a' }), hj, [hr * .9, hr * .6, hr * .3]); }
    if (hat === 'peak') { const m = felt(hc || '#55663a'); mesh(new THREE.CylinderGeometry(hr * 1.15, hr * .95, hr * .5, 24), m, hj, [0, hr * .78, 0]);
      mesh(new THREE.SphereGeometry(hr * .8, 16, 8, 0, Math.PI * 2, 0, Math.PI * .5), new THREE.MeshLambertMaterial({ color: '#2a2420' }), hj, [0, hr * .56, hr * .55], [.2, 0, 0], [1, .12, .7]);
      mesh(new THREE.SphereGeometry(hr * .12, 12, 8), new THREE.MeshLambertMaterial({ color: '#d8b04a' }), hj, [0, hr * .82, hr * 1.02]); }
    this.drawFace({});
  }
  // ---- yüz: göz, kaş, ağız, yanak, sakal
  drawFace(p) {
    const g = this.faceC.getContext('2d'), L = this.L, W = 1024, H = 512;
    g.drawImage(this.skinImg, 0, 0, W, H);
    const cx = 256 + (p.gazeX || 0) * 6, cy = 250, ex = 78, ey = cy - 8;
    const e = p.expr || 'smile', blink = p.blink || 0, mouth = p.mouth || 0;
    if (L.beard) { g.fillStyle = L.beard; g.beginPath(); g.ellipse(cx, cy + 82, 120, 62, 0, 0, Math.PI); g.lineTo(cx - 120, cy + 40); g.quadraticCurveTo(cx, cy + 100, cx + 120, cy + 40); g.fill(); }
    if (L.blush !== false) { g.fillStyle = 'rgba(240,130,140,.45)'; for (const s of [-1, 1]) { g.beginPath(); g.ellipse(cx + s * 108, cy + 40, 30, 17, 0, 0, 6.29); g.fill(); } }
    const happyClosed = e === 'laugh' || e === 'proud';
    for (const s of [-1, 1]) {
      const x = cx + s * ex;
      g.strokeStyle = '#2a1e24'; g.fillStyle = '#2a1e24'; g.lineCap = 'round';
      if (happyClosed || blink > .6) {                                   // kapalı göz: ∩ (mutlu) ya da düz çizgi (kırpma)
        g.lineWidth = 9; g.beginPath(); if (happyClosed) g.arc(x, ey + 10, 22, Math.PI * 1.1, Math.PI * 1.9); else { g.moveTo(x - 22, ey + 4); g.lineTo(x + 22, ey + 4); } g.stroke();
      } else {
        const r = e === 'surprised' ? 38 : 32, sy = blink > .3 ? .5 : 1;
        g.beginPath(); g.ellipse(x, ey, r * .82, r * sy, 0, 0, 6.29); g.fill();
        g.fillStyle = '#ffffff'; g.beginPath(); g.arc(x - 10, ey - 11 * sy, 10, 0, 6.29); g.fill(); g.beginPath(); g.arc(x + 9, ey + 9 * sy, 4.5, 0, 6.29); g.fill();
      }
      // kaş
      const lift = e === 'worried' ? 16 : e === 'surprised' ? -4 : -3, by = ey - (e === 'surprised' ? 54 : 44);
      g.strokeStyle = L.brow || sh(L.longHair || L.shortHair || L.beard || '#5a3a2a', .75); g.lineWidth = 8;
      g.beginPath(); g.moveTo(x - s * 22, by - lift); g.lineTo(x + s * 22, by + lift * .3); g.stroke();
    }
    // ağız
    const my = cy + 62; g.lineCap = 'round';
    if (mouth > .1 || e === 'laugh' || e === 'surprised' || e === 'grin') {
      const open = Math.max(mouth, e === 'laugh' ? .8 : e === 'grin' ? .45 : e === 'surprised' ? .55 : 0);
      g.fillStyle = '#7a2a3a'; g.beginPath();
      if (e === 'surprised') g.ellipse(cx, my + 4, 14, 10 + open * 14, 0, 0, 6.29);
      else { g.moveTo(cx - 34, my - 4); g.quadraticCurveTo(cx, my + 4 + open * 46, cx + 34, my - 4); g.quadraticCurveTo(cx, my + 6, cx - 34, my - 4); }
      g.fill(); g.strokeStyle = '#2a1e24'; g.lineWidth = 5; g.stroke();
      if (e === 'grin' || e === 'laugh') { g.fillStyle = '#fbf8f2'; g.fillRect(cx - 24, my - 3, 48, 9); }
    } else {
      g.strokeStyle = '#2a1e24'; g.lineWidth = 7; g.beginPath();
      if (e === 'worried') g.arc(cx, my + 22, 20, Math.PI * 1.2, Math.PI * 1.8); else if (e === 'neutral') { g.moveTo(cx - 16, my); g.lineTo(cx + 16, my); } else g.arc(cx, my - 18, 28, Math.PI * .2, Math.PI * .8);
      g.stroke();
    }
    // burun: küçük gölgeli nokta
    g.fillStyle = 'rgba(200,120,110,.55)'; g.beginPath(); g.ellipse(cx, cy + 22, 10, 7, 0, 0, 6.29); g.fill();
    this.faceT.needsUpdate = true;
  }
  show() { this.g.visible = true; }
  hide() { this.g.visible = false; }
  castFrom() { }
  place(x, y, z, cam) {
    this.g.position.set(x, y, z);
    this.cam = cam;
  }
  draw(p = {}) {
    const g = this.g, H = this.L.height || 1.6;
    // kameraya %75 dön + istenen dönüş
    const toCam = this.cam ? Math.atan2(this.cam.position.x - g.position.x, this.cam.position.z - g.position.z) : 0;
    g.rotation.set(0, toCam * .75 + (p.turn || 0) * D2R + (p.look || 0) * .25, 0);
    g.position.y += -(p.bob || 0) / 1000;
    // öne eğilme: ayaklar sabit, gövde ve baş eğilir (grubun x ekseni)
    g.rotation.x = (p.lean || 0) * D2R * .9;
    this.headJ.rotation.set(-(p.lookY || 0) * .22, (p.look || 0) * .35, (p.tilt || 0) * D2R);
    for (const a of this.arms) {
      const v = (a.s < 0 ? p.armL : p.armR) || [10, 6];
      const [up, el, fw = 0] = v;
      a.sj.rotation.set(-fw * D2R, 0, a.s * up * D2R);
      a.ej.rotation.set(-(el * .5) * D2R, 0, a.s * el * .4 * D2R);
      const want = a.s < 0 ? p.propL : p.propR;
      if (want !== a.propName) { if (a.prop) a.hand.remove(a.prop); a.prop = null; a.propName = want;
        if (want && PROPS[want]) { a.prop = new THREE.Group(); a.prop.rotation.z = -a.s * up * D2R * .6; PROPS[want](a.prop); a.hand.add(a.prop); } }
    }
    this.drawFace(p);
  }
}
