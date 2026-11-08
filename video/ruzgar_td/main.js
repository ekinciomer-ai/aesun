// Rüzgâr türbini teardown filmi (Kozmos Lab, Enerji Üretim Kaynakları 02). Açık stüdyo, GTAO, yumuşak gölge, çizgili
// etiketler, canlı veri. Kayıt arayüzü: window.HAZIR, kurgu(K), kare(t) — kare(t) t'nin saf fonksiyonu.
import * as THREE from 'three';
import {EffectComposer} from 'three/addons/postprocessing/EffectComposer.js';
import {GTAOPass} from 'three/addons/postprocessing/GTAOPass.js';
import {OutputPass} from 'three/addons/postprocessing/OutputPass.js';
import {Pass} from 'three/addons/postprocessing/Pass.js';
import {RenderPass} from 'three/addons/postprocessing/RenderPass.js';
import {T, durum, egri} from './kin.js';
import {ACC, MAT, mats, buildTurbin, buildSergi, buildTir, buildVinc} from './model.js';
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

// ------------------------------------------------------------ metinler
const LX = {
  tr: {
    bolum: 'BÖLÜM', seri: 'ENERJİ ÜRETİM KAYNAKLARI', etut: 'MEKANİZMA ETÜDÜ', canli: 'CANLI VERİ', egri: 'GÜÇ EĞRİSİ', ondalik: ',', dk: 'dev/dk',
    r_ruz: 'RÜZGÂR', r_rot: 'ROTOR', r_jen: 'JENERATÖR', r_pit: 'KANAT AÇISI', r_guc: 'GÜÇ',
    bolumler: ['hero', 'ruzgar', 'kanat', 'nasel', 'nakliye', 'kurulum', 'uretim', 'koruma'],
    ad: {hero: 'GENEL', ruzgar: 'RÜZGÂR', kanat: 'KANAT', nasel: 'NASEL', nakliye: 'NAKLİYE', kurulum: 'KURULUM', uretim: 'ÜRETİM', koruma: 'KORUMA', son: 'SON'},
    baslik: {hero: 'Rüzgâr Türbini', ruzgar: 'Rüzgârın Gücü', kanat: 'Kanat', nasel: 'Nasel', nakliye: 'Nakliye', kurulum: 'Kurulum', uretim: 'Üretim', koruma: 'Fırtına Koruması', son: 'Rüzgâr'},
    alt: {
      hero: 'NREL 5 MW REFERANS TÜRBİNİ', ruzgar: 'GÜÇ, HIZIN KÜPÜYLE ARTAR', kanat: 'CAM + KARBON ELYAF · REÇİNE', nasel: 'ANA MİL → ŞANZIMAN → JENERATÖR',
      nakliye: 'UZATILABİLİR DORSE', kurulum: 'TEMEL · KULE · NASEL · ROTOR', uretim: 'DÖNÜŞ → ELEKTRİK → ŞEBEKE', koruma: 'PİTCH + YAW KONTROLÜ', son: 'YAKITSIZ ELEKTRİK',
    },
    e: {
      kanat: ['KANAT', '61,5 m · 17,7 t'], nasel: ['NASEL', '240 t'], kule: ['KULE', '87,6 m · 347 t'], gobek: ['GÖBEK', '3 kanat'],
      pitchYatak: ['PİTCH YATAĞI', 'kanat açısını çevirir'], anaMil: ['ANA MİL', 'yavaş mil'], anaRulman: ['ANA RULMAN', ''], sanziman: ['ŞANZIMAN', 'oran 97 : 1'],
      fren: ['FREN DİSKİ', 'hızlı milde'], jenerator: ['JENERATÖR', 'verim %94,4'], cevirici: ['GÜÇ ÇEVİRİCİ', 'frekansı uydurur'], trafo: ['TRAFO', 'gerilimi yükseltir'],
      sogutucu: ['SOĞUTUCU', ''], olcer: ['RÜZGÂR ÖLÇER', 'hız + yön'], yawMotor: ['YAW MOTORLARI', 'naseli çevirir'],
      cam: ['CAM ELYAF KABUK', 'dış kabuk'], karbonU: ['KARBON KİRİŞ', 'ana yük taşıyıcı'], web1: ['KESME GÖVDESİ', 'iki kabuğu bağlar'], cekirdek: ['BALSA / KÖPÜK', 'hafif çekirdek'], kalip: ['KALIP', 'reçine infüzyonu'],
      temel: ['BETON TEMEL', 'ankraj civataları'], rotor: ['ROTOR', '110 t'], sebeke: ['ŞEBEKE', ''], pad: ['TRAFO', 'gerilimi yükseltir'],
    },
    olcu: {cap: 'Ø 126 m', hub: '90 m', kanat: '61,5 m'},
    kart: (o) => `<div class="mo" style="font-size:30px;letter-spacing:.2em;color:#7d828a">SIRADAKİ BÖLÜM</div><div style="font-size:120px;font-weight:700;letter-spacing:-.03em;margin-top:6px">Su<span style="color:${ACC}">.</span></div><div class="mo" style="font-size:26px;letter-spacing:.14em;margin-top:8px;color:#5d636b">ENERJİ ÜRETİM KAYNAKLARI · 03</div>`,
  },
  en: {
    bolum: 'EPISODE', seri: 'ENERGY SOURCES', etut: 'MECHANISM STUDY', canli: 'LIVE DATA', egri: 'POWER CURVE', ondalik: '.', dk: 'rpm',
    r_ruz: 'WIND', r_rot: 'ROTOR', r_jen: 'GENERATOR', r_pit: 'PITCH', r_guc: 'POWER',
    bolumler: ['hero', 'ruzgar', 'kanat', 'nasel', 'nakliye', 'kurulum', 'uretim', 'koruma'],
    ad: {hero: 'OVERVIEW', ruzgar: 'WIND', kanat: 'BLADE', nasel: 'NACELLE', nakliye: 'TRANSPORT', kurulum: 'ERECTION', uretim: 'POWER', koruma: 'SAFETY', son: 'END'},
    baslik: {hero: 'Wind Turbine', ruzgar: 'Power in the Wind', kanat: 'The Blade', nasel: 'The Nacelle', nakliye: 'Transport', kurulum: 'Erection', uretim: 'Generation', koruma: 'Storm Protection', son: 'Wind'},
    alt: {
      hero: 'NREL 5 MW REFERENCE TURBINE', ruzgar: 'POWER GROWS WITH SPEED CUBED', kanat: 'GLASS + CARBON FIBRE · RESIN', nasel: 'MAIN SHAFT → GEARBOX → GENERATOR',
      nakliye: 'EXTENDABLE TRAILER', kurulum: 'FOUNDATION · TOWER · NACELLE · ROTOR', uretim: 'ROTATION → ELECTRICITY → GRID', koruma: 'PITCH + YAW CONTROL', son: 'FUEL-FREE POWER',
    },
    e: {
      kanat: ['BLADE', '61.5 m · 17.7 t'], nasel: ['NACELLE', '240 t'], kule: ['TOWER', '87.6 m · 347 t'], gobek: ['HUB', '3 blades'],
      pitchYatak: ['PITCH BEARING', 'turns the blade'], anaMil: ['MAIN SHAFT', 'low-speed shaft'], anaRulman: ['MAIN BEARING', ''], sanziman: ['GEARBOX', 'ratio 97 : 1'],
      fren: ['BRAKE DISC', 'on the fast shaft'], jenerator: ['GENERATOR', '94.4% efficient'], cevirici: ['CONVERTER', 'matches grid frequency'], trafo: ['TRANSFORMER', 'steps up voltage'],
      sogutucu: ['COOLER', ''], olcer: ['WIND SENSORS', 'speed + direction'], yawMotor: ['YAW MOTORS', 'turn the nacelle'],
      cam: ['GLASS-FIBRE SHELL', 'outer skin'], karbonU: ['CARBON SPAR CAP', 'main load path'], web1: ['SHEAR WEB', 'ties the shells'], cekirdek: ['BALSA / FOAM', 'light core'], kalip: ['MOULD', 'resin infusion'],
      temel: ['CONCRETE BASE', 'anchor bolts'], rotor: ['ROTOR', '110 t'], sebeke: ['GRID', ''], pad: ['TRANSFORMER', 'steps up voltage'],
    },
    olcu: {cap: 'Ø 126 m', hub: '90 m', kanat: '61.5 m'},
    kart: (o) => `<div class="mo" style="font-size:30px;letter-spacing:.2em;color:#7d828a">NEXT EPISODE</div><div style="font-size:120px;font-weight:700;letter-spacing:-.03em;margin-top:6px">Hydro<span style="color:${ACC}">.</span></div><div class="mo" style="font-size:26px;letter-spacing:.14em;margin-top:8px;color:#5d636b">ENERGY SOURCES · 03</div>`,
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
const PXR = +(Q.get('pr') || Math.min(2.5, (devicePixelRatio || 1) * 1.25)); // süper örnekleme: çizim, ekran çözünürlüğünün 1,5 katı
renderer.setPixelRatio(PXR);
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
composer.setPixelRatio(PXR);
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
sun.shadow.mapSize.set(4096, 4096);
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

// ------------------------------------------------------------ dünyalar
const TB = buildTurbin();
TB.rotor.userData.rotor = true;
scene.add(TB.root);
const SER = buildSergi();
SER.root.position.set(1000, 2.4, 0);
scene.add(SER.root);
const TIR = buildTir();
const tirYer = new THREE.Group();
tirYer.position.set(-1000, 0, 0);
tirYer.add(TIR.root);
scene.add(tirYer);
const VINC = buildVinc();
VINC.root.position.set(34, 0, -8);
scene.add(VINC.root);
// yol: kayan şerit çizgileri ve direkler
const yol = new THREE.Group();
{
  const asf = new THREE.Mesh(new THREE.PlaneGeometry(13, 3000), new THREE.MeshStandardMaterial({color: '#bfc2c6', roughness: 0.9}));
  asf.rotation.x = -Math.PI / 2;
  asf.position.y = 0.02;
  asf.receiveShadow = true;
  yol.add(asf);
  yerler.push(asf);
}
const serit = new THREE.InstancedMesh(new THREE.BoxGeometry(0.25, 0.03, 4), new THREE.MeshStandardMaterial({color: '#f7f7f7', roughness: 0.6}), 120);
const direk = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.12, 0.12, 5, 8), MAT.celik, 40);
direk.castShadow = true;
yol.add(serit, direk);
tirYer.add(yol);
// şebeke: tabandaki trafo ve hat direkleri
const sebeke = new THREE.Group();
const pad = new THREE.Mesh(new THREE.BoxGeometry(3.2, 2.4, 2.6), MAT.dolap);
pad.position.set(9, 1.2, 7);
pad.castShadow = true;
sebeke.add(pad);
const direkler = [];
for (let i = 0; i < 5; i++) {
  const g = new THREE.Group();
  g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.35, 16, 12), MAT.koyu));
  g.children[0].position.y = 8;
  g.add(new THREE.Mesh(new THREE.BoxGeometry(6, 0.3, 0.3), MAT.koyu));
  g.children[1].position.y = 15.4;
  g.traverse((o) => (o.castShadow = true));
  g.position.set(22 + i * 34, 0, 18 + i * 30);
  g.rotation.y = -0.85;
  sebeke.add(g);
  direkler.push(g);
}
scene.add(sebeke);
// güç akışı yolu (shader ile kayan çizgiler)
const akisMat = new THREE.ShaderMaterial({
  uniforms: {uT: {value: 0}, uA: {value: 0}, uC: {value: new THREE.Color(ACC)}},
  vertexShader: `varying vec2 vU; void main(){ vU = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }`,
  fragmentShader: `uniform float uT; uniform float uA; uniform vec3 uC; varying vec2 vU; void main(){ float s = fract(vU.x*60. - uT*2.2); float k = smoothstep(.0,.15,s)*smoothstep(.65,.45,s); vec3 c = mix(uC*.75, vec3(1.), k*.55); gl_FragColor = vec4(c, uA*(.55+.45*k)); }`,
  transparent: true,
  depthTest: false,
  depthWrite: false,
});
const akisYol = (() => {
  const p = [new V3(0, 90, 5.2), new V3(0, 89.6, 0), new V3(0, 89.4, -6), new V3(0, 88.8, -8.4), new V3(0, 86, -2), new V3(0, 50, 0), new V3(0, 3, 0), new V3(4, 1.2, 5), new V3(9, 2, 7), ...direkler.map((d) => d.position.clone().add(new V3(0, 15.6, 0)))];
  const c = new THREE.CatmullRomCurve3(p, false, 'centripetal');
  const m = new THREE.Mesh(new THREE.TubeGeometry(c, 600, 0.35, 10), akisMat);
  m.renderOrder = 20;
  return m;
})();
scene.add(akisYol);
// teller
{
  const pts = [];
  for (let i = 0; i < direkler.length - 1; i++)
    for (const s of [-2.6, 0, 2.6]) {
      const a = direkler[i].localToWorld(new V3(s, 15.6, 0)), b = direkler[i + 1].localToWorld(new V3(s, 15.6, 0));
      for (let k = 0; k < 16; k++) {
        const u0 = k / 16, u1 = (k + 1) / 16;
        const p0 = a.clone().lerp(b, u0), p1 = a.clone().lerp(b, u1);
        p0.y -= Math.sin(Math.PI * u0) * 1.6;
        p1.y -= Math.sin(Math.PI * u1) * 1.6;
        pts.push(p0, p1);
      }
    }
  sebeke.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({color: '#3a3e44'})));
}
// çiftlik: uzaktaki türbinler
const ciftlik = new THREE.Group();
const kopyalar = [];
for (const [x, z, ry] of [[-190, -230, 0.2], [210, -330, 1.1], [-330, -520, 2.0], [330, -600, 0.6], [10, -760, 1.5]]) {
  const k = TB.root.clone(true);
  k.position.set(x, 0, z);
  ciftlik.add(k);
  let rot = null;
  k.traverse((o) => {
    if (o.userData.rotor) rot = o;
  });
  kopyalar.push({k, rot, ry});
}
scene.add(ciftlik);

