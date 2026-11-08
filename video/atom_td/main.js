// Atom (nükleer) teardown filmi (Kozmos Lab, Enerji Üretim Kaynakları 04). VVER-1200 tipi santral, Akkuyu.
// Kayıt arayüzü: window.HAZIR, kurgu(K), kare(t) — kare(t) t'nin saf fonksiyonu.
import * as THREE from 'three';
import {EffectComposer} from 'three/addons/postprocessing/EffectComposer.js';
import {GTAOPass} from 'three/addons/postprocessing/GTAOPass.js';
import {OutputPass} from 'three/addons/postprocessing/OutputPass.js';
import {Pass} from 'three/addons/postprocessing/Pass.js';
import {RenderPass} from 'three/addons/postprocessing/RenderPass.js';
import {ACC, KES, KES2, MAT, mats, buildAda, buildTurbinBina, buildKule, buildYakit, nukleus, RPV, YK} from './model.js';
import {createUI} from './ui.js';

const V3 = THREE.Vector3;
const D2R = Math.PI / 180;
const Q = new URLSearchParams(location.search);
const DIL = Q.get('dil') === 'en' ? 'en' : 'tr';
const cl = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const ss = (a, b, x) => {
  const u = cl((x - a) / (b - a));
  return u * u * u * (u * (u * 6 - 15) + 10);
};
const lerp = (a, b, k) => a + (b - a) * k;
const lerpLog = (a, b, k) => Math.exp(Math.log(a) + (Math.log(b) - Math.log(a)) * k);

