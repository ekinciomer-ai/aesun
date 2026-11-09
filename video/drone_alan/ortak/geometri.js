// Drone geometrisi koddan. Ölçüler metre, kin.js SPEC'ten. Her parça bir "parca" kaydıyla tutulur:
// patlatılmış görünümde gideceği yön ve etiketi oradan okunur. guncelle(durum) pozlar.
import * as THREE from 'three';
import {SPEC} from './kin.js';

const V3 = THREE.Vector3;
export const RENK = {ink: '#16181b', govde: '#e8eaed', koyu: '#2a2e35', metal: '#9aa3ad', karbon: '#23262b'};
const mat = (c, r = 0.55, m = 0.1, x = {}) => new THREE.MeshStandardMaterial({color: c, roughness: r, metalness: m, envMapIntensity: 0.5, ...x});

function pervane(D, m) {
  const g = new THREE.Group();
  const kanat = new THREE.Mesh(new THREE.BoxGeometry(D, 0.012 * D / 1.375 + 0.004, 0.075 * D / 1.375 + 0.012), m);
  g.add(kanat);
  const disk = new THREE.Mesh(new THREE.CircleGeometry(D / 2, 48), new THREE.MeshBasicMaterial({color: '#5b6068', transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide}));
  disk.rotation.x = -Math.PI / 2;
  g.add(disk);
  g.userData.disk = disk;
  return g;
}
const golge = (o) => { o.traverse((n) => { if (n.isMesh && !n.material.transparent) { n.castShadow = true; n.receiveShadow = true; } }); return o; };

// ----- büyük çerçeve (T50 / FlyCart 30 ortak): 4 kol, her kolda eş eksenli 2 pervane
function buyukCerceve(spec, P, kok) {
  const gov = mat(RENK.govde, 0.5), koyu = mat(RENK.koyu, 0.55, 0.2), kar = mat(RENK.karbon, 0.6, 0.1), met = mat(RENK.metal, 0.45, 0.7);
  const R = spec.aks / 2;                                  // merkezden motor eksenine
  const govde = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.34, 0.9), gov);
  govde.position.y = 0.55; kok.add(govde);
  P.push({ad: 'GÖVDE', alt: 'UÇUŞ KARTI · GPS · TELSİZ', o: govde, yon: new V3(0, 0, 0)});
  const ust = new THREE.Mesh(new THREE.SphereGeometry(0.33, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), gov);
  ust.scale.set(0.95, 0.4, 1.3); ust.position.y = 0.72; kok.add(ust);
  const kollar = [];
  for (let i = 0; i < 4; i++) {
    const a = Math.PI / 4 + i * Math.PI / 2;
    const d = new V3(Math.cos(a), 0, Math.sin(a));
    const kol = new THREE.Group();
    const boru = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.04, R - 0.25, 16), kar);
    boru.rotation.z = Math.PI / 2; boru.position.x = (R - 0.25) / 2 + 0.25; kol.add(boru);
    const mot1 = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.1, 0.12, 24), met); mot1.position.set(R, 0.08, 0); kol.add(mot1);
    const mot2 = mot1.clone(); mot2.position.y = -0.08; kol.add(mot2);
    const p1 = pervane(spec.pervaneD, kar); p1.position.set(R, 0.17, 0); kol.add(p1);
    const p2 = pervane(spec.pervaneD, kar); p2.position.set(R, -0.17, 0); kol.add(p2);
    kol.rotation.y = -a; kol.position.y = 0.6; kok.add(kol);
    kollar.push({kol, p: [p1, p2], d, a});
    P.push({ad: 'EŞ EKSENLİ MOTOR', alt: `2 × Ø${Math.round(spec.pervaneD * 1000)} MM PERVANE`, o: mot1, yon: new V3(0, 0, 0), sadece: i === 0});
  }
  // iniş takımı
  for (const sx of [-1, 1]) {
    const ay = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.56, 10), koyu); ay.position.set(sx * 0.42, 0.25, 0); ay.rotation.z = sx * 0.35; kok.add(ay);
    const kizak = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.1, 10), koyu); kizak.rotation.x = Math.PI / 2; kizak.position.set(sx * 0.52, 0.0, 0); kok.add(kizak);
  }
  return {kollar, govde};
}