// rüzgâr çizgileri: incelmiş kutular, hız yönünde
const NR = 340;
const ruzMat = new THREE.MeshBasicMaterial({color: ACC, transparent: true, opacity: 0.7, depthWrite: false});
const ruzgarIM = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), ruzMat, NR);
ruzgarIM.frustumCulled = false;
const ruzG = new THREE.Group();
ruzG.add(ruzgarIM);
scene.add(ruzG);
let sd = 7;
const rnd = () => (sd = (sd * 16807) % 2147483647) / 2147483647;
const PR = Array.from({length: NR}, () => ({x: (rnd() - 0.5) * 190, y: 20 + rnd() * 140, z0: rnd() * 320, k: 0.75 + rnd() * 0.5, L: 6 + rnd() * 10}));

// ------------------------------------------------------------ UI
const ui = createUI(app, L);
const EGRI = egri();

// ------------------------------------------------------------ sahneler: kamera {tx,ty,tz,az,el,d,fov,sy}, rüzgâr, poz
const ALT_Y = -150; // görüntüyü yukarı al: 3D bölge 330–1300
const SAHNE = {
  hero: {
    dunya: 'turbin',
    cam: (k) => ({tx: 0, ty: 74, tz: 0, az: 205 + 28 * k, el: 3 + 5 * k, d: 360 - 30 * k, fov: 42}),
    v: () => 11.4,
    etiket: (k) => [['kanat', ss(0.25, 0.4, k)], ['nasel', ss(0.3, 0.45, k)], ['kule', ss(0.35, 0.5, k)]],
    olcu: (k) => [['hub', ss(0.45, 0.6, k)], ['cap', ss(0.55, 0.7, k)]],
    ruzgar: 0.35,
  },
  ruzgar: {
    dunya: 'turbin',
    cam: (k) => ({tx: -10, ty: 80, tz: 0, az: 238 - 10 * k, el: 7, d: 330, fov: 42}),
    v: (k) => 13 * ss(0.05, 0.92, k),
    etiket: () => [],
    olcu: () => [],
    ruzgar: 1,
  },
  kanat: {
    dunya: 'sergi',
    cam: (k) => ({tx: 1000 + lerp(14, 25.5, ss(0, 0.4, k)), ty: 2.6, tz: 0, az: lerp(40, 18, k), el: lerp(32, 26, k), d: lerp(95, 15, ss(0, 0.45, k)), fov: 40}),
    v: () => 9,
    sergi: (k) => ({ac: ss(0.18, 0.4, k), katman: ss(0.55, 0.8, k), kalip: 1}),
    etiket: (k) => [['kalip', ss(0.08, 0.2, k) * (1 - ss(0.4, 0.5, k))], ['cam', ss(0.4, 0.5, k)], ['karbonU', ss(0.45, 0.55, k)], ['web1', ss(0.5, 0.6, k)], ['cekirdek', ss(0.6, 0.7, k)]],
    olcu: () => [],
  },
  nasel: {
    dunya: 'turbin',
    cam: (k) => ({tx: 0, ty: 89.6, tz: -3.5, az: lerp(132, 152, k), el: lerp(20, 14, k), d: lerp(38, 40, k), fov: 40}),
    v: () => 11.4,
    poz: (k) => ({kapak: 1 - 0.9 * ss(0.12, 0.28, k), ex: ss(0.58, 0.78, k), sanzXray: ss(0.5, 0.62, k)}),
    etiket: (k) => {
      const a = ss(0.28, 0.36, k) * (1 - ss(0.54, 0.58, k)), b = ss(0.7, 0.8, k);
      return [['gobek', a], ['anaMil', a], ['anaRulman', a], ['sanziman', Math.max(a, b)], ['jenerator', Math.max(a, b)], ['yawMotor', a], ['fren', b], ['cevirici', b], ['trafo', b], ['olcer', b]];
    },
    olcu: () => [],
  },
  nakliye: {
    dunya: 'tir',
    cam: (k) => ({tx: -1000, ty: 3, tz: lerp(-34, -26, k), az: lerp(62, 36, k), el: lerp(20, 12, k), d: lerp(105, 95, k), fov: 42}),
    v: () => 0,
    etiket: (k) => [['tirKanat', ss(0.2, 0.32, k)]],
    olcu: (k) => [['kanat', ss(0.3, 0.45, k)]],
  },
  kurulum: {
    dunya: 'turbin',
    cam: (k) => ({tx: 12, ty: 60, tz: 0, az: lerp(36, 62, k), el: lerp(8, 13, k), d: 385, fov: 44}),
    v: () => 0,
    etiket: (k) => [['temel', ss(0.04, 0.1, k) * (1 - ss(0.18, 0.22, k))], ['kule', ss(0.32, 0.38, k) * (1 - ss(0.44, 0.48, k))], ['nasel', ss(0.56, 0.62, k) * (1 - ss(0.68, 0.72, k))], ['rotor', ss(0.84, 0.9, k)]],
    olcu: () => [],
  },
  uretim: {
    dunya: 'turbin',
    cam: (k) => ({tx: lerp(0, 30, ss(0.3, 0.75, k)), ty: lerp(86, 40, ss(0.3, 0.75, k)), tz: lerp(-3, 20, ss(0.3, 0.75, k)), az: lerp(140, 115, k), el: lerp(16, 14, k), d: lerp(36, 220, ss(0.3, 0.75, k)), fov: 42}),
    v: (k) => lerp(7, 11.4, ss(0, 0.5, k)),
    poz: (k) => ({kapak: 0.14, kule: 1 - 0.75 * ss(0.3, 0.45, k), akis: ss(0.05, 0.2, k)}),
    etiket: (k) => [['jenerator', ss(0.06, 0.14, k) * (1 - ss(0.32, 0.38, k))], ['cevirici', ss(0.12, 0.2, k) * (1 - ss(0.32, 0.38, k))], ['pad', ss(0.72, 0.8, k)], ['sebeke', ss(0.78, 0.86, k)]],
    olcu: () => [],
  },
  koruma: {
    dunya: 'turbin',
    cam: (k) => ({tx: 0, ty: 84, tz: 0, az: lerp(42, 64, k), el: lerp(8, 14, k), d: lerp(185, 165, k), fov: 42}),
    v: (k) => lerp(11.5, 27, ss(0.05, 0.75, k)),
    psi: (k) => 32 * ss(0.0, 0.3, k),
    etiket: (k) => [['yawMotor', ss(0.05, 0.12, k) * (1 - ss(0.32, 0.38, k))], ['pitchYatak', ss(0.42, 0.5, k)]],
    olcu: () => [],
    ruzgar: 1,
  },
  son: {
    dunya: 'turbin',
    cam: (k) => ({tx: 20, ty: 80, tz: -260, az: lerp(4, 9, k), el: 3 + 3 * k, d: lerp(500, 460, k), fov: 44}),
    v: () => 10,
    etiket: () => [],
    olcu: () => [],
    ruzgar: 0.5,
    kart: (k) => ss(0.45, 0.6, k),
  },
};
// etiket ankrajları
const AN = {
  kanat: () => TB.kanatlar[0].mesh.localToWorld(new V3(0, 40, 0)),
  nasel: () => TB.nasel.localToWorld(new V3(0, 4.3, -6)),
  kule: () => TB.kule[1].localToWorld(new V3(2.5, 10, 0)),
  gobek: () => TB.tahrik.localToWorld(new V3(0, 1.2, 2.2)),
  pitchYatak: () => TB.kanatlar[1].pitch.localToWorld(new V3(0, 0.6, 1.0)),
  anaMil: () => TB.P.anaMil.obj.localToWorld(new V3(0, 0.4, -3.4)),
  anaRulman: () => TB.P.anaRulman.obj.localToWorld(new V3(0, 0.6, -1.95)),
  sanziman: () => TB.P.sanziman.obj.localToWorld(new V3(0, 1.0, -5.8)),
  fren: () => TB.P.fren.obj.localToWorld(new V3(0, 0.5, 0)),
  jenerator: () => TB.P.jenerator.obj.localToWorld(new V3(0, 0.9, -11.6)),
  cevirici: () => TB.P.cevirici.obj.localToWorld(new V3(0, 1, 0)),
  trafo: () => TB.P.trafo.obj.localToWorld(new V3(0, 0.8, 0)),
  sogutucu: () => TB.P.sogutucu.obj.localToWorld(new V3(0, 0.7, 0)),
  olcer: () => TB.P.olcer.obj.localToWorld(new V3(0, 1.4, 0)),
  yawMotor: () => TB.P.yawMotor.obj.children[0].localToWorld(new V3(0, 1.4, 0)),
  cam: () => SER.kat.cam.localToWorld(new V3(1.6, 0, 0.3)),
  karbonU: () => SER.kat.karbonU.localToWorld(new V3(0, 0, 0.75)),
  web1: () => SER.kat.web1.localToWorld(new V3(-0.4, 0, 0)),
  cekirdek: () => SER.kat.cekirdek.localToWorld(new V3(1.4, 0, 0.3)),
  kalip: () => SER.kalip.localToWorld(new V3(3.5, 40, 0.3)),
  temel: () => new V3(0, 1, 9),
  rotor: () => TB.tahrik.localToWorld(new V3(0, 0, 0)),
  tirKanat: () => TIR.kanat.localToWorld(new V3(0, 0.5, -30)),
  pad: () => pad.localToWorld(new V3(0, 1.3, 0)),
  sebeke: () => direkler[2].localToWorld(new V3(0, 15, 0)),
};
const ETAD = {tirKanat: 'kanat'};
const OLCU = {
  hub: () => [new V3(-9, 0, 0), new V3(-9, T.hub, 0), {dx: -70}],
  cap: () => {
    const c = TB.tahrik.localToWorld(new V3(0, 0, 1));
    const ax = TB.tahrik.localToWorld(new V3(1, 0, 1)).sub(c);
    return [c.clone().addScaledVector(ax, -63), c.clone().addScaledVector(ax, 63), {dy: -40}];
  },
  kanat: () => [TIR.kanat.localToWorld(new V3(0, 3, 0)), TIR.kanat.localToWorld(new V3(0, 3, -61.5)), {dy: -44}],
};

