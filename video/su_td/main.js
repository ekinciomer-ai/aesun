// Su (hidroelektrik) teardown filmi (Kozmos Lab, Enerji Üretim Kaynakları 03). Atatürk Barajı referanslı.
// Atatürk: kaya dolgu kil çekirdekli, 169 m; 8 × 300 MW Francis = 2400 MW; cebri boru çapı 7,25 m'ye kadar;
// yıllık ~8900 GWh; santral debisi gün içinde 200–2000 m³/s. Üç Boğaz: 22.500 MW, 181 m, 2335 m.
// Kayıt arayüzü: window.HAZIR, kurgu(K), kare(t) — kare(t) t'nin saf fonksiyonu.
import * as THREE from 'three';
import {EffectComposer} from 'three/addons/postprocessing/EffectComposer.js';
import {GTAOPass} from 'three/addons/postprocessing/GTAOPass.js';
import {OutputPass} from 'three/addons/postprocessing/OutputPass.js';
import {Pass} from 'three/addons/postprocessing/Pass.js';
import {RenderPass} from 'three/addons/postprocessing/RenderPass.js';
import {ACC, KES, MAT, mats, BRJ, buildBaraj, buildUnite, arazi, buildUcBogaz} from './model.js';
import {createUI} from './ui.js';
import * as UTR from './uydu_tr.js';
import * as UUS from './uydu_us.js';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';

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