export function tarimDronu() {
  const S = SPEC.tarim, kok = new THREE.Group(), P = [];
  const {kollar} = buyukCerceve(S, P, kok);
  const tank = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.4, 0.5), mat('#f4f5f6', 0.45, 0, {transparent: true, opacity: 0.92}));
  tank.position.y = 0.3; kok.add(tank);
  const sivi = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.36, 0.46), mat('#3d8fe0', 0.3, 0, {transparent: true, opacity: 0.75}));
  sivi.position.y = 0.3; kok.add(sivi);
  P.push({ad: 'İLAÇ TANKI', alt: `${S.tankL} L`, o: tank, yon: new V3(0, -0.15, 0.55)});
  const pompa = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.14, 20), mat(RENK.koyu, 0.5, 0.3));
  pompa.rotation.z = Math.PI / 2; pompa.position.set(0, 0.12, -0.3); kok.add(pompa);
  P.push({ad: 'POMPA', alt: `EN ÇOK ${S.debiMax} L/DK`, o: pompa, yon: new V3(0, -0.2, -0.45)});
  const nozullar = [];
  for (const k of [kollar[1], kollar[2]]) { // arka kollar
    const n = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.04, 0.08, 20), mat('#d6182b', 0.5, 0.1));
    n.position.copy(k.d.clone().multiplyScalar(S.aks / 2 * 0.72)); n.position.y = 0.28; kok.add(n); nozullar.push(n);
  }
  P.push({ad: 'SANTRİFÜJ PÜSKÜRTÜCÜ', alt: `${S.nozul} ADET · 4–11 M ŞERİT`, o: nozullar[0], yon: new V3(0, -0.3, 0)});
  const radarlar = [];
  for (const z of [-1, 1]) {
    const r = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.12, 0.05), mat(RENK.koyu, 0.45, 0.3));
    r.position.set(0, 0.5, z * 0.48); kok.add(r); radarlar.push(r);
  }
  P.push({ad: 'FAZ DİZİLİ RADAR', alt: `ÖN + ARKA · ${S.radar[0]}–${S.radar[1]} M`, o: radarlar[0], yon: new V3(0, 0, 0.35)});
  return {kok: golge(kok), P, kollar, ozel: {tank, sivi, nozullar, radarlar}, olcek: S.aks};
}

export function gesDronu() {
  const S = SPEC.ges, kok = new THREE.Group(), P = [];
  const gov = mat(RENK.koyu, 0.5, 0.2), kar = mat(RENK.karbon, 0.6, 0.1), met = mat(RENK.metal, 0.45, 0.7);
  const govde = new THREE.Mesh(new THREE.BoxGeometry(0.215, 0.12, 0.365), gov); govde.position.y = 0.16; kok.add(govde);
  const kapak = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.05, 0.3), mat('#3a3f48', 0.5, 0.2)); kapak.position.y = 0.245; kok.add(kapak);
  P.push({ad: 'GÖVDE', alt: 'IP55 · ' + S.sure + ' DK UÇUŞ', o: govde, yon: new V3(0, 0, 0)});
  const R = S.aks / 2, kollar = [];
  for (let i = 0; i < 4; i++) {
    const a = Math.PI / 4 + i * Math.PI / 2, d = new V3(Math.cos(a), 0, Math.sin(a)), kol = new THREE.Group();
    const boru = new THREE.Mesh(new THREE.BoxGeometry(R - 0.08, 0.025, 0.03), kar); boru.position.x = (R - 0.08) / 2 + 0.08; kol.add(boru);
    const mot = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.034, 0.045, 20), met); mot.position.set(R, 0.02, 0); kol.add(mot);
    const p = pervane(S.pervaneD, kar); p.position.set(R, 0.05, 0); kol.add(p);
    kol.rotation.y = -a; kol.position.y = 0.18; kok.add(kol); kollar.push({kol, p: [p], d, a});
  }
  const gimbal = new THREE.Group();
  const gk = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.09, 0.08), mat('#1c1f24', 0.45, 0.3)); gimbal.add(gk);
  const lens = (x, r, c) => { const l = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.012, 24), mat(c, 0.2, 0.6)); l.rotation.x = Math.PI / 2; l.position.set(x, 0, 0.042); gimbal.add(l); return l; };
  const termal = lens(-0.03, 0.017, '#f05a23'); lens(0.0, 0.013, '#0b0d10'); lens(0.03, 0.013, '#0b0d10');
  gimbal.position.set(0, 0.07, 0.2); kok.add(gimbal);
  P.push({ad: 'TERMAL KAMERA', alt: `${S.termalPx[0]}×${S.termalPx[1]} · <${S.netd} mK`, o: gimbal, yon: new V3(0, -0.14, 0.12)});
  for (const sx of [-1, 1]) { const ay = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.09, 0.16), gov); ay.position.set(sx * 0.09, 0.07, 0); kok.add(ay); }
  return {kok: golge(kok), P, kollar, ozel: {gimbal, termal}, olcek: S.aks};
}