// ------------------------------------------------------------ zaman çizelgesi
let K = null;
let ACI = null, YAW = null;
const DT = 1 / 120;
function sahneAt(t) {
  let i = 0;
  while (i < K.sahneler.length - 1 && t >= K.sahneler[i + 1].bas) i++;
  const s = K.sahneler[i];
  const D = s.son - s.bas;
  return {i, s, S: SAHNE[s.ad] || SAHNE.hero, u: t - s.bas, D, k: cl((t - s.bas) / D)};
}
function ruzAt(t) {
  const {S, k, u, s} = sahneAt(t);
  const v = S.v(k);
  let dur = 0;
  if (s.ad === 'koruma') {
    // 25 m/s'de durdurma: kanatlar yelken konumuna, rotor yavaşlar
    const D = s.son - s.bas;
    const tk = (() => {
      for (let q = 0; q <= 1; q += 0.002) if (S.v(q) >= 25) return q;
      return 2;
    })();
    dur = ss(tk * D, tk * D + 2.2, u);
  }
  if (s.ad === 'kurulum' || s.ad === 'nakliye' || s.ad === 'kanat') return {...durum(0), v: s.ad === 'kurulum' ? 6 : v, psi: 0, dur};
  return {...durum(v, dur), psi: S.psi ? S.psi(k) : 0, dur};
}
window.kurgu = (k) => {
  K = k;
  const n = Math.ceil((K.toplam + 1) / DT);
  ACI = new Float32Array(n + 1);
  YAW = new Float32Array(n + 1);
  let a = 0, y = 0;
  for (let i = 1; i <= n; i++) {
    const t = (i - 0.5) * DT;
    const r = ruzAt(t);
    a += (r.rpm / 60) * Math.PI * 2 * DT;
    y += (r.psi * D2R - y) * (1 - Math.exp(-DT / 1.6));
    ACI[i] = a;
    YAW[i] = y;
  }
};
const look = (A, t) => {
  const u = cl(t / DT, 0, A.length - 2);
  const i = Math.floor(u);
  return A[i] + (A[i + 1] - A[i]) * (u - i);
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

// kurulum: parça ofsetleri (k 0..1)
function kurulumPoz(k) {
  const tem = ss(0.0, 0.08, k);
  const kd = [ss(0.12, 0.22, k), ss(0.23, 0.33, k), ss(0.34, 0.44, k)];
  const nas = ss(0.48, 0.66, k);
  const rot = ss(0.72, 0.9, k);
  return {tem, kd, nas, rot};
}

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
      const [n, sub] = L.e[ETAD[ad] || ad] || [ad, ''];
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
  const {S, k, s} = r;
  const ruz = ruzAt(t);
  const dunya = S.dunya;
  // görünürlük
  TB.root.visible = dunya === 'turbin';
  SER.root.visible = dunya === 'sergi';
  tirYer.visible = dunya === 'tir';
  VINC.root.visible = s.ad === 'kurulum';
  sebeke.visible = dunya === 'turbin';
  ciftlik.visible = s.ad === 'son';
  // türbin pozu
  const aci = look(ACI, t);
  const poz = S.poz ? S.poz(k) : {};
  TB.pose({rotor: aci, pitch: ruz.pitch, yaw: look(YAW, t), hs: aci * T.disli, anemo: t * 9, ex: poz.ex ?? 0, kapak: poz.kapak ?? 1, sanzXray: poz.sanzXray ?? 0});
  MAT.kule.transparent = (poz.kule ?? 1) < 0.999;
  MAT.kule.opacity = poz.kule ?? 1;
  MAT.kule.depthWrite = !MAT.kule.transparent;
  akisMat.uniforms.uA.value = poz.akis ?? 0;
  akisMat.uniforms.uT.value = t;
  akisYol.visible = (poz.akis ?? 0) > 0.01;
  // kurulum
  if (s.ad === 'kurulum') {
    const kp = kurulumPoz(k);
    TB.temel.scale.y = Math.max(0.01, kp.tem);
    TB.temel.visible = kp.tem > 0.01;
    let hook = null;
    TB.kule.forEach((g, i) => {
      g.position.y = g.userData.y0 + (1 - kp.kd[i]) * 70;
      g.visible = kp.kd[i] > 0.001 || (i === 0 ? k > 0.1 : kp.kd[i - 1] > 0.98);
      if (g.visible && kp.kd[i] < 1 && kp.kd[i] > 0) hook = g.localToWorld(new V3(0, (i === 2 ? T.kule - 60 : 30) + 1, 0));
    });
    if (!TB.kule[0].visible) hook = new V3(0, 40, 0);
    TB.nasel.visible = kp.nas > 0.001 || kp.kd[2] > 0.98;
    TB.nasel.position.y = -(1 - kp.nas) * 84;
    if (kp.nas > 0 && kp.nas < 1) hook = TB.nasel.localToWorld(new V3(0, 4.3, -3));
    TB.rotor.visible = kp.rot > 0.001 || kp.nas > 0.98;
    TB.rotor.position.set(0, -(1 - kp.rot) * 86, (1 - kp.rot) * 6);
    if (kp.rot > 0 && kp.rot < 1) hook = TB.rotor.localToWorld(new V3(0, 2, 0));
    if (!hook) hook = new V3(0, T.hub + 8, 0);
    const dx = hook.x - VINC.root.position.x, dz = hook.z - VINC.root.position.z;
    const don = Math.atan2(dx, dz);
    const yat = Math.hypot(dx, dz) - 3;
    VINC.set({aci: Math.acos(cl(yat / VINC.BOM, 0, 1)), don, yuk: hook.clone().add(new V3(0, 1.5, 0))});
  } else {
    TB.temel.scale.y = 1;
    TB.temel.visible = true;
    TB.kule.forEach((g) => {
      g.position.y = g.userData.y0;
      g.visible = true;
    });
    TB.nasel.visible = true;
    TB.nasel.position.y = 0;
    TB.rotor.visible = true;
    TB.rotor.position.set(0, 0, 0);
  }
  // sergi
  if (S.sergi) SER.set(S.sergi(k));
  // tır
  if (dunya === 'tir') {
    const yolu = t * 9;
    TIR.set({uzat: ss(0.05, 0.3, k), teker: yolu / 0.52});
    const m4 = new THREE.Matrix4();
    for (let i = 0; i < 120; i++) {
      const z = ((i * 10 - yolu) % 1200 + 1200) % 1200 - 600;
      m4.makeTranslation(0, 0.03, z);
      serit.setMatrixAt(i, m4);
    }
    serit.instanceMatrix.needsUpdate = true;
    for (let i = 0; i < 40; i++) {
      const z = ((i * 30 - yolu) % 1200 + 1200) % 1200 - 600;
      m4.makeTranslation(i % 2 ? 9 : -9, 2.5, z);
      direk.setMatrixAt(i, m4);
    }
    direk.instanceMatrix.needsUpdate = true;
  }
  // çiftlik
  for (const c of kopyalar) if (c.rot) c.rot.rotation.z = aci * 0.93 + c.ry;
  // kamera
  const c = camAt(t);
  const az = c.az * D2R, el = c.el * D2R;
  camera.fov = c.fov;
  camera.near = Math.max(0.1, c.d * 0.02);
  camera.far = c.d * 12 + 1500;
  camera.position.set(c.tx + c.d * Math.cos(el) * Math.sin(az), c.ty + c.d * Math.sin(el), c.tz + c.d * Math.cos(el) * Math.cos(az));
  camera.lookAt(c.tx, c.ty, c.tz);
  camera.setViewOffset(W, H, 0, -ALT_Y * (H / 1920), W, H);
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld();
  scene.fog.near = c.d * 1.6 + 60;
  scene.fog.far = c.d * 6 + 400;
  gtao.updateGtaoMaterial({radius: Math.max(0.15, c.d * 0.012)});
  // rüzgâr çizgileri
  const ra = S.ruzgar ?? 0;
  ruzG.visible = ra > 0 && dunya === 'turbin';
  if (ruzG.visible) {
    ruzG.rotation.y = (ruz.psi ?? 0) * D2R;
    ruzMat.opacity = 0.8 * ra * cl(ruz.v / 4);
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new V3(), p = new V3();
    const yol = t * Math.max(4, ruz.v) * 4.2;
    PR.forEach((a, i) => {
      const z = 160 - (((a.z0 + yol * a.k) % 320) + 320) % 320;
      // rotor diski çevresinde yavaşlama ve genişleme (arkada iz)
      const rr = Math.hypot(a.x, a.y - T.hub);
      const iz = z < 5 && rr < T.R * 1.15 ? ss(5, -120, z) : 0;
      const gen = 1 + iz * 0.18;
      p.set(a.x * gen, T.hub + (a.y - T.hub) * gen, z);
      const L2 = a.L * (1 - 0.45 * iz) * (0.5 + 0.5 * cl(ruz.v / 11));
      const yak = cl((p.distanceTo(camera.position) - 90) / 90);
      sc.set(0.45 * yak + 1e-4, 0.45 * yak + 1e-4, L2 * 1.5 * yak + 1e-4);
      m4.compose(p, q, sc);
      ruzgarIM.setMatrixAt(i, m4);
    });
    ruzgarIM.instanceMatrix.needsUpdate = true;
  }
  // gölge
  const ext = cl(c.d * 0.65, 14, 260);
  const tg = new V3(c.tx, Math.min(c.ty, 60), c.tz);
  Object.assign(sun.shadow.camera, {left: -ext, right: ext, top: ext, bottom: -ext, near: 1, far: ext * 6});
  sun.shadow.camera.updateProjectionMatrix();
  sun.target.position.copy(tg);
  sun.position.copy(tg).addScaledVector(SUN, ext * 3);
  sun.target.updateMatrixWorld();
  scene.updateMatrixWorld(true);
  composer.render();
  // UI
  const et = S.etiket(k);
  const etiketler = etiketYerlestir(et);
  const olculer = (S.olcu ? S.olcu(k) : []).map(([ad, o]) => {
    const [a, b, x] = OLCU[ad]();
    return {a: proj(a), b: proj(b), o, metin: L.olcu[ad], ...x};
  });
  // altyazı
  let yazi = '';
  for (const a of K.altyazi) if (t >= a.bas && t < a.son + 0.05) yazi = a.metin;
  // flaş (dünya değişince kesme)
  let flas = 0;
  if (r.i > 0) {
    const p = SAHNE[K.sahneler[r.i - 1].ad];
    if (!p || p.dunya !== S.dunya) flas = 0.85 * (1 - ss(0, 0.32, r.u));
  }
  ui.update({
    baslik: L.baslik[s.ad] || '',
    alt: L.alt[s.ad] || '',
    yazi,
    d: ruz,
    egri: EGRI,
    bolum: s.ad,
    etiketler,
    olculer,
    flas,
    kart: S.kart ? {o: S.kart(k), html: L.kart()} : null,
  });
}
window.kare = kare;


// varsayılan kurgu (önizleme)
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