const LX = {
  tr: {
    no: '03', bolum: 'BÖLÜM', seri: 'ENERJİ ÜRETİM KAYNAKLARI', etut: 'MEKANİZMA ETÜDÜ', canli: 'CANLI VERİ', egri: 'GÜÇ – DEBİ', ondalik: ',',
    rows: ['DEBİ', 'ÜNİTE', 'GÜÇ', 'KAPAK', 'YILLIK'],
    bolumler: ['hero', 'dongu', 'baraj', 'boru', 'turbin', 'sebeke', 'pompaj', 'dunya'],
    ad: {hero: 'GİRİŞ', dongu: 'DÖNGÜ', baraj: 'BARAJ', boru: 'BORU', turbin: 'TÜRBİN', sebeke: 'ŞEBEKE', pompaj: 'POMPAJ', dunya: 'DÜNYA', son: 'SON'},
    baslik: {hero: 'Su', dongu: 'Su Döngüsü', baraj: 'Baraj', boru: 'Cebri Boru', turbin: 'Francis Türbini', sebeke: 'Şebeke', pompaj: 'Pompaj Depolama', dunya: 'Üç Boğaz', son: 'Su'},
    alt: {
      hero: 'ATATÜRK BARAJI · 2.400 MW', dongu: 'GÜNEŞ → BUHAR → YAĞMUR → NEHİR', baraj: 'KAYA DOLGU · KİL ÇEKİRDEK · 169 m', boru: 'Ø 7,25 m ÇELİK BORULAR',
      turbin: 'SALYANGOZ → AYAR KANATLARI → ÇARK', sebeke: '8 ÜNİTE × 300 MW', pompaj: 'DEV BİR PİL', dunya: 'ÇİN · 22.500 MW', son: 'YAĞMURDAN ELEKTRİĞE',
    },
    e: {
      tr: ['TÜRKİYE', ''],
      firat: ['FIRAT NEHRİ', ''],
      ataturk: ['ATATÜRK BARAJI', 'Adıyaman · Şanlıurfa'],
      baraj: ['BARAJ GÖVDESİ', 'kaya dolgu · 169 m'], rez: ['REZERVUAR', '48,7 milyar m³'], santral: ['SANTRAL BİNASI', '8 ünite'], boru: ['CEBRİ BORU', 'Ø 7,25 m\'ye kadar'],
      kil: ['KİL ÇEKİRDEK', 'suyu geçirmez'], filtre: ['FİLTRE', 'çekirdeği korur'], kaya: ['KAYA DOLGU', 'gövdenin ağırlığı'], anr: ['ANROŞMAN', 'dalgaya karşı kaplama'],
      salyangoz: ['SALYANGOZ', 'suyu çevreye dağıtır'], ayar: ['AYAR KANATLARI', 'debiyi ayarlar'], cark: ['FRANCIS ÇARKI', 'su enerjisi → dönüş'], emme: ['EMME BORUSU', 'suyu tahliye eder'], jen: ['JENERATÖR', '300 MW'], mil: ['MİL', ''],
      gunes: ['GÜNEŞ', 'suyu buharlaştırır'], bulut: ['BULUT', ''], dag: ['YAĞMUR / KAR', 'dağlara'], nehir: ['NEHİR', 'barajda birikir'],
      ust: ['ÜST HAVUZ', 'depolanan enerji'], alt: ['ALT HAVUZ', ''], pt: ['POMPA-TÜRBİN', 'iki yönlü çalışır'],
      ucb: ['ÜÇ BOĞAZ BARAJI', '181 m · 22.500 MW'], trafo: ['TRAFOLAR', 'gerilimi yükseltir'], hat: ['İLETİM HATTI', ''],
    },
    olcu: {h: '169 m', ucL: '2.335 m'},
    gece: 'GECE · POMPA', gunduz: 'GÜNDÜZ · ÜRETİM',
    kart: () => `<div class="mo" style="font-size:30px;letter-spacing:.2em;color:#7d828a">SIRADAKİ BÖLÜM</div><div style="font-size:120px;font-weight:700;letter-spacing:-.03em;margin-top:6px">Atom<span style="color:${ACC}">.</span></div><div class="mo" style="font-size:26px;letter-spacing:.14em;margin-top:8px;color:#5d636b">ENERJİ ÜRETİM KAYNAKLARI · 04</div>`,
  },
  en: {
    no: '03', bolum: 'EPISODE', seri: 'ENERGY SOURCES', etut: 'MECHANISM STUDY', canli: 'LIVE DATA', egri: 'POWER – FLOW', ondalik: '.',
    rows: ['POWER', 'UNITS', 'GATES', 'HEAD', 'DAM'],
    bolumler: ['hero', 'dongu', 'baraj', 'boru', 'turbin', 'sebeke', 'pompaj', 'dunya'],
    ad: {hero: 'INTRO', dongu: 'CYCLE', baraj: 'DAM', boru: 'PENSTOCK', turbin: 'TURBINE', sebeke: 'GRID', pompaj: 'PUMPED', dunya: 'WORLD', son: 'END'},
    baslik: {hero: 'Water', dongu: 'The Water Cycle', baraj: 'The Dam', boru: 'Penstocks', turbin: 'Francis Turbine', sebeke: 'To the Grid', pompaj: 'Pumped Storage', dunya: 'Three Gorges', son: 'Water'},
    alt: {
      hero: 'HOOVER DAM · 2,080 MW', dongu: 'SUN → VAPOUR → RAIN → RIVER', baraj: 'CONCRETE ARCH-GRAVITY · 221 m', boru: 'Ø 9.1 m STEEL PIPES',
      turbin: 'SPIRAL CASE → WICKET GATES → RUNNER', sebeke: '17 GENERATORS · 2,080 MW', pompaj: 'A GIANT BATTERY', dunya: 'CHINA · 22,500 MW', son: 'FROM RAIN TO POWER',
    },
    e: {
      tr: ['USA', ''],
      firat: ['COLORADO RIVER', ''],
      ataturk: ['HOOVER DAM', 'Nevada · Arizona'], mead2: ['', ''],
      baraj: ['DAM BODY', 'concrete · 221 m'], rez: ['LAKE MEAD', 'reservoir'], santral: ['POWERHOUSE', '17 generators'], boru: ['PENSTOCK', 'Ø 9.1 m'], mead: ['LAKE MEAD', 'reservoir'], beton: ['CONCRETE ARCH-GRAVITY', '221 m tall'], taban: ['201 m THICK', 'at the base'], kret: ['14 m', 'at the crest'],
      kil: ['CLAY CORE', 'watertight'], filtre: ['FILTER', 'protects the core'], kaya: ['ROCKFILL', 'the dam\'s weight'], anr: ['RIPRAP', 'wave armour'],
      salyangoz: ['SPIRAL CASE', 'spreads the water'], ayar: ['WICKET GATES', 'set the flow'], cark: ['FRANCIS RUNNER', 'water → rotation'], emme: ['DRAFT TUBE', 'releases the water'], jen: ['GENERATOR', ''], mil: ['SHAFT', ''],
      gunes: ['SUN', 'evaporates water'], bulut: ['CLOUD', ''], dag: ['RAIN / SNOW', 'on the mountains'], nehir: ['RIVER', 'fills the dam'],
      ust: ['UPPER RESERVOIR', 'stored energy'], alt: ['LOWER RESERVOIR', ''], pt: ['PUMP-TURBINE', 'works both ways'],
      ucb: ['THREE GORGES DAM', '181 m · 22,500 MW'], trafo: ['TRANSFORMERS', 'step up voltage'], hat: ['POWER LINE', ''],
    },
    olcu: {h: '221 m', ucL: '2,335 m'},
    gece: 'NIGHT · PUMPING', gunduz: 'DAY · GENERATING',
    kart: () => `<div class="mo" style="font-size:30px;letter-spacing:.2em;color:#7d828a">NEXT EPISODE</div><div style="font-size:120px;font-weight:700;letter-spacing:-.03em;margin-top:6px">The Atom<span style="color:${ACC}">.</span></div><div class="mo" style="font-size:26px;letter-spacing:.14em;margin-top:8px;color:#5d636b">ENERGY SOURCES · 04</div>`,
  },
};
const L = LX[DIL];
// İngilizce kanal ABD izleyicisine göre: Hoover Barajı (Nevada/Arizona)
const US = DIL === 'en';
const {UYDU, KUCUK} = US ? UUS : UTR;
const YER = US
  ? {geo: {lat: 36.016, lon: -114.7377}, img: ['us_bm', 'hv_bolge', 'hv_yakin', 'hv_baraj'], bm: 'us_bm', bas: [39.0, -98.0], son: [38.0, -102.0], ulke: [40.5, -103.0], nehir: [35.93, -114.73], d0: 3.6e6, d1: 7500, d2: 3.2e6, ad: 'HOOVER DAM'}
  : {geo: {lat: 37.48, lon: 38.32}, img: ['tr_bm', 'ata_bolge', 'ata_yakin', 'ata_baraj'], bm: 'tr_bm', bas: [39.2, 35.2], son: [38.6, 35.2], ulke: [39.0, 33.0], nehir: [37.25, 38.27], d0: 2.2e6, d1: 5200, d2: 1.25e6, ad: 'ATATÜRK BARAJI'};

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
const OF = {uydu: new V3(0, -50000, 0), uydu2: new V3(0, -100000, 0), baraj: new V3(0, 0, 0), unite: new V3(40000, 30, 0), dongu: new V3(10000, 0, 0), pompaj: new V3(20000, 0, 0), ucb: new V3(30000, 0, 0)};
const BR = buildBaraj(US ? 'beton' : 'kaya');
scene.add(BR.root);
// trafolar ve hat (santralin yanında)
const sebekeG = new THREE.Group();
{
  for (let i = 0; i < 8; i++) {
    const t = new THREE.Mesh(new RoundedBoxGeometry(9, 8, 7, 3, 0.4), MAT.koyu);
    t.castShadow = true;
    t.position.set(BR.SX - 105 + i * 30, 4, BR.SZ + 70);
    sebekeG.add(t);
  }
  const pts = [];
  for (let i = 0; i < 6; i++) {
    const p = new THREE.Group();
    p.add(new THREE.Mesh(new THREE.CylinderGeometry(0.6, 1.2, 46, 8), MAT.koyu));
    p.children[0].position.y = 23;
    p.add(new THREE.Mesh(new THREE.BoxGeometry(22, 1, 1), MAT.koyu));
    p.children[1].position.y = 44;
    p.position.set(BR.SX + 220 + i * 140, 20, BR.SZ + 120 + i * 90);
    p.traverse((o) => (o.castShadow = true));
    sebekeG.add(p);
    pts.push(p.position.clone().add(new V3(0, 44, 0)));
  }
  const tel = [];
  for (let i = 0; i < pts.length - 1; i++)
    for (const s of [-9, 0, 9])
      for (let k = 0; k < 12; k++) {
        const a = pts[i].clone().add(new V3(s, 0, 0)), b = pts[i + 1].clone().add(new V3(s, 0, 0));
        const p0 = a.clone().lerp(b, k / 12), p1 = a.clone().lerp(b, (k + 1) / 12);
        p0.y -= Math.sin((Math.PI * k) / 12) * 6;
        p1.y -= Math.sin((Math.PI * (k + 1)) / 12) * 6;
        tel.push(p0, p1);
      }
  sebekeG.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(tel), new THREE.LineBasicMaterial({color: '#3a3e44'})));
}
BR.root.add(sebekeG);
const UN = buildUnite();
UN.root.position.copy(OF.unite);
scene.add(UN.root);
// su döngüsü dioraması
const DONGU = new THREE.Group();
DONGU.position.copy(OF.dongu);
const hDongu = (x, z) => {
  const dag = 150 * Math.exp(-((x + 120) ** 2 + (z + 60) ** 2) / 9000) + 90 * Math.exp(-((x + 40) ** 2 + (z + 160) ** 2) / 6000) + 70 * Math.exp(-((x - 80) ** 2 + (z + 150) ** 2) / 7000);
  const nehir = -14 * Math.exp(-((x - (z * 0.35 + 30)) ** 2) / 260) * cl((z + 80) / 120);
  const deniz = z > 150 ? -18 * cl((z - 150) / 30) : 0;
  return Math.max(-18, 6 + dag + nehir + deniz);
};
DONGU.add(arazi(520, 520, 140, hDongu, (h, c) => {
  if (h < 0.5) c.set('#9fb6c4');
  else if (h > 120) c.set('#f4f4f2');
  else if (h > 60) c.set('#a59a86');
  else c.set('#9fb48a');
}));
const denizD = new THREE.Mesh(new THREE.PlaneGeometry(520, 110), MAT.su);
denizD.rotation.x = -Math.PI / 2;
denizD.position.set(0, -2, 205);
DONGU.add(denizD);
const GT = (() => {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const x = c.getContext('2d');
  const g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.5, 'rgba(255,255,255,.5)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g;
  x.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(c);
})();
const gunesS = new THREE.Sprite(new THREE.SpriteMaterial({map: GT, color: '#ffcf5a', depthWrite: false}));
gunesS.scale.setScalar(90);
gunesS.position.set(200, 260, 120);
DONGU.add(gunesS);
const buhar = [], bulutlar = [], yagmur = [];
for (let i = 0; i < 60; i++) {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({map: GT, color: '#cfe3ee', transparent: true, depthWrite: false, opacity: 0}));
  DONGU.add(s);
  buhar.push({s, x: -200 + ((i * 37) % 400), f: (i * 0.618) % 1});
}
for (let i = 0; i < 26; i++) {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({map: GT, color: '#e9eef2', transparent: true, depthWrite: false, opacity: 0.95}));
  s.scale.setScalar(50 + (i % 5) * 12);
  DONGU.add(s);
  bulutlar.push({s, x: -150 + ((i * 53) % 300), z: -150 + ((i * 29) % 160), y: 210 + (i % 4) * 8});
}
const yagG = new THREE.InstancedMesh(new THREE.BoxGeometry(0.4, 9, 0.4), new THREE.MeshBasicMaterial({color: '#6aa9c8', transparent: true, opacity: 0.7}), 300);
yagG.frustumCulled = false;
DONGU.add(yagG);
for (let i = 0; i < 300; i++) yagmur.push({x: -170 + ((i * 41) % 220), z: -200 + ((i * 67) % 170), f: (i * 0.377) % 1});
// nehir akışı (şerit)
const nehirMat = new THREE.ShaderMaterial({
  uniforms: {uT: {value: 0}, uC: {value: new THREE.Color(ACC)}},
  vertexShader: `varying vec2 vU; void main(){ vU = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }`,
  fragmentShader: `uniform float uT; uniform vec3 uC; varying vec2 vU; void main(){ float s = fract(vU.x*30. - uT*1.5); float k = smoothstep(.0,.2,s)*smoothstep(.7,.5,s); gl_FragColor = vec4(mix(uC*.85, vec3(1.), k*.5), .95); }`,
  transparent: true,
  depthWrite: false,
});
{
  const pts = [];
  for (let z = -80; z <= 160; z += 10) pts.push(new V3(z * 0.35 + 30, hDongu(z * 0.35 + 30, z) + 1.5, z));
  const m = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 100, 2.4, 8), nehirMat);
  DONGU.add(m);
}
scene.add(DONGU);
// pompaj dioraması: üst havuz (tepede), alt havuz (vadide), basınçlı tünel, pompa-türbin santrali
const POMPA = new THREE.Group();
POMPA.position.copy(OF.pompaj);
const hPompa = (x, z) => {
  const tepe = 150 * cl(1 - Math.hypot(x + 110, z + 20) / 220) ** 0.7;
  const ustHavuz = Math.hypot(x + 140, z + 20) < 60 ? -28 * cl(1 - Math.hypot(x + 140, z + 20) / 60) : 0;
  const altHavuz = Math.hypot(x - 140, z - 40) < 80 ? -22 * cl(1 - Math.hypot(x - 140, z - 40) / 80) : 0;
  return 8 + tepe + ustHavuz + altHavuz;
};
POMPA.add(arazi(520, 400, 140, hPompa, (h, c) => (h > 100 ? c.set('#a8a08c') : c.set('#a9b993'))));
const ustSu = new THREE.Mesh(new THREE.CircleGeometry(54, 64), MAT.su);
ustSu.rotation.x = -Math.PI / 2;
ustSu.position.set(-140, 140, -20);
POMPA.add(ustSu);
const altSu = new THREE.Mesh(new THREE.CircleGeometry(72, 64), MAT.su);
altSu.rotation.x = -Math.PI / 2;
altSu.position.set(140, 0, 40);
POMPA.add(altSu);
const tunelC = new THREE.CatmullRomCurve3([new V3(-120, 128, -14), new V3(-60, 90, 0), new V3(20, 20, 20), new V3(80, 8, 32), new V3(120, 4, 38)]);
const tunel = new THREE.Mesh(new THREE.TubeGeometry(tunelC, 80, 3.2, 16), MAT.boru);
tunel.castShadow = true;
POMPA.add(tunel);
const ptBina = new THREE.Mesh(new RoundedBoxGeometry(34, 20, 26, 3, 1), MAT.beton);
ptBina.position.set(80, 18, 32);
ptBina.castShadow = true;
POMPA.add(ptBina);
scene.add(POMPA);
// Üç Boğaz
const UB = buildUcBogaz();
UB.root.position.copy(OF.ucb);
scene.add(UB.root);
// uydu dünyaları: coğrafi koordinat → metre (orijin: baraj). Görüntüler ışıktan bağımsız (gerçek renk).
const GEO = {ata: YER.geo, ucb: {lat: 30.8225, lon: 111.0035}};
const geo = (o, lat, lon) => new V3((lon - o.lon) * 111320 * Math.cos(o.lat * D2R), 0, -(lat - o.lat) * 110574);
const YUK = [];
const yukle = (src) => {
  let bitti;
  YUK.push(new Promise((r) => (bitti = r)));
  const t = new THREE.TextureLoader().load(src, () => bitti(), undefined, () => bitti());
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
};
const uyduDunya = (o, adlar) => {
  const g = new THREE.Group();
  adlar.forEach((ad, i) => {
    const r = UYDU[ad];
    const [s0, w0, n0, e0] = r.bbox;
    const a = geo(o, s0, w0), b = geo(o, n0, e0);
    const m = new THREE.Mesh(new THREE.PlaneGeometry(b.x - a.x, a.z - b.z), new THREE.MeshBasicMaterial({map: yukle(r.src), toneMapped: false, fog: false, depthWrite: false}));
    m.rotation.x = -Math.PI / 2;
    m.position.set((a.x + b.x) / 2, 0, (a.z + b.z) / 2);
    m.renderOrder = i;
    m.userData.gen = b.x - a.x;
    m.material.transparent = i > 0;
    g.add(m);
  });
  yerler.push(g);
  return g;
};
const UY1 = uyduDunya(GEO.ata, YER.img);
UY1.position.set(0, 0, 0);
const uy1 = new THREE.Group();
uy1.add(UY1);
uy1.position.set(0, -50000, 0); // ayrı dünya: aşağıda (diğer dünyalar görünmez)
scene.add(uy1);
const UY2 = uyduDunya(GEO.ucb, ['ucb_bolge', 'ucb_yakin']);
const uy2 = new THREE.Group();
uy2.add(UY2);
uy2.position.set(0, -100000, 0);
scene.add(uy2);
// Üç Boğaz baraj ekseni (görüntüden ölçülen uçlar, ucb_yakin piksel → koordinat)
const ucbPx = (x, y) => {
  const [s0, w0, n0, e0] = UYDU.ucb_yakin.bbox;
  return geo(GEO.ucb, n0 - (y / 1462) * (n0 - s0), w0 + (x / 2048) * (e0 - w0));
};
const UCB_A = ucbPx(1010, 880), UCB_B = ucbPx(1265, 625);
// su parçacıkları (boru, ünite, pompaj): instanced küreler
const NP = 320;
const parc = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 10, 8), MAT.acc, NP);
parc.frustumCulled = false;
scene.add(parc);