// ------------------------------------------------------------ metinler (VVER-1200: 3212 MWt, ~1200 MWe, 16,5 MPa, 298→329 °C)
const LX = {
  tr: {
    no: '04', bolum: 'BÖLÜM', seri: 'ENERJİ ÜRETİM KAYNAKLARI', etut: 'MEKANİZMA ETÜDÜ', canli: 'CANLI VERİ', egri: 'ENERJİ AKIŞI', ondalik: ',',
    rows: ['ISIL GÜÇ', 'ELEKTRİK', 'BASINÇ', 'ÇIKIŞ ISISI', 'NÖTRON k'],
    g: ['ISI', 'ELEKTRİK', 'ATIK ISI'],
    bolumler: ['hero', 'fisyon', 'zincir', 'yakit', 'isi', 'turbin', 'guvenlik', 'turkiye'],
    ad: {hero: 'GİRİŞ', fisyon: 'FİSYON', zincir: 'ZİNCİR', yakit: 'YAKIT', isi: 'ISI', turbin: 'TÜRBİN', guvenlik: 'GÜVENLİK', turkiye: 'AKKUYU', son: 'SON'},
    baslik: {hero: 'Atom', fisyon: 'Fisyon', zincir: 'Zincirleme Tepkime', yakit: 'Yakıt', isi: 'Isı', turbin: 'Buhar ve Türbin', guvenlik: 'Güvenlik', turkiye: 'Akkuyu', son: 'Atom'},
    alt: {
      hero: 'VVER-1200 · BASINÇLI SU REAKTÖRÜ', fisyon: 'BİR NÖTRON, BİR BÖLÜNME', zincir: 'KONTROL ÇUBUKLARIYLA DENGE', yakit: 'PELET → ÇUBUK → DEMET',
      isi: 'BİRİNCİL DEVRE · 16,5 MPa', turbin: 'İKİNCİL DEVRE · 7,0 MPa BUHAR', guvenlik: 'ÇELİK KAP + ÇİFT BETON KABUK', turkiye: 'MERSİN · 4 ÜNİTE', son: 'ATOMUN İÇİNDEKİ ENERJİ',
    },
    e: {
      pelet: ['URANYUM PELETİ', 'UO₂ · Ø 7,6 mm'], komur: ['≈ 1 TON KÖMÜR', 'aynı enerji'],
      u235: ['URANYUM-235', '92 proton · 143 nötron'], notron: ['NÖTRON', ''], ba: ['BARYUM-141', 'fisyon ürünü'], kr: ['KRİPTON-92', 'fisyon ürünü'], yeni: ['3 YENİ NÖTRON', ''], enerji: ['≈ 200 MeV', 'ısıya dönüşür'],
      cubukK: ['KONTROL ÇUBUKLARI', 'nötron yutar'],
      zarf: ['ZİRKONYUM ZARF', 'Ø 9,1 mm'], yigin: ['PELET YIĞINI', ''], demet: ['YAKIT DEMETİ', '312 çubuk · altıgen'], boy: ['AKTİF BOY', '3,73 m'],
      kap: ['BASINÇ KABI', 'çelik'], cekirdek: ['ÇEKİRDEK', '163 yakıt demeti'], ug: ['BUHAR ÜRETECİ', 'yatay · 4 adet'], pompa: ['ANA POMPA', ''], basincli: ['BASINÇLANDIRICI', ''], sicakBacak: ['SICAK BACAK', '329 °C'],
      buharHatti: ['ANA BUHAR HATTI', '7,0 MPa'], ybTurbin: ['YÜKSEK BASINÇ', 'türbin'], abTurbin: ['ALÇAK BASINÇ', 'türbin'], jenerator: ['JENERATÖR', '≈ 1200 MWe'], kondenser: ['KONDENSER', 'buharı suya çevirir'], kule: ['SOĞUTMA KULESİ', 'çıkan: su buharı'],
      icKoruma: ['İÇ KORUMA BİNASI', 'öngermeli beton'], disKoruma: ['DIŞ KORUMA BİNASI', 'beton'], yakalayici: ['ÇEKİRDEK YAKALAYICI', ''], crdm: ['ÇUBUK SÜRÜCÜLERİ', ''],
      akkuyu: ['AKKUYU NGS', 'Mersin · Gülnar'], deniz: ['AKDENİZ', 'deniz suyu ile soğutma'],
    },
    olcu: {pelet: '≈ 1 cm', dort: '4 × 1200 MW = 4800 MW'},
    kart: () => `<div class="mo" style="font-size:30px;letter-spacing:.2em;color:#7d828a">SIRADAKİ BÖLÜM</div><div style="font-size:112px;font-weight:700;letter-spacing:-.03em;margin-top:6px">Jeotermal<span style="color:${ACC}">.</span></div><div class="mo" style="font-size:26px;letter-spacing:.14em;margin-top:8px;color:#5d636b">ENERJİ ÜRETİM KAYNAKLARI · 05</div>`,
  },
  en: {
    no: '04', bolum: 'EPISODE', seri: 'ENERGY SOURCES', etut: 'MECHANISM STUDY', canli: 'LIVE DATA', egri: 'ENERGY FLOW', ondalik: '.',
    rows: ['THERMAL', 'ELECTRIC', 'PRESSURE', 'OUTLET TEMP', 'NEUTRON k'],
    g: ['HEAT', 'ELECTRIC', 'WASTE HEAT'],
    bolumler: ['hero', 'fisyon', 'zincir', 'yakit', 'isi', 'turbin', 'guvenlik', 'turkiye'],
    ad: {hero: 'INTRO', fisyon: 'FISSION', zincir: 'CHAIN', yakit: 'FUEL', isi: 'HEAT', turbin: 'TURBINE', guvenlik: 'SAFETY', turkiye: 'AKKUYU', son: 'END'},
    baslik: {hero: 'The Atom', fisyon: 'Fission', zincir: 'Chain Reaction', yakit: 'Fuel', isi: 'Heat', turbin: 'Steam & Turbine', guvenlik: 'Safety', turkiye: 'Akkuyu', son: 'The Atom'},
    alt: {
      hero: 'VVER-1200 · PRESSURISED WATER REACTOR', fisyon: 'ONE NEUTRON, ONE SPLIT', zincir: 'BALANCED BY CONTROL RODS', yakit: 'PELLET → ROD → ASSEMBLY',
      isi: 'PRIMARY CIRCUIT · 16.5 MPa', turbin: 'SECONDARY CIRCUIT · 7.0 MPa STEAM', guvenlik: 'STEEL VESSEL + DOUBLE CONCRETE SHELL', turkiye: 'MERSIN · 4 UNITS', son: 'THE ENERGY INSIDE THE ATOM',
    },
    e: {
      pelet: ['URANIUM PELLET', 'UO₂ · Ø 7.6 mm'], komur: ['≈ 1 TONNE OF COAL', 'same energy'],
      u235: ['URANIUM-235', '92 protons · 143 neutrons'], notron: ['NEUTRON', ''], ba: ['BARIUM-141', 'fission product'], kr: ['KRYPTON-92', 'fission product'], yeni: ['3 NEW NEUTRONS', ''], enerji: ['≈ 200 MeV', 'becomes heat'],
      cubukK: ['CONTROL RODS', 'absorb neutrons'],
      zarf: ['ZIRCONIUM CLADDING', 'Ø 9.1 mm'], yigin: ['PELLET STACK', ''], demet: ['FUEL ASSEMBLY', '312 rods · hexagonal'], boy: ['ACTIVE LENGTH', '3.73 m'],
      kap: ['PRESSURE VESSEL', 'steel'], cekirdek: ['CORE', '163 fuel assemblies'], ug: ['STEAM GENERATOR', 'horizontal · 4 units'], pompa: ['MAIN PUMP', ''], basincli: ['PRESSURISER', ''], sicakBacak: ['HOT LEG', '329 °C'],
      buharHatti: ['MAIN STEAM LINE', '7.0 MPa'], ybTurbin: ['HIGH PRESSURE', 'turbine'], abTurbin: ['LOW PRESSURE', 'turbine'], jenerator: ['GENERATOR', '≈ 1200 MWe'], kondenser: ['CONDENSER', 'steam back to water'], kule: ['COOLING TOWER', 'plume: water vapour'],
      icKoruma: ['INNER CONTAINMENT', 'prestressed concrete'], disKoruma: ['OUTER CONTAINMENT', 'concrete'], yakalayici: ['CORE CATCHER', ''], crdm: ['ROD DRIVES', ''],
      akkuyu: ['AKKUYU NPP', 'Mersin · Gülnar'], deniz: ['MEDITERRANEAN', 'seawater cooling'],
    },
    olcu: {pelet: '≈ 1 cm', dort: '4 × 1200 MW = 4800 MW'},
    kart: () => `<div class="mo" style="font-size:30px;letter-spacing:.2em;color:#7d828a">NEXT EPISODE</div><div style="font-size:112px;font-weight:700;letter-spacing:-.03em;margin-top:6px">Geothermal<span style="color:${ACC}">.</span></div><div class="mo" style="font-size:26px;letter-spacing:.14em;margin-top:8px;color:#5d636b">ENERGY SOURCES · 05</div>`,
  },
};
const L = LX[DIL];

