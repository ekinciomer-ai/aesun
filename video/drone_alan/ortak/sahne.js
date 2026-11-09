// Açık stüdyo + kullanım alanı zemini. GTAO yok (yazılımsal çizimde de hızlı), yumuşak gölge, tek accent.
// kare(durum, kamera) bir kare çizer; durum tamamen t'den hesaplanır (saf fonksiyon).
import * as THREE from 'three';
import {EffectComposer} from 'three/addons/postprocessing/EffectComposer.js';
import {OutputPass} from 'three/addons/postprocessing/OutputPass.js';
import {RenderPass} from 'three/addons/postprocessing/RenderPass.js';
import {gesDronu, kargoDronu, poz, tarimDronu} from './geometri.js';
import {gesGsd} from './kin.js';

const V3 = THREE.Vector3;
export const ZEMIN = {tarim: '#e9ece1', ges: '#e6e8eb', kargo: '#ece6dc'};
export const BG = '#f3f4f2';

// basit, tekrarlanabilir gürültü
const hash = (i) => { const x = Math.sin(i * 127.1) * 43758.5453; return x - Math.floor(x); };

export function sahneKur({canvas, mod}) {
  const renderer = new THREE.WebGLRenderer({canvas, antialias: false, preserveDrawingBuffer: true});
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(BG);
  scene.fog = new THREE.Fog(BG, mod === 'ges' ? 130 : mod === 'kargo' ? 45 : 16, mod === 'ges' ? 420 : mod === 'kargo' ? 140 : 52);
  const camera = new THREE.PerspectiveCamera(32, 1080 / 1920, 0.05, 400);
  const composer = new EffectComposer(renderer, new THREE.WebGLRenderTarget(4, 4, {type: THREE.HalfFloatType, samples: 4}));
  composer.addPass(new RenderPass(scene, camera));
  composer.addPass(new OutputPass());
  { // ortam ışığı: açık stüdyo kutuları
    const env = new THREE.Scene(); env.background = new THREE.Color('#e9ebe8');
    const kutu = (w, h, p, k) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({color: new THREE.Color(1, 1, 0.98).multiplyScalar(k), side: THREE.DoubleSide})); m.position.copy(p); m.lookAt(0, 0, 0); env.add(m); };
    kutu(12, 12, new V3(0, 14, 2), 2.2); kutu(3, 14, new V3(-12, 4, 6), 2.6); kutu(3, 14, new V3(12, 4, -4), 1.8);
    const pm = new THREE.PMREMGenerator(renderer); scene.environment = pm.fromScene(env, 0.02).texture; scene.environmentIntensity = 0.9; pm.dispose();
  }
  const sun = new THREE.DirectionalLight('#fff8ee', 2.4); sun.castShadow = true;
  const EXT = mod === 'ges' ? 3 : 4;
  Object.assign(sun.shadow.camera, {left: -EXT, right: EXT, top: EXT, bottom: -EXT, near: 0.5, far: 80});
  sun.shadow.mapSize.set(1024, 1024); sun.shadow.radius = 6; sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.01;
  scene.add(sun, sun.target); scene.add(new THREE.HemisphereLight('#ffffff', '#cfd3c8', 0.7));

  const zemin = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), new THREE.MeshStandardMaterial({color: ZEMIN[mod], roughness: 0.95}));
  zemin.rotation.x = -Math.PI / 2; zemin.receiveShadow = true; scene.add(zemin);

  const drone = mod === 'tarim' ? tarimDronu() : mod === 'ges' ? gesDronu() : kargoDronu();
  scene.add(drone.kok);
  const ek = {};

  if (mod === 'tarim') { // ekin sıraları (instanced), ilaçlanan şerit izi, sis parçacıkları
    const N = 90, M = 110, ar = 0.5;
    const bitki = new THREE.InstancedMesh(new THREE.ConeGeometry(0.07, 0.24, 5), new THREE.MeshStandardMaterial({color: '#9bb560', roughness: 0.9}), N * M);
    const m4 = new THREE.Matrix4();
    let k = 0;
    for (let i = 0; i < N; i++) for (let j = 0; j < M; j++) {
      const s = 0.7 + 0.6 * hash(k + 1);
      m4.compose(new V3((i - N / 2) * ar, 0.11 * s, (j - M / 2) * 0.32 + hash(k) * 0.1), new THREE.Quaternion(), new V3(s, s, s));
      bitki.setMatrixAt(k++, m4);
    }
    bitki.receiveShadow = true; scene.add(bitki);
    const iz = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({color: '#3d8fe0', transparent: true, opacity: 0.22, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4}));
    iz.rotation.x = -Math.PI / 2; iz.position.y = 0.26; scene.add(iz); ek.iz = iz;
    const NP = 2400, g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(NP * 3), 3));
    const sis = new THREE.Points(g, new THREE.PointsMaterial({color: '#7fb6ea', size: 0.07, transparent: true, opacity: 0.7, depthWrite: false}));
    sis.frustumCulled = false; scene.add(sis); ek.sis = sis; ek.NP = NP;
  }
  if (mod === 'ges') { // panel sıraları, termal katman, sıcak nokta, kamera izi
    const SIRA = 9, ADET = 40, panelW = 1.134, panelL = 2.278, arali = 6.5;
    const pg = new THREE.BoxGeometry(panelL, 0.04, panelW);
    const pn = new THREE.InstancedMesh(pg, new THREE.MeshStandardMaterial({color: '#24314f', roughness: 0.62, metalness: 0.15, envMapIntensity: 0.22}), SIRA * ADET * 2);
    const tm = new THREE.InstancedMesh(pg, new THREE.ShaderMaterial({
      transparent: true, uniforms: {uA: {value: 0}},
      vertexShader: 'varying vec3 vW; void main(){ vec4 w = modelMatrix * instanceMatrix * vec4(position,1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }',
      fragmentShader: 'uniform float uA; varying vec3 vW; vec3 pal(float x){ x=clamp(x,0.0,1.0); return mix(mix(vec3(0.08,0.02,0.25),vec3(0.55,0.05,0.55),smoothstep(0.0,0.4,x)), mix(vec3(0.95,0.35,0.05),vec3(1.0,0.92,0.4),smoothstep(0.75,1.0,x)), smoothstep(0.35,0.8,x)); } void main(){ float n = fract(sin(dot(floor(vW.xz*3.0), vec2(12.9898,78.233)))*43758.5453); gl_FragColor = vec4(pal(0.22 + 0.07*n + 0.03*sin(vW.x*0.7)), uA); }',
    }), SIRA * ADET * 2);
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, 0.42));
    let k = 0;
    for (let s = 0; s < SIRA; s++) for (let a = 0; a < ADET; a++) for (let u = 0; u < 2; u++) {
      const p = new V3((s - SIRA / 2) * arali, 1.2 + u * 0.02 * 0, (a - ADET / 2) * (panelW + 0.02));
      p.x += u * panelL * Math.cos(0.42) * 0; // tek yatay sıra × 2 (portre değil, iki dizi üst üste)
      p.y += u * (panelL * Math.sin(0.42) + 0.02); p.x += u * (panelL * Math.cos(0.42) + 0.02) - panelL * 0.45;
      m4.compose(p, q, new V3(1, 1, 1)); pn.setMatrixAt(k, m4); tm.setMatrixAt(k, m4); k++;
    }
    pn.castShadow = true; pn.receiveShadow = true; scene.add(pn); scene.add(tm); ek.tm = tm;
    const sicak = new THREE.Mesh(new THREE.PlaneGeometry(0.55, 0.55), new THREE.MeshBasicMaterial({color: '#fff6c8', transparent: true, opacity: 0, depthWrite: false}));
    { const mm = new THREE.Matrix4(), hedef = ((4 * ADET) + 24) * 2 + 1; pn.getMatrixAt(hedef, mm); const pos = new V3(), qq = new THREE.Quaternion(), sc = new V3(); mm.decompose(pos, qq, sc);
      const nrm = new V3(0, 1, 0).applyQuaternion(qq); sicak.position.copy(pos).addScaledVector(nrm, 0.03).add(new V3(0.3, 0, 0.2).applyQuaternion(qq));
      sicak.quaternion.copy(qq).multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0))); ek.sicakPos = sicak.position.clone(); }
    scene.add(sicak); ek.sicak = sicak;
    const iz = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.PlaneGeometry(1, 1)), new THREE.LineBasicMaterial({color: '#f05a23', transparent: true, opacity: 0}));
    iz.rotation.x = -Math.PI / 2; scene.add(iz); ek.izCerceve = iz;
    const koni = new THREE.Mesh(new THREE.ConeGeometry(1, 1, 4, 1, true), new THREE.MeshBasicMaterial({color: '#f05a23', transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide}));
    koni.rotation.y = Math.PI / 4; scene.add(koni); ek.koni = koni;
    const izY = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({color: '#f05a23', transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide}));
    izY.rotation.x = -Math.PI / 2; scene.add(izY); ek.izY = izY;
    const halka = new THREE.Mesh(new THREE.RingGeometry(1.1, 1.3, 48), new THREE.MeshBasicMaterial({color: '#f05a23', transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide}));
    halka.quaternion.copy(sicak.quaternion); halka.position.copy(sicak.position); halka.position.y += 0.02; scene.add(halka); ek.halka = halka;
    const isaret = new THREE.Mesh(new THREE.SphereGeometry(0.6, 16, 12), new THREE.MeshBasicMaterial({color: '#f05a23', transparent: true, opacity: 0, depthWrite: false})); scene.add(isaret); ek.isaret = isaret;
  }
  if (mod === 'kargo') { // teslimat noktası
    const hedef = new THREE.Mesh(new THREE.RingGeometry(1.0, 1.15, 48), new THREE.MeshBasicMaterial({color: '#f05a23', transparent: true, opacity: 0.9, polygonOffset: true, polygonOffsetFactor: -4}));
    hedef.rotation.x = -Math.PI / 2; hedef.position.y = 0.01; scene.add(hedef); ek.hedef = hedef;
    const x = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.12), hedef.material); x.rotation.set(-Math.PI / 2, 0, Math.PI / 4); x.position.y = 0.012; scene.add(x);
    const x2 = x.clone(); x2.rotation.z = -Math.PI / 4; scene.add(x2);
    for (let i = 0; i < 26; i++) { // kayalık tepe hissi
      const r = new THREE.Mesh(new THREE.DodecahedronGeometry(0.6 + hash(i) * 1.4, 0), new THREE.MeshStandardMaterial({color: '#cbbfae', roughness: 1}));
      const a = hash(i + 9) * Math.PI * 2, d = 6 + hash(i + 3) * 14; r.position.set(Math.cos(a) * d, 0, Math.sin(a) * d); r.castShadow = r.receiveShadow = true; scene.add(r);
    }
  }

  const resize = (w, h, pr) => { renderer.setPixelRatio(pr); renderer.setSize(w, h, false); composer.setPixelRatio(pr); composer.setSize(w, h); camera.aspect = w / h; camera.updateProjectionMatrix(); };
  const SUN = new V3(-0.4, 0.85, 0.35).normalize();
  const proj = new V3();
  const project = (x, y, z) => { proj.set(x, y, z).project(camera); if (proj.z > 1) return null; return [(proj.x * 0.5 + 0.5) * 1080, (-proj.y * 0.5 + 0.5) * 1920]; };

  function kare(D, cam) {
    // drone pozu
    drone.kok.position.set(D.x || 0, D.y || 0, D.z || 0);
    drone.kok.rotation.set(D.egim || 0, D.yaw || 0, 0);
    poz(drone, {t: D.t, hiz: D.pervane ?? 1, patla: D.patla || 0});
    if (mod === 'tarim') {
      const o = drone.ozel;
      const ilk = o.tank.userData.ilk || o.tank.position;
      o.sivi.scale.y = Math.max(0.02, D.tankOran); o.sivi.position.set(o.tank.position.x, o.tank.position.y - 0.18 * (1 - D.tankOran), o.tank.position.z);
      ek.iz.scale.set(D.serit, Math.max(0.01, D.izBoy), 1); ek.iz.position.set(D.x || 0, 0.26, (D.z || 0) + D.izBoy / 2 + 0.6);
      const A = ek.sis.geometry.attributes.position.array;
      for (let i = 0; i < ek.NP; i++) {
        const n = o.nozullar[i % 2], p = n.getWorldPosition(new V3());
        const f = (D.t * 1.3 + hash(i) ) % 1, yay = D.serit / 2;
        const ac = (hash(i * 3.1) - 0.5) * 2;
        A[i * 3] = p.x + ac * yay * f * (i % 2 ? 1 : -1) * 0.5 + (i % 2 ? 0.6 : -0.6) * f * yay * 0.5;
        A[i * 3 + 1] = Math.max(0.05, p.y - f * (p.y - 0.1));
        A[i * 3 + 2] = p.z + f * 1.2 + (hash(i * 7.7) - 0.5) * 0.6;
      }
      ek.sis.geometry.attributes.position.needsUpdate = true; ek.sis.material.opacity = 0.85 * D.sprey;
    }
    if (mod === 'ges') {
      ek.tm.material.uniforms.uA.value = D.termal; ek.tm.visible = D.termal > 0.01;
      ek.sicak.material.opacity = D.termal * D.sicak * (0.85 + 0.15 * Math.sin(D.t * 7));
      ek.halka.material.opacity = D.termal * D.sicak * 0.9; ek.halka.scale.setScalar(1 + 0.25 * Math.sin(D.t * 4));
      ek.isaret.position.set(D.x || 0, (D.y || 0) + 1.2, D.z || 0); ek.isaret.material.opacity = D.isaret || 0;
      const g = gesGsd(D.h || 30), s = D.olcekIz || 1;
      ek.izCerceve.scale.set(g.izW * s, g.izH * s, 1); ek.izCerceve.position.set(D.x || 0, 2.2, D.z || 0); ek.izCerceve.material.opacity = D.iz; ek.izY.scale.set(g.izW * s, g.izH * s, 1); ek.izY.position.set(D.x || 0, 2.25, D.z || 0); ek.izY.material.opacity = D.iz * 0.28;
      const yuk = (D.y || 0) - 2.2; ek.koni.scale.set(g.izW * s * 0.7071, yuk, g.izH * s * 0.7071); ek.koni.position.set(D.x || 0, 2.2 + yuk / 2, D.z || 0); ek.koni.rotation.x = Math.PI; ek.koni.material.opacity = D.iz * 0.2;
    }
    if (mod === 'kargo') {
      const o = drone.ozel, L = D.halat;
      o.halat.scale.y = Math.max(0.01, L + 0.05); o.halat.position.set(0, 0.3 - (L + 0.05) / 2, 0);
      o.kutu.position.set(0, D.birak ? -(D.y || 0) + 0.38 : Math.max(0.3 - L, -(D.y || 0) + 0.38), 0);
      if (D.patla > 0.01) { o.kutu.position.copy(o.kutu.userData.ilk || new V3(0, 0.1, 0)).addScaledVector(new V3(0, -0.2, 0), D.patla * 1.6); }
      o.parasut.visible = true;
    }
    // kamera: hedef + yörünge açıları
    const t0 = new V3(cam.tx, cam.ty, cam.tz);
    camera.position.set(t0.x + Math.cos(cam.el) * Math.sin(cam.az) * cam.d, t0.y + Math.sin(cam.el) * cam.d, t0.z + Math.cos(cam.el) * Math.cos(cam.az) * cam.d);
    camera.lookAt(t0);
    sun.position.copy(t0).addScaledVector(SUN, 30); sun.target.position.copy(t0);
    composer.render();
  }
  return {renderer, scene, camera, drone, kare, resize, project, sicakPos: ek.sicakPos};
}