// ------------------------------------------------------------ fizik: debi → güç (sabit düşüde yaklaşık doğrusal)
const NU = US ? 17 : 8, PMAX = US ? 2080 : 2400;
const durum = (Qt) => {
  const Q2 = cl(Qt, 0, 2000);
  const unite = Q2 <= 0 ? 0 : Math.min(NU, Math.ceil((Q2 / 2000) * NU));
  const P = PMAX * (Q2 / 2000);
  const kapak = unite ? Q2 / ((unite * 2000) / NU) : 0;
  return {Q: Q2, unite, P, kapak};
};

// ------------------------------------------------------------ UI
const YATAY = Q.get('ar') === '169';
const UW = YATAY ? 1920 : 1080, UH = YATAY ? 1080 : 1920;
const EB = YATAY ? {x0: 30, x1: 1350, y0: 330, y1: 1000, orta: 690, yb: 340, ys: 930, sag: 1350} : {x0: 30, x1: 1050, y0: 330, y1: 1300, orta: 540, yb: 380, ys: 1180, sag: 1040};
const ui = createUI(app, L, YATAY);
const fmt = (x, d) => x.toFixed(d).replace('.', L.ondalik).replace(/\B(?=(\d{3})+(?!\d))/g, L.ondalik === ',' ? '.' : ',');
function grafik(d) {
  const W = 380, H = 150;
  let h = `<g transform="translate(18 8)"><line x1="0" x2="${W}" y1="${H}" y2="${H}" stroke="#16181b" stroke-width="2"/><line x1="0" x2="0" y1="0" y2="${H}" stroke="#16181b" stroke-width="2"/>`;
  h += `<path d="M0 ${H} L${W * 0.92} ${H - H * 0.85}" stroke="#16181b" stroke-width="3" fill="none"/>`;
  const mx = (d.Q / 2000) * W * 0.92, my = H - (d.P / PMAX) * H * 0.85;
  h += `<line x1="${mx}" x2="${mx}" y1="${my}" y2="${H}" stroke="${ACC}" stroke-width="2"/><circle cx="${mx}" cy="${my}" r="10" fill="${ACC}" stroke="#fff" stroke-width="3"/>`;
  h += `<text x="${W}" y="${H + 26}" text-anchor="end" font-size="17" font-family="JetBrains Mono" fill="#7d828a">${US ? 'flow' : 'm³/s'}</text><text x="6" y="16" font-size="17" font-family="JetBrains Mono" fill="#7d828a">MW</text>`;
  return h + '</g>';
}