// ------------------------------------------------------------ sahne kurulumu
mats();
const app = document.getElementById('app');
const canvas = document.createElement('canvas');
canvas.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;display:block';
app.appendChild(canvas);
const W = innerWidth, H = innerHeight;
const renderer = new THREE.WebGLRenderer({canvas, antialias: false, preserveDrawingBuffer: true});
renderer.setPixelRatio(1);
renderer.setSize(W, H, false);
renderer.toneMapping = THREE.NeutralToneMapping;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.VSMShadowMap;
renderer.localClippingEnabled = true;
const scene = new THREE.Scene();
const BG = '#e8e9eb';
{
  const c = document.createElement('canvas');
  c.width = 4;
  c.height = 512;
  const g = c.getContext('2d');
  const gr = g.createLinearGradient(0, 0, 0, 512);
  gr.addColorStop(0, '#f4f4f5');
  gr.addColorStop(0.6, '#eaebed');
  gr.addColorStop(1, '#e3e4e6');
  g.fillStyle = gr;
  g.fillRect(0, 0, 4, 512);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  scene.background = tex;
}
scene.fog = new THREE.Fog(BG, 200, 900);
const camera = new THREE.PerspectiveCamera(40, W / H, 0.1, 4000);
const composer = new EffectComposer(renderer, new THREE.WebGLRenderTarget(W, H, {type: THREE.HalfFloatType, samples: 4}));
composer.setPixelRatio(1);
composer.setSize(W, H);
composer.addPass(new RenderPass(scene, camera));
const gtao = new GTAOPass(scene, camera, W, H);
gtao.output = GTAOPass.OUTPUT.Default;
gtao.blendIntensity = 0.75;
gtao.updateGtaoMaterial({radius: 1, distanceExponent: 1.4, thickness: 0.6, scale: 1.0, samples: 12, distanceFallOff: 1.0, screenSpaceRadius: false});
gtao.updatePdMaterial({lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 6, rings: 2, samples: 12});
class Toggle extends Pass {
  constructor(fn) {
    super();
    this.needsSwap = false;
    this.fn = fn;
  }
  render() {
    this.fn();
  }
}
const yerler = [];
composer.addPass(new Toggle(() => yerler.forEach((o) => (o.userData.v = o.visible, o.visible = false))));
composer.addPass(gtao);
composer.addPass(new Toggle(() => yerler.forEach((o) => (o.visible = o.userData.v))));
composer.addPass(new OutputPass());
// stüdyo ortamı: yumuşak ışık kutuları
{
  const env = new THREE.Scene();
  env.background = new THREE.Color('#dfe1e4');
  const box = (w, h, pos, k) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({color: new THREE.Color(1, 1, 1).multiplyScalar(k), side: THREE.DoubleSide}));
    m.position.copy(pos);
    m.lookAt(0, 0, 0);
    env.add(m);
  };
  box(12, 12, new V3(0, 14, 2), 2.4);
  box(3, 14, new V3(-12, 4, 6), 3.0);
  box(3, 14, new V3(12, 4, -4), 2.0);
  box(18, 2, new V3(0, 2, 14), 1.4);
  const g = new THREE.Mesh(new THREE.CircleGeometry(40, 32), new THREE.MeshBasicMaterial({color: '#c9cbce', side: THREE.DoubleSide}));
  g.rotation.x = -Math.PI / 2;
  g.position.y = -2;
  env.add(g);
  const pm = new THREE.PMREMGenerator(renderer);
  scene.environment = pm.fromScene(env, 0.02).texture;
  scene.environmentIntensity = 0.9;
  pm.dispose();
}
const SUN = new V3(-0.42, 0.8, 0.43).normalize();
const sun = new THREE.DirectionalLight('#fffaf2', 2.4);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.radius = 8;
sun.shadow.blurSamples = 16;
sun.shadow.bias = -0.0004;
scene.add(sun, sun.target);
scene.add(new THREE.HemisphereLight('#ffffff', '#cfd2d6', 0.7));
const zemin = new THREE.Mesh(new THREE.PlaneGeometry(8000, 8000), new THREE.MeshStandardMaterial({color: '#e1e2e4', roughness: 0.95, metalness: 0}));
zemin.rotation.x = -Math.PI / 2;
zemin.receiveShadow = true;
scene.add(zemin);
yerler.push(zemin);