export function kargoDronu() {
  const S = SPEC.kargo, kok = new THREE.Group(), P = [];
  const {kollar} = buyukCerceve(S, P, kok);
  const vinc = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.18, 24), mat(RENK.koyu, 0.5, 0.3));
  vinc.rotation.z = Math.PI / 2; vinc.position.y = 0.3; kok.add(vinc);
  P.push({ad: 'VİNÇ', alt: `${S.halat} M HALAT · ${S.halatHiz} M/S`, o: vinc, yon: new V3(0.4, -0.05, 0)});
  const parasut = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.12, 0.2), mat('#f05a23', 0.55, 0.05));
  parasut.position.set(0, 0.86, -0.2); kok.add(parasut);
  P.push({ad: 'PARAŞÜT', alt: `EN AZ ${S.parasut} M'DE AÇILIR`, o: parasut, yon: new V3(0, 0.35, -0.1)});
  const halat = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 1, 8), mat('#16181b', 0.6, 0));
  halat.position.y = 0.3; kok.add(halat);
  const kutu = new THREE.Group();
  const kb = new THREE.Mesh(new THREE.BoxGeometry(0.57, 0.38, 0.42), mat('#e2c08d', 0.7, 0)); kb.position.y = -0.19; kutu.add(kb);
  const bant = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.39, 0.06), mat('#f05a23', 0.6, 0)); bant.position.y = -0.19; kutu.add(bant);
  const kanca = new THREE.Mesh(new THREE.TorusGeometry(0.04, 0.01, 8, 20), mat(RENK.metal, 0.4, 0.8)); kanca.position.y = 0.02; kutu.add(kanca);
  kok.add(kutu);
  P.push({ad: 'YÜK KUTUSU', alt: `EN ÇOK ${S.yukMax} KG`, o: kutu, yon: new V3(0, -0.2, 0)});
  return {kok: golge(kok), P, kollar, ozel: {vinc, halat, kutu, parasut}, olcek: S.aks};
}

// pervaneleri döndür (eş eksenli çiftler ters yönde), patlatma oranını uygula
export function poz(d, {t, hiz = 1, patla = 0}) {
  d.kollar.forEach((k, i) => {
    k.p.forEach((p, j) => {
      const yon = (i % 2 === 0 ? 1 : -1) * (j === 0 ? 1 : -1);
      p.rotation.y = yon * t * 31 * hiz;
      p.userData.disk.material.opacity = 0.16 * Math.min(1, hiz);
    });
    k.kol.position.x = k.d.x * 0.35 * patla;
    k.kol.position.z = k.d.z * 0.35 * patla;
  });
  for (const p of d.P) {
    if (!p.o.userData.ilk) p.o.userData.ilk = p.o.position.clone();
    p.o.position.copy(p.o.userData.ilk).addScaledVector(p.yon, patla * 1.6);
  }
}