// ------------------------------------------------------------ sahneler
const ALT_Y = YATAY ? 0 : -150;
const SOL_X = YATAY ? 260 : 0;
const ob = (k, v) => OF[k].clone().add(v);
const SAHNE = {
  hero: {dunya: 'uydu', uydu: true, cam: (k) => {
      const z = ss(0, 0.92, k);
      const t0 = geo(GEO.ata, ...YER.bas), t1 = new V3(0, 0, 0);
      const tt = t0.clone().lerp(t1, ss(0, 0.55, k)).add(OF.uydu);
      return {t: tt, az: lerp(0, 20, z), el: lerp(89, 58, ss(0.5, 1, k)), d: Math.exp(lerp(Math.log(YER.d0), Math.log(YER.d1), z)), fov: 42};
    }, Q: () => 1500, etiket: (k) => [['tr', ss(0.0, 0.08, k) * (1 - ss(0.3, 0.38, k))], ['firat', ss(0.45, 0.55, k) * (1 - ss(0.75, 0.8, k))], ...(US ? [['mead', ss(0.5, 0.6, k) * (1 - ss(0.75, 0.8, k))]] : []), ['ataturk', ss(0.62, 0.72, k)]]},
  dongu: {dunya: 'dongu', cam: (k) => ({t: ob('dongu', new V3(0, 60, 0)), az: lerp(140, 165, k), el: lerp(26, 22, k), d: lerp(820, 760, k), fov: 42}), Q: () => 900, etiket: (k) => [['gunes', ss(0.05, 0.15, k)], ['bulut', ss(0.25, 0.35, k)], ['dag', ss(0.45, 0.55, k)], ['nehir', ss(0.65, 0.75, k)]]},
  baraj: {dunya: 'baraj', yamacYok: true, cam: (k) => ({t: new V3(0, 70, -60), az: lerp(70, 86, k), el: lerp(10, 4, k), d: lerp(1500, 1350, k), fov: 42}), ac: (k) => ss(0.08, 0.3, k), Q: () => 1500, etiket: (k) => (US ? [['beton', ss(0.3, 0.38, k)], ['taban', ss(0.38, 0.46, k)], ['kret', ss(0.46, 0.54, k)]] : [['kil', ss(0.3, 0.38, k)], ['filtre', ss(0.36, 0.44, k)], ['kaya', ss(0.42, 0.5, k)], ['anr', ss(0.48, 0.56, k)]]), olcu: (k) => [['h', ss(0.55, 0.7, k)]]},
  boru: {dunya: 'baraj', cam: (k) => ({t: new V3(-150, 80, 330), az: lerp(58, 72, k), el: lerp(22, 16, k), d: lerp(720, 620, k), fov: 42}), Q: (k) => lerp(600, 2000, ss(0, 0.8, k)), parc: 'boru', etiket: (k) => [['boru', ss(0.15, 0.3, k)], ['santral', ss(0.5, 0.65, k)]]},
  turbin: {dunya: 'unite', kesit: true, cam: (k) => ({t: ob('unite', new V3(2, lerp(-1, 4, k), 0)), az: lerp(28, 48, k), el: lerp(26, 18, k), d: lerp(62, 74, k), fov: 42}), Q: (k) => lerp(800, 2000, ss(0, 0.6, k)), parc: 'unite', etiket: (k) => [['salyangoz', ss(0.06, 0.14, k)], ['ayar', ss(0.12, 0.2, k)], ['cark', ss(0.18, 0.26, k)], ['emme', ss(0.3, 0.38, k)], ['jen', ss(0.5, 0.58, k)], ['mil', ss(0.55, 0.63, k)]]},
  sebeke: {dunya: 'baraj', kesit: true, cam: (k) => ({t: new V3(-60, 30, 520), az: lerp(20, 40, k), el: lerp(28, 22, k), d: lerp(620, 700, k), fov: 42}), Q: () => 2000, etiket: (k) => [['santral', ss(0.05, 0.15, k)], ['trafo', ss(0.3, 0.4, k)], ['hat', ss(0.5, 0.6, k)]]},
  pompaj: {dunya: 'pompaj', cam: (k) => ({t: ob('pompaj', new V3(0, 50, 10)), az: lerp(-6, 12, k), el: lerp(32, 28, k), d: lerp(820, 760, k), fov: 42}), Q: (k) => (k < 0.5 ? -1000 : 1000), parc: 'pompaj', etiket: (k) => [['ust', ss(0.05, 0.15, k)], ['alt', ss(0.1, 0.2, k)], ['pt', ss(0.25, 0.35, k)]]},
  dunya: {dunya: 'uydu2', uydu: true, cam: (k) => ({t: UCB_A.clone().lerp(UCB_B, 0.5).add(OF.uydu2), az: lerp(-10, 15, k), el: lerp(89, 62, ss(0.4, 1, k)), d: Math.exp(lerp(Math.log(95000), Math.log(5600), ss(0, 0.6, k))), fov: 42}), Q: () => 2000, ucb: true, etiket: (k) => [['ucb', ss(0.45, 0.55, k)]], olcu: (k) => [['ucL', ss(0.55, 0.7, k)]]},
  son: {dunya: 'uydu', uydu: true, cam: (k) => ({t: new V3(0, 0, 0).lerp(geo(GEO.ata, ...YER.son), ss(0.2, 1, k)).add(OF.uydu), az: lerp(20, 0, k), el: lerp(60, 89, ss(0, 0.5, k)), d: Math.exp(lerp(Math.log(YER.d1 * 1.15), Math.log(YER.d2), ss(0, 0.9, k))), fov: 42}), Q: () => 1500, kart: (k) => ss(0.4, 0.55, k), etiket: (k) => [['ataturk', 1 - ss(0.2, 0.3, k)]]},
};
const AN = {
  tr: () => geo(GEO.ata, ...YER.ulke).add(OF.uydu),
  mead: () => geo(GEO.ata, 36.06, -114.66).add(OF.uydu),
  beton: () => new V3(0, 150, 30),
  taban: () => new V3(0, 8, 120),
  kret: () => new V3(0, BRJ.H, 0),
  firat: () => geo(GEO.ata, ...YER.nehir).add(OF.uydu),
  ataturk: () => OF.uydu.clone(),
  baraj: () => new V3(250, BRJ.H - 10, 30),
  rez: () => new V3(0, BRJ.H - 9, -900),
  santral: () => new V3(BR.SX + 60, 48, BR.SZ + 10),
  boru: () => BR.borular[6].getPointAt(0.55).clone().add(new V3(0, 4, 0)),
  kil: () => new V3(0, 100, 0),
  filtre: () => new V3(0, 60, -40),
  kaya: () => new V3(0, 50, 190),
  anr: () => new V3(0, 40, -BRJ.H * BRJ.egim + 90),
  salyangoz: () => ob('unite', new V3(-9, 1.5, 3)),
  ayar: () => ob('unite', new V3(-4, 1.2, -3)),
  cark: () => ob('unite', new V3(0, -1.5, -3.5)),
  emme: () => ob('unite', new V3(0, -12, 8)),
  jen: () => ob('unite', new V3(-7, 19, 0)),
  mil: () => ob('unite', new V3(0.7, 10, 0)),
  gunes: () => ob('dongu', new V3(200, 260, 120)),
  bulut: () => ob('dongu', new V3(-60, 215, -80)),
  dag: () => ob('dongu', new V3(-120, 150, -60)),
  nehir: () => ob('dongu', new V3(55, 12, 70)),
  ust: () => ob('pompaj', new V3(-140, 145, -20)),
  alt: () => ob('pompaj', new V3(140, 4, 40)),
  pt: () => ob('pompaj', new V3(80, 28, 32)),
  ucb: () => UCB_B.clone().add(OF.uydu2),
  trafo: () => new V3(BR.SX + 60, 9, BR.SZ + 70),
  hat: () => new V3(BR.SX + 500, 64, BR.SZ + 300),
};
const OLCU = {
  h: () => (US ? [new V3(0, 0, 215), new V3(0, BRJ.H, 215), {dx: 70}] : [new V3(0, 0, BRJ.H * BRJ.egim + 30), new V3(0, BRJ.H, BRJ.H * BRJ.egim + 30), {dx: 70}]),
  ucL: () => [UCB_A.clone().add(OF.uydu2), UCB_B.clone().add(OF.uydu2), {dy: -46}],
};