// ------------------------------------------------------------ dünyalar (hepsi orijinde; görünürlükle seçilir)
const ADA = buildAda();
const TBN = buildTurbinBina();
TBN.root.position.set(0, 0, -78);
const KULE = buildKule();
KULE.root.position.set(150, 0, -230);
const santral = new THREE.Group();
santral.add(ADA.root, TBN.root);
scene.add(santral, KULE.root);
// buhar bulutu (kule ağzından)
const GT = (() => {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const x = c.getContext('2d');
  const g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.45, 'rgba(255,255,255,.55)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g;
  x.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(c);
})();
const bulut = [];
const bulutG = new THREE.Group();
for (let i = 0; i < 110; i++) {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({map: GT, color: '#cfd5dc', transparent: true, depthWrite: false, opacity: 0}));
  bulutG.add(s);
  bulut.push({s, f: (i * 0.618) % 1, a: (i * 2.399) % (Math.PI * 2), r: ((i * 7) % 11) / 11});
}
KULE.root.add(bulutG);
yerler.push(bulutG);
// Akkuyu: 4 ünite + deniz
const akkuyu = new THREE.Group();
for (let i = 0; i < 4; i++) {
  const u = new THREE.Group();
  const a = santral.clone(true);
  u.add(a);
  u.position.set(-195 + i * 130, 0, 0);
  akkuyu.add(u);
}
const deniz = new THREE.Mesh(new THREE.PlaneGeometry(4000, 2000), MAT.deniz);
deniz.rotation.x = -Math.PI / 2;
deniz.position.set(0, 0.15, 1080);
deniz.receiveShadow = true;
akkuyu.add(deniz);
scene.add(akkuyu);
// yakıt dünyası
const YAK = buildYakit();
scene.add(YAK.root);
// mikro dünya: fisyon + zincir
const mikro = new THREE.Group();
scene.add(mikro);
const U = nukleus(92, 235, 0.5);
U.position.set(0, 6, 0);
const BA = nukleus(56, 141, 0.5);
const KR = nukleus(36, 92, 0.5);
const notronG = new THREE.SphereGeometry(0.5, 20, 14);
const nAcc = new THREE.Mesh(notronG, MAT.acc);
nAcc.castShadow = true;
const yeniN = [0, 1, 2].map(() => {
  const m = new THREE.Mesh(notronG, MAT.acc);
  m.castShadow = true;
  mikro.add(m);
  return m;
});
const isik = new THREE.Sprite(new THREE.SpriteMaterial({map: GT, color: ACC, transparent: true, depthWrite: false, opacity: 0}));
const fis = new THREE.Group();
fis.add(U, BA, KR, nAcc, isik);
yerler.push(isik);
mikro.add(fis);
// zincir: altıgen ızgarada çekirdekler
const zincir = new THREE.Group();
mikro.add(zincir);
const ZN = [];
{
  const S = 11;
  const pts = [];
  for (let q = -4; q <= 4; q++)
    for (let r = -4; r <= 4; r++) {
      const x = S * (q + r / 2), z = S * r * 0.866;
      if (Math.hypot(x, z) < 34) pts.push(new V3(x, 4, z));
    }
  pts.sort((a, b) => a.length() - b.length());
  for (const p of pts) {
    const n = nukleus(92, 235, 0.32);
    n.position.copy(p);
    const a = nukleus(56, 141, 0.32), b = nukleus(36, 92, 0.32);
    a.visible = b.visible = false;
    const fl = new THREE.Sprite(new THREE.SpriteMaterial({map: GT, color: ACC, transparent: true, depthWrite: false, opacity: 0}));
    fl.position.copy(p);
    zincir.add(n, a, b, fl);
    yerler.push(fl);
    ZN.push({p, n, a, b, fl, ts: Infinity});
  }
}
// kontrol çubukları (zincir dünyası)
const CUB = [];
const cubukZ = new THREE.Group();
zincir.add(cubukZ);
{
  const S = 11;
  for (let q = -3; q <= 3; q++)
    for (let r = -3; r <= 3; r++) {
      const x = S * (q + r / 2) + S / 2, z = S * r * 0.866 + S * 0.289;
      if (Math.hypot(x, z) < 30 && (q + 2 * r) % 3 === 0) {
        const m = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 30, 24), MAT.dokum);
        m.castShadow = true;
        m.position.set(x, 19, z);
        cubukZ.add(m);
        CUB.push(m);
      }
    }
}
// zincir olay ağacı: k cinsinden zamanlar
const NOT = []; // {a:V3, b:V3, k0, k1, yut}
{
  const k0 = 0.08, dk = 0.075, cubukK = 0.5;
  ZN[0].ts = k0;
  NOT.push({a: new V3(-48, 4, -6), b: ZN[0].p.clone(), k0: 0.0, k1: k0, yut: false});
  const kuyruk = [0];
  const hedef = new Set([0]);
  while (kuyruk.length) {
    const i = kuyruk.shift();
    const ts = ZN[i].ts;
    if (ts > 0.94) continue;
    const yakin = ZN.map((z, j) => [j, z.p.distanceTo(ZN[i].p)]).filter(([j, d]) => !hedef.has(j) && d < 10.5).sort((a, b) => a[1] - b[1]);
    const n = ts < cubukK ? 2 : 1;
    for (let c = 0; c < Math.min(n, yakin.length); c++) {
      const j = yakin[c][0];
      hedef.add(j);
      ZN[j].ts = ts + dk;
      NOT.push({a: ZN[i].p.clone(), b: ZN[j].p.clone(), k0: ts, k1: ts + dk, yut: false});
      kuyruk.push(j);
    }
    // fazla nötronlar: çubuk inmişse çubuğa gider
    const fazla = 3 - Math.min(n, yakin.length);
    for (let f = 0; f < fazla; f++) {
      const ang = i * 2.1 + f * 2.4;
      const dir = new V3(Math.cos(ang), 0, Math.sin(ang));
      let b = ZN[i].p.clone().addScaledVector(dir, 14);
      if (ts >= cubukK) {
        const cb = CUB.slice().sort((x, y) => x.position.distanceTo(ZN[i].p) - y.position.distanceTo(ZN[i].p))[f % 3];
        if (cb) b = new V3(cb.position.x, 4, cb.position.z);
      }
      NOT.push({a: ZN[i].p.clone(), b, k0: ts, k1: ts + dk * (ts >= cubukK ? 1 : 1.6), yut: ts >= cubukK, kac: ts < cubukK});
    }
  }
}
const notIM = new THREE.InstancedMesh(new THREE.SphereGeometry(0.42, 14, 10), MAT.acc, NOT.length);
notIM.frustumCulled = false;
zincir.add(notIM);
// soğutucu akışı (birincil devre): instanced küreler, renk soğuktan sıcağa
const NA = 260;
const akis = new THREE.InstancedMesh(new THREE.SphereGeometry(0.16, 10, 8), new THREE.MeshStandardMaterial({roughness: 0.4, emissive: '#000000'}), NA);
akis.frustumCulled = false;
scene.add(akis);
const SOGUK = new THREE.Color('#5b8db8'), SICAK = new THREE.Color(ACC);
const AKY = [];
{
  const yK = RPV.y0 + RPV.r; // kabın yerel orijini
  const Hh = RPV.h, R = RPV.r;
  for (let i = 0; i < NA; i++) {
    const loop = i % 4;
    const a = Math.PI / 4 + loop * (Math.PI / 2);
    const da = ((i * 0.37) % 1 - 0.5) * 1.0;
    const rr = ((i * 0.61) % 1) * 1.5;
    const ug = ADA.ugs[loop];
    const [n1, hot] = ug.userData.hot;
    const pts = [
      new V3(Math.cos(a + 0.22) * 3.2, yK + Hh - R - 1.8, Math.sin(a + 0.22) * 3.2),
      new V3(Math.cos(a + da) * 2.12, yK + Hh - R - 2.5, Math.sin(a + da) * 2.12),
      new V3(Math.cos(a + da) * 2.12, yK + 1.0, Math.sin(a + da) * 2.12),
      new V3(Math.cos(a + da) * 1.2, yK - R * 0.6, Math.sin(a + da) * 1.2),
      new V3(Math.cos(a + da * 2) * rr, yK + 0.2, Math.sin(a + da * 2) * rr),
      new V3(Math.cos(a + da * 2) * rr, yK + 4.6, Math.sin(a + da * 2) * rr),
      new V3(Math.cos(a - 0.22) * 1.6, yK + Hh - R - 0.9, Math.sin(a - 0.22) * 1.6),
      n1.clone(),
      hot.clone(),
      ug.position.clone().add(new V3(0, -1.2, 0)),
    ];
    AKY.push({c: new THREE.CatmullRomCurve3(pts, false, 'centripetal'), f: (i * 0.618) % 1});
  }
}

// ------------------------------------------------------------ UI
const ui = createUI(app, L);
const fmt = (x, d) => x.toFixed(d).replace('.', L.ondalik);
function grafik(g) {
  const W = 380, H = 150;
  const v = [3212 * g, 1200 * g, 2012 * g];
  let h = '';
  const row = (i, val, col, birim) => {
    const y = 6 + i * 52;
    const w = (val / 3212) * (W - 10);
    h += `<text x="0" y="${y + 14}" font-size="18" font-family="JetBrains Mono" font-weight="700" fill="#7d828a" letter-spacing="1.5">${L.g[i]}</text>`;
    h += `<rect x="0" y="${y + 22}" width="${W - 10}" height="14" rx="3" fill="#e6e7e9"/>`;
    h += `<rect x="0" y="${y + 22}" width="${w.toFixed(1)}" height="14" rx="3" fill="${col}"/>`;
    h += `<text x="${W - 10}" y="${y + 14}" text-anchor="end" font-size="20" font-family="JetBrains Mono" font-weight="700" fill="#16181b">${Math.round(val)} ${birim}</text>`;
  };
  row(0, v[0], '#16181b', 'MWt');
  row(1, v[1], ACC, 'MWe');
  row(2, v[2], '#9aa0a8', 'MWt');
  void H;
  return `<g transform="translate(12 4)">${h}</g>`;
}