const KONUM = (() => {
  const [s0, w0, n0, e0] = UYDU[YER.bm].bbox;
  // küçük harita 260x120 kutuda ortalanmış "cover": oranı hesapla
  const W0 = 480, H0 = Math.round((480 * (n0 - s0)) / (e0 - w0));
  const px = ((GEO.ata.lon - w0) / (e0 - w0)) * W0, py = ((n0 - GEO.ata.lat) / (n0 - s0)) * H0;
  const sc = Math.max(260 / W0, 120 / H0);
  const ox = (260 - W0 * sc) / 2, oy = (120 - H0 * sc) / 2;
  return {x: (ox + px * sc) / 260, y: (oy + py * sc) / 120};
})();
// ------------------------------------------------------------ zaman
let K = null;
function sahneAt(t) {
  let i = 0;
  while (i < K.sahneler.length - 1 && t >= K.sahneler[i + 1].bas) i++;
  const s = K.sahneler[i];
  const D = s.son - s.bas;
  return {i, s, S: SAHNE[s.ad] || SAHNE.hero, u: t - s.bas, D, k: cl((t - s.bas) / D)};
}
const DT = 1 / 60;
let ACI = null;
window.kurgu = (k) => {
  K = k;
  const n = Math.ceil((K.toplam + 1) / DT);
  ACI = new Float32Array(n + 1);
  let a = 0;
  for (let i = 1; i <= n; i++) {
    const t = (i - 0.5) * DT;
    const r = sahneAt(t);
    const q = r.S.Q(r.k);
    a += (Math.abs(q) / 2000) * 2 * Math.PI * 1.6 * DT * Math.sign(q || 1);
    ACI[i] = a;
  }
};
const look = (A, t) => {
  const u = cl(t / DT, 0, A.length - 2);
  const i = Math.floor(u);
  return A[i] + (A[i + 1] - A[i]) * (u - i);
};
const blend = (a, b, k) => ({t: a.t.clone().lerp(b.t, k), az: a.az + ((((b.az - a.az + 540) % 360) - 180) * k), el: lerp(a.el, b.el, k), d: lerp(a.d, b.d, k), fov: lerp(a.fov, b.fov, k)});
const camAt = (t) => {
  const r = sahneAt(t);
  let c = r.S.cam(r.k);
  if (r.i > 0 && r.u < 1.4) {
    const PS = SAHNE[K.sahneler[r.i - 1].ad];
    if (PS && PS.dunya === r.S.dunya) c = blend(PS.cam(1), c, ss(0, 1.4, r.u));
  }
  return c;
};
const pv = new V3();
const proj = (p) => {
  pv.copy(p).project(camera);
  if (pv.z > 1 || pv.z < -1) return null;
  return [(pv.x * 0.5 + 0.5) * UW, (-pv.y * 0.5 + 0.5) * UH];
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
    .filter((x) => x.at && x.at[0] > EB.x0 && x.at[0] < EB.x1 && x.at[1] > EB.y0 && x.at[1] < EB.y1);
  const Lc = pts.filter((x) => x.at[0] < EB.orta).sort((a, b) => a.at[1] - b.at[1]);
  const Rc = pts.filter((x) => x.at[0] >= EB.orta).sort((a, b) => a.at[1] - b.at[1]);
  const out = [];
  const stack = (col, sag) => {
    let y = EB.yb;
    for (const c of col) {
      y = Math.max(y, Math.min(EB.ys, c.at[1] - 40));
      const w = Math.max(c.ad.length * 20.5, c.alt.length * 15.6 + 25) + 26;
      out.push({...c, label: [sag ? EB.sag - w : 44, y], w});
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
  BR.root.visible = dunya === 'baraj';
  BR.yamac.visible = !S.yamacYok;
  UN.root.visible = dunya === 'unite';
  DONGU.visible = dunya === 'dongu';
  POMPA.visible = dunya === 'pompaj';
  UB.root.visible = false;
  uy1.visible = dunya === 'uydu';
  uy2.visible = dunya === 'uydu2';
  zemin.visible = !S.uydu;
  // yakın planlar uzaktan görünmez: kenar dikişini gizlemek için mesafeye göre belirir
  for (const g of [UY1, UY2]) g.children.forEach((m, i) => {
    if (i) m.material.opacity = 1 - ss(m.userData.gen * 2.0, m.userData.gen * 3.2, camAt(t).d);
  });
  const q = S.Q(k);
  const d = durum(Math.abs(q));
  // kamera
  const c = camAt(t);
  const az = c.az * D2R, el = c.el * D2R;
  camera.fov = YATAY ? c.fov * 0.75 : c.fov;
  camera.near = Math.max(0.1, c.d * 0.01);
  if (S.uydu) camera.near = c.d * 0.05;
  camera.far = c.d * 10 + 3000;
  camera.position.set(c.t.x + c.d * Math.cos(el) * Math.sin(az), c.t.y + c.d * Math.sin(el), c.t.z + c.d * Math.cos(el) * Math.cos(az));
  camera.lookAt(c.t);
  camera.setViewOffset(W, H, SOL_X * (W / UW), -ALT_Y * (H / UH), W, H);
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld();
  scene.fog.near = S.uydu ? 1e9 : c.d * 1.4;
  scene.fog.far = S.uydu ? 2e9 : c.d * 5;
  gtao.updateGtaoMaterial({radius: Math.max(0.2, c.d * 0.012)});
  // kesit (kameraya bakan yarı)
  if (S.kesit) {
    const n = new V3(-Math.sin(az), 0, -Math.cos(az));
    KES.normal.copy(n);
    KES.constant = -n.dot(dunya === 'unite' ? OF.unite : new V3(BR.SX, 0, BR.SZ + 10));
  } else KES.constant = 1e6;
  // baraj kesit açılımı
  const ac = S.ac ? S.ac(k) : 0;
  BR.parcalar[1].position.x = 260 * ac;
  BR.parcalar[1].visible = ac < 0.04;
  // ünite
  const aci = look(ACI, t);
  UN.cark.rotation.y = -aci * 3;
  UN.rotorJ.rotation.y = -aci * 3;
  UN.mil.rotation.y = -aci * 3;
  for (const w of UN.ayar) w.rotation.y = -w.userData.a + 0.25 + 0.9 * d.kapak;
  // döngü
  if (dunya === 'dongu') {
    for (const b of buhar) {
      const f = (b.f + t * 0.12) % 1;
      b.s.position.set(b.x * 0.6 + 60, -2 + f * 210, 200 - f * 260);
      b.s.scale.setScalar(10 + f * 30);
      b.s.material.opacity = 0.6 * Math.sin(Math.PI * f);
      b.s.visible = b.s.material.opacity > 0.01;
    }
    for (const b of bulutlar) b.s.position.set(b.x + Math.sin(t * 0.2 + b.x) * 6, b.y, b.z);
    const m4 = new THREE.Matrix4();
    yagmur.forEach((y, i) => {
      const f = (y.f + t * 0.9) % 1;
      m4.makeTranslation(y.x, 200 - f * 200 + hDongu(y.x, y.z) * f * 0.6, y.z);
      yagG.setMatrixAt(i, m4);
    });
    yagG.instanceMatrix.needsUpdate = true;
    nehirMat.uniforms.uT.value = t;
  }
  // parçacıklar
  parc.visible = !!S.parc;
  if (parc.visible) {
    const m4 = new THREE.Matrix4();
    for (let i = 0; i < NP; i++) {
      let p, sc;
      const f = (i * 0.618 + t * (S.parc === 'unite' ? 0.18 : 0.25) * (0.4 + d.kapak)) % 1;
      if (S.parc === 'boru') {
        p = BR.borular[i % 8].getPointAt(f);
        sc = 2.2;
      } else if (S.parc === 'unite') {
        p = UN.yollar[i % UN.yollar.length].getPointAt(f).add(OF.unite);
        sc = 0.22;
      } else {
        const ff = q < 0 ? 1 - f : f;
        p = tunelC.getPointAt(ff).add(OF.pompaj);
        sc = 2.4;
      }
      m4.makeScale(sc, sc, sc).setPosition(p);
      parc.setMatrixAt(i, m4);
    }
    parc.instanceMatrix.needsUpdate = true;
  }
  // pompaj su seviyeleri
  if (dunya === 'pompaj') {
    const seviye = k < 0.5 ? ss(0, 0.5, k) : 1 - ss(0.5, 1, k);
    ustSu.position.y = 128 + 10 * seviye;
    altSu.position.y = -4 + 6 * (1 - seviye);
  }
  // gölge
  const ext = cl(c.d * 1.2, 20, 4000);
  Object.assign(sun.shadow.camera, {left: -ext, right: ext, top: ext, bottom: -ext, near: ext * 0.05, far: ext * 6});
  sun.shadow.camera.updateProjectionMatrix();
  sun.target.position.copy(c.t);
  sun.position.copy(c.t).addScaledVector(SUN, ext * 3);
  sun.target.updateMatrixWorld();
  scene.updateMatrixWorld(true);
  composer.render();
  // UI
  const pomp = q < 0;
  const vals = [
    [d.Q / 2000, `${pomp ? '↑ ' : ''}${fmt(d.Q, 0)} m³/s`],
    [d.unite / 8, `${d.unite} / 8`],
    [d.P / 2400, `${pomp ? '−' : ''}${fmt(d.P, 0)} MW`],
    [d.kapak, `%${fmt(d.kapak * 100, 0)}`],
    [0.74, `${fmt(8900, 0)} GWh`],
  ];
  if (US) {
    vals[0] = [d.P / PMAX, `${pomp ? '−' : ''}${fmt(d.P, 0)} MW`];
    vals[1] = [d.unite / NU, `${d.unite} / ${NU}`];
    vals[2] = [d.kapak, `${fmt(d.kapak * 100, 0)}%`];
    vals[3] = [0.8, '≈ 180 m'];
    vals[4] = [1, '221 m'];
  }
  if (S.ucb) {
    vals[US ? 0 : 2] = [1, `${fmt(22500, 0)} MW`];
    vals[1] = [1, '34'];
  }
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
    if (!p || p.dunya !== S.dunya) flas = 0.85 * (1 - ss(0, 0.32, u));
  }
  ui.update({
    baslik: L.baslik[s.ad] || '',
    alt: s.ad === 'pompaj' ? (pomp ? L.gece : L.gunduz) : L.alt[s.ad] || '',
    yazi,
    vals,
    grafik: grafik(d),
    formul: 'P = ρ·g·Q·H·η',
    bolum: s.ad,
    etiketler,
    olculer,
    flas,
    kart: S.kart ? {o: S.kart(k), html: L.kart()} : null,
    konum: S.uydu || dunya === 'dongu' || dunya === 'pompaj' ? null : {img: KUCUK.src, ...KONUM, ad: YER.ad},
    kaynak: S.uydu ? (DIL === 'en' ? 'Satellite: NASA GIBS · HLS / MODIS / Blue Marble' : 'Uydu: NASA GIBS · HLS / MODIS / Blue Marble') : null,
  });
}
window.kare = kare;

const VARS = {toplam: 72, sahneler: Object.keys(SAHNE).map((ad, i) => ({ad, bas: i * 8, son: i * 8 + 8})), altyazi: []};
(async () => {
  await document.fonts.ready;
  await Promise.all(YUK);
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