// ------------------------------------------------------------ sahneler
const ALT_Y = -150;
const SAHNE = {
  hero: {
    dunya: 'yakit',
    cam: (k) => ({tx: lerp(0, -0.3, ss(0.3, 1, k)), ty: lerpLog(0.007, 0.4, ss(0.25, 0.85, k)), tz: lerp(0, -0.7, ss(0.3, 1, k)), az: lerp(28, 18, k), el: lerp(18, 14, k), d: lerpLog(0.06, 3.6, ss(0.25, 0.85, k)), fov: 38}),
    g: () => 1,
    etiket: (k) => [['pelet', ss(0.08, 0.18, k)], ['komur', ss(0.75, 0.85, k)]],
    olcu: (k) => [['pelet', ss(0.1, 0.2, k) * (1 - ss(0.3, 0.4, k))]],
  },
  fisyon: {
    dunya: 'mikro',
    cam: (k) => ({tx: lerp(-3, 0, k), ty: 6, tz: 0, az: lerp(30, 10, k), el: lerp(14, 22, k), d: lerp(30, 40, ss(0.5, 0.8, k)), fov: 40}),
    g: () => 1,
    etiket: (k) => [['u235', ss(0.05, 0.12, k) * (1 - ss(0.5, 0.55, k))], ['notron', ss(0.12, 0.2, k) * (1 - ss(0.38, 0.42, k))], ['ba', ss(0.65, 0.72, k)], ['kr', ss(0.68, 0.75, k)], ['yeni', ss(0.72, 0.8, k)], ['enerji', ss(0.6, 0.66, k)]],
    olcu: () => [],
    k: () => '—',
  },
  zincir: {
    dunya: 'mikro',
    cam: (k) => ({tx: 0, ty: 4, tz: 0, az: lerp(20, 45, k), el: lerp(58, 50, k), d: lerp(118, 108, k), fov: 40}),
    g: () => 1,
    etiket: (k) => [['cubukK', ss(0.56, 0.64, k)]],
    olcu: () => [],
    k: (k) => (k < 0.5 ? '> 1' : (DIL === 'en' ? '1.00' : '1,00')),
  },
  yakit: {
    dunya: 'yakit',
    cam: (k) => {
      const a = ss(0, 0.32, k), b = ss(0.35, 0.62, k), c = ss(0.66, 0.92, k);
      return {tx: lerp(lerp(0.05, 0.05, a), 0.5, b), ty: lerp(lerpLog(0.04, 0.3, a), lerp(1.95, 3.85, c), b), tz: lerp(0.02, 0.1, b), az: lerp(lerp(40, 30, a), 35, b) + 25 * c, el: lerp(14, 16, b) + 34 * c, d: lerp(lerpLog(0.08, 0.6, a), lerpLog(5.2, 1.5, c), b), fov: 38};
    },
    g: () => 1,
    poz: (k) => ({pelet: 1 - ss(0.1, 0.2, k)}),
    etiket: (k) => [['zarf', ss(0.06, 0.14, k) * (1 - ss(0.3, 0.36, k))], ['yigin', ss(0.1, 0.18, k) * (1 - ss(0.3, 0.36, k))], ['demet', ss(0.55, 0.62, k)], ['boy', ss(0.58, 0.65, k) * (1 - ss(0.8, 0.85, k))]],
    olcu: () => [],
  },
  isi: {
    dunya: 'santral',
    kesit: [0, 0, 0],
    cam: (k) => ({tx: lerp(0, 3, k), ty: lerp(13, 16, k), tz: 0, az: lerp(20, 40, k), el: lerp(12, 22, k), d: lerp(36, 50, ss(0.4, 0.9, k)), fov: 40}),
    g: () => 1,
    akis: 1,
    etiket: (k) => [['kap', ss(0.05, 0.12, k)], ['cekirdek', ss(0.1, 0.18, k)], ['sicakBacak', ss(0.45, 0.52, k)], ['ug', ss(0.55, 0.62, k)], ['pompa', ss(0.62, 0.7, k)]],
    olcu: () => [],
  },
  turbin: {
    dunya: 'santral',
    kesit: [0, 0, -78],
    cam: (k) => ({tx: lerp(-4, 120, ss(0.55, 0.95, k)), ty: lerp(15, 95, ss(0.55, 0.95, k)), tz: lerp(-78, -200, ss(0.55, 0.95, k)), az: lerp(66, 40, ss(0.5, 1, k)), el: lerp(24, 10, ss(0.5, 1, k)), d: lerp(92, 470, ss(0.55, 0.95, k)), fov: 42}),
    g: () => 1,
    etiket: (k) => [['buharHatti', ss(0.04, 0.1, k) * (1 - ss(0.5, 0.55, k))], ['ybTurbin', ss(0.1, 0.17, k) * (1 - ss(0.5, 0.55, k))], ['abTurbin', ss(0.15, 0.22, k) * (1 - ss(0.5, 0.55, k))], ['jenerator', ss(0.22, 0.3, k) * (1 - ss(0.5, 0.55, k))], ['kondenser', ss(0.3, 0.38, k) * (1 - ss(0.5, 0.55, k))], ['kule', ss(0.75, 0.85, k)]],
    olcu: () => [],
  },
  guvenlik: {
    dunya: 'santral',
    kesit: [0, 0, 0],
    cam: (k) => ({tx: 0, ty: lerp(26, 30, k), tz: 0, az: lerp(-20, 5, k), el: lerp(8, 14, k), d: lerp(130, 120, k), fov: 42}),
    g: () => 1,
    etiket: (k) => [['disKoruma', ss(0.05, 0.14, k)], ['icKoruma', ss(0.12, 0.22, k)], ['kap', ss(0.22, 0.32, k)], ['yakalayici', ss(0.35, 0.45, k)]],
    olcu: () => [],
  },
  turkiye: {
    dunya: 'akkuyu',
    cam: (k) => ({tx: lerp(-40, 0, k), ty: 20, tz: 10, az: lerp(-62, -52, k), el: lerp(20, 24, k), d: lerp(760, 700, k), fov: 42}),
    g: () => 1,
    etiket: (k) => [['akkuyu', ss(0.08, 0.18, k)], ['deniz', ss(0.2, 0.3, k)]],
    olcu: (k) => [['dort', ss(0.35, 0.5, k)]],
  },
  son: {
    dunya: 'santral',
    kesit: null,
    cam: (k) => ({tx: 85, ty: 80, tz: -140, az: lerp(18, 26, k), el: lerp(7, 10, k), d: lerp(880, 820, k), fov: 42}),
    g: () => 1,
    etiket: () => [],
    olcu: () => [],
    kart: (k) => ss(0.4, 0.55, k),
  },
};
const UFIS = {notron: () => nAcc.getWorldPosition(new V3())};
const AN = {
  pelet: () => YAK.pelet.localToWorld(new V3(YK.peletR, YK.peletH * 0.8, 0)),
  komur: () => YAK.komur.localToWorld(new V3(0.2, 0.6, 0)),
  u235: () => U.localToWorld(new V3(1.5, 2.2, 0)),
  notron: UFIS.notron,
  ba: () => BA.localToWorld(new V3(0, 2, 0)),
  kr: () => KR.localToWorld(new V3(0, 1.6, 0)),
  yeni: () => yeniN[0].getWorldPosition(new V3()),
  enerji: () => new V3(0, 8.5, 0),
  cubukK: () => CUB[0].localToWorld(new V3(0, 8, 0)),
  zarf: () => YAK.cubuk.localToWorld(new V3(YK.zarfR, 0.32, 0)),
  yigin: () => YAK.cubuk.localToWorld(new V3(0, 0.2, 0)),
  demet: () => YAK.demet.localToWorld(new V3(0.11, 2.6, 0)),
  boy: () => YAK.demet.localToWorld(new V3(-0.11, 1.6, 0)),
  kap: () => ADA.kap.localToWorld(new V3(-1.5, 3.2, -1.6)),
  cekirdek: () => ADA.cek.localToWorld(new V3(-1.0, 0.8, -0.8)),
  ug: () => ADA.P.ug.obj.localToWorld(new V3(0, 2.0, 0)),
  pompa: () => ADA.P.pompa.at.clone(),
  basincli: () => ADA.P.basincli.obj.localToWorld(new V3(0, 8, 0)),
  sicakBacak: () => ADA.P.sicakBacak.at.clone(),
  buharHatti: () => ADA.P.buharHatti.at.clone(),
  ybTurbin: () => TBN.root.localToWorld(TBN.P.ybTurbin.at.clone()),
  abTurbin: () => TBN.root.localToWorld(TBN.P.abTurbin.at.clone()),
  jenerator: () => TBN.root.localToWorld(TBN.P.jenerator.at.clone()),
  kondenser: () => TBN.root.localToWorld(TBN.P.kondenser.at.clone()),
  kule: () => KULE.root.localToWorld(new V3(-36, 120, 0)),
  icKoruma: () => new V3(-15, 50, -8),
  disKoruma: () => new V3(-22, 30, -8),
  yakalayici: () => new V3(-2, 3, 0),
  akkuyu: () => akkuyu.children[1].localToWorld(new V3(0, 72, 0)),
  deniz: () => new V3(120, 0, 260),
};
const OLCU = {
  pelet: () => [YAK.pelet.localToWorld(new V3(-YK.peletR, -0.001, YK.peletR * 1.4)), YAK.pelet.localToWorld(new V3(-YK.peletR, YK.peletH + 0.001, YK.peletR * 1.4)), {dx: -90}],
  dort: () => [akkuyu.children[0].localToWorld(new V3(-26, 90, 0)), akkuyu.children[3].localToWorld(new V3(26, 90, 0)), {dy: -46}],
};

// ------------------------------------------------------------ zaman
let K = null;
function sahneAt(t) {
  let i = 0;
  while (i < K.sahneler.length - 1 && t >= K.sahneler[i + 1].bas) i++;
  const s = K.sahneler[i];
  const D = s.son - s.bas;
  return {i, s, S: SAHNE[s.ad] || SAHNE.hero, u: t - s.bas, D, k: cl((t - s.bas) / D)};
}
window.kurgu = (k) => {
  K = k;
};
const blend = (a, b, k) => {
  const o = {};
  for (const key in b) o[key] = key === 'az' ? a.az + ((((b.az - a.az + 540) % 360) - 180) * k) : a[key] + (b[key] - a[key]) * k;
  return o;
};
const camAt = (t) => {
  const r = sahneAt(t);
  let c = r.S.cam(r.k);
  if (r.i > 0 && r.u < 1.4) {
    const p = K.sahneler[r.i - 1];
    const PS = SAHNE[p.ad];
    if (PS && PS.dunya === r.S.dunya) c = blend(PS.cam(1), c, ss(0, 1.4, r.u));
  }
  return c;
};
const pv = new V3();
const proj = (p) => {
  pv.copy(p).project(camera);
  if (pv.z > 1 || pv.z < -1) return null;
  return [(pv.x * 0.5 + 0.5) * 1080, (-pv.y * 0.5 + 0.5) * 1920];
};
function etiketYerlestir(list) {
  const pts = list
    .filter(([, o]) => o > 0.02)
    .map(([ad, o]) => {
      const p = AN[ad] && AN[ad]();
      const at = p && proj(p);
      const [n, sub] = L.e[ad] || [ad, ''];
      return {ad: n, alt: sub, at, o};
    })
    .filter((x) => x.at && x.at[0] > 30 && x.at[0] < 1050 && x.at[1] > 330 && x.at[1] < 1300);
  const Lc = pts.filter((x) => x.at[0] < 540).sort((a, b) => a.at[1] - b.at[1]);
  const Rc = pts.filter((x) => x.at[0] >= 540).sort((a, b) => a.at[1] - b.at[1]);
  const out = [];
  const stack = (col, sag) => {
    let y = 380;
    for (const c of col) {
      y = Math.max(y, Math.min(1180, c.at[1] - 40));
      const w = Math.max(c.ad.length * 20.5, c.alt.length * 15.6 + 25) + 26;
      const x = sag ? 1040 - w : 44;
      out.push({...c, label: [x, y], w});
      y += 96;
    }
  };
  stack(Lc, false);
  stack(Rc, true);
  return out;
}

function kare(t) {
  if (!K) return;
  const r = sahneAt(t);
  const {S, k, s, u} = r;
  const dunya = S.dunya;
  santral.visible = dunya === 'santral';
  KULE.root.visible = dunya === 'santral';
  akkuyu.visible = dunya === 'akkuyu';
  YAK.root.visible = dunya === 'yakit';
  mikro.visible = dunya === 'mikro';
  fis.visible = s.ad === 'fisyon';
  zincir.visible = s.ad === 'zincir';
  zemin.visible = dunya !== 'akkuyu' || true;
  const poz = S.poz ? S.poz(k) : {};
  // kamera
  const c = camAt(t);
  const az = c.az * D2R, el = c.el * D2R;
  camera.fov = c.fov;
  camera.near = Math.max(0.0005, c.d * 0.02);
  camera.far = c.d * 12 + 1500;
  camera.position.set(c.tx + c.d * Math.cos(el) * Math.sin(az), c.ty + c.d * Math.sin(el), c.tz + c.d * Math.cos(el) * Math.cos(az));
  camera.lookAt(c.tx, c.ty, c.tz);
  camera.setViewOffset(W, H, 0, -ALT_Y * (H / 1920), W, H);
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld();
  scene.fog.near = c.d * 1.6 + c.d * 0.2;
  scene.fog.far = c.d * 6 + c.d * 2;
  gtao.updateGtaoMaterial({radius: Math.max(0.0005, c.d * 0.012)});
  // kesit: kameraya bakan yarı açılır
  if (S.kesit) {
    const n = new V3(-Math.sin(az), 0, -Math.cos(az));
    KES.normal.copy(n);
    KES.constant = -n.dot(new V3(...S.kesit));
  } else {
    KES.normal.set(-1, 0, 0);
    KES.constant = 1e6;
  }
  KES2.normal.set(0, -1, 0);
  KES2.constant = dunya === 'santral' ? 15.6 : 1e6;
  // reaktör: çubuklar ve sıcaklık
  ADA.cubuk.position.y = 0.6;
  ADA.sicak.material.opacity = 0.2 + 0.25 * (0.5 + 0.5 * Math.sin(t * 3));
  // türbin rotorları
  for (const rt of TBN.rotorlar) rt.rotation.x = t * 6;
  // bulut
  for (const b of bulut) {
    const f = (b.f + t * 0.06) % 1;
    const h = 175 + f * 120;
    const sp = 18 + f * 60;
    b.s.position.set(Math.cos(b.a) * sp * b.r + f * 70, h, Math.sin(b.a) * sp * b.r);
    const sc = 40 + f * 110;
    b.s.scale.set(sc, sc, 1);
    b.s.material.opacity = 0.8 * Math.sin(Math.PI * f) * (dunya === 'santral' ? 1 : 0);
    b.s.visible = b.s.material.opacity > 0.01;
  }
  // akış
  akis.visible = !!S.akis;
  if (akis.visible) {
    const m4 = new THREE.Matrix4();
    const col = new THREE.Color();
    AKY.forEach((a, i) => {
      const f = (a.f + t * 0.09) % 1;
      const p = a.c.getPointAt(f);
      m4.makeTranslation(p.x, p.y, p.z);
      akis.setMatrixAt(i, m4);
      col.copy(SOGUK).lerp(SICAK, ss(0.42, 0.62, f));
      akis.setColorAt(i, col);
    });
    akis.instanceMatrix.needsUpdate = true;
    akis.instanceColor.needsUpdate = true;
  }
  // yakıt dünyası
  if (dunya === 'yakit') {
    const yk = s.ad === 'yakit';
    YAK.pelet.visible = !yk || (poz.pelet ?? 1) > 0.02;
    YAK.pelet.position.set(yk ? 0.05 : 0, yk ? lerp(0.002, 0.62, 1 - (poz.pelet ?? 1)) : 0.002, yk ? 0.02 : 0);
    YAK.komur.visible = !yk;
    YAK.cubuk.visible = yk;
    YAK.demet.visible = yk;
    YAK.demet.position.y = yk ? -0.12 + 0 : 0;
  }
  // fisyon
  if (s.ad === 'fisyon') {
    const hit = 0.4, bol = 0.58;
    const nx = lerp(-22, -U.userData.R, ss(0.08, hit, k));
    nAcc.position.set(nx, 6, 0);
    nAcc.visible = k < hit + 0.01;
    // titreşim ve uzama
    const w = ss(hit, bol, k);
    U.scale.set(1 + 0.35 * w + 0.06 * Math.sin(u * 30) * w, 1 - 0.18 * w, 1 - 0.18 * w);
    U.visible = k < bol;
    const sp = ss(bol, 1, k);
    BA.visible = KR.visible = k >= bol;
    BA.position.set(-3 - 7 * sp, 6 + 1.5 * sp, -2 * sp);
    KR.position.set(3 + 7 * sp, 6 - 1 * sp, 2 * sp);
    yeniN.forEach((m, i) => {
      m.visible = k >= bol;
      const a = -0.9 + i * 0.9;
      m.position.set(Math.sin(a) * 13 * sp, 6 + Math.cos(a) * 11 * sp * 0.6, Math.cos(a) * 7 * sp);
    });
    isik.position.set(0, 6, 0);
    const fl = k >= bol ? Math.exp(-(k - bol) * 14) : 0;
    isik.material.opacity = fl * 0.9;
    isik.scale.setScalar(10 + 40 * (1 - fl));
    isik.visible = fl > 0.01;
    U.rotation.y = u * 0.3;
    BA.rotation.y = KR.rotation.y = u * 0.5;
  }
  // zincir
  if (s.ad === 'zincir') {
    for (const z of ZN) {
      const b = k >= z.ts;
      z.n.visible = !b;
      z.a.visible = z.b.visible = b;
      const sp = ss(z.ts, z.ts + 0.06, k);
      const dir = new V3(Math.cos(z.p.x), 0.4, Math.sin(z.p.z)).normalize();
      z.a.position.copy(z.p).addScaledVector(dir, 1.6 * sp);
      z.b.position.copy(z.p).addScaledVector(dir, -1.6 * sp);
      z.n.rotation.y = u * 0.4 + z.p.x;
      const fl = b ? Math.exp(-(k - z.ts) * 40) : 0;
      z.fl.material.opacity = fl;
      z.fl.scale.setScalar(4 + 10 * (1 - fl));
      z.fl.visible = fl > 0.01;
    }
    const m4 = new THREE.Matrix4();
    NOT.forEach((n, i) => {
      const on = k >= n.k0 && k < n.k1 + (n.yut ? 0 : 0.0);
      const f = cl((k - n.k0) / (n.k1 - n.k0));
      const p = n.a.clone().lerp(n.b, f);
      m4.makeScale(on ? 1 : 0, on ? 1 : 0, on ? 1 : 0).setPosition(p);
      notIM.setMatrixAt(i, m4);
    });
    notIM.instanceMatrix.needsUpdate = true;
    const dn = ss(0.42, 0.52, k);
    CUB.forEach((m) => (m.position.y = lerp(46, 15, dn)));
  }
  // gölge
  const ext = cl(c.d * 1.5, 0.02, 600);
  const tg = new V3(c.tx, Math.min(c.ty, 60), c.tz);
  Object.assign(sun.shadow.camera, {left: -ext, right: ext, top: ext, bottom: -ext, near: ext * 0.05, far: ext * 6});
  sun.shadow.camera.updateProjectionMatrix();
  sun.shadow.bias = -0.0004;
  sun.target.position.copy(tg);
  sun.position.copy(tg).addScaledVector(SUN, ext * 3);
  sun.target.updateMatrixWorld();
  scene.updateMatrixWorld(true);
  composer.render();
  // UI
  const g = S.g(k);
  const kk = S.k ? S.k(k) : DIL === 'en' ? '1.00' : '1,00';
  const vals = [
    [g, `${fmt(3212 * g, 0)} MWt`],
    [g, `≈ ${fmt(1200 * g, 0)} MWe`],
    [16.5 / 20, `${fmt(16.5, 1)} MPa`],
    [328.6 / 350, `${fmt(328.6, 0)} °C`],
    [kk === '> 1' ? 1 : 0.6, `${kk}`],
  ];
  const etiketler = etiketYerlestir(S.etiket(k));
  const olculer = (S.olcu ? S.olcu(k) : []).map(([ad, o]) => {
    const [a, b, x] = OLCU[ad]();
    return {a: proj(a), b: proj(b), o, metin: L.olcu[ad], ...x};
  });
  let yazi = '';
  for (const a of K.altyazi) if (t >= a.bas && t < a.son + 0.05) yazi = a.metin;
  let flas = 0;
  if (r.i > 0) {
    const p = SAHNE[K.sahneler[r.i - 1].ad];
    if (!p || p.dunya !== S.dunya) flas = 0.85 * (1 - ss(0, 0.32, r.u));
  }
  ui.update({
    baslik: L.baslik[s.ad] || '',
    alt: L.alt[s.ad] || '',
    yazi,
    vals,
    grafik: grafik(g),
    formul: '²³⁵U + n → ¹⁴¹Ba + ⁹²Kr + 3n',
    bolum: s.ad,
    etiketler,
    olculer,
    flas,
    kart: S.kart ? {o: S.kart(k), html: L.kart()} : null,
  });
}
window.kare = kare;

const VARS = {toplam: 72, sahneler: Object.keys(SAHNE).map((ad, i) => ({ad, bas: i * 8, son: i * 8 + 8})), altyazi: []};
(async () => {
  await document.fonts.ready;
  window.kurgu(VARS);
  kare(0.5);
  window.HAZIR = true;
  if (!Q.has('kayit')) {
    const t0 = performance.now();
    const dongu = () => {
      kare(((performance.now() - t0) / 1000) % K.toplam);
      requestAnimationFrame(dongu);
    };
    requestAnimationFrame(dongu);
  }
})();
