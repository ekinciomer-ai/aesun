// GES kurulum filmi — Walking Block altyapısı (post.js sis/DOF/bloom/grade) + kodla GES sahası + Polyfork modelleri.
// Her kare yalnız zamanın fonksiyonudur: renderAt(t). Rastgelelik sabit tohumla.
import * as THREE from 'three';
import { LOOK, SKY_GLSL } from '../look.js';
import { createPost } from '../post.js';
import * as TEX from '../textures.js';
import { applyWeather } from '../materials.js';
import * as BGU from 'three/addons/utils/BufferGeometryUtils.js';
import { evalShot, DURATION, TIMELINE } from './shots.js';
import { gunIsigi } from './zaman.js';

const Q = new URLSearchParams(location.search);
const FIXED_W = +Q.get('w') || 0, FIXED_H = +Q.get('h') || 0;
const MODS = (Q.get('mods') || 'saha,makine,polyfork').split(',').filter(Boolean);
const STIL = Q.get('stil') || 'lowpoly';
const STABIL = !Q.has('canli');   // varsayılan: gren/sis deseni sabit (titreme yok)   // lowpoly (Stil 1) | gercek (Stil 2)
const state = { t: +Q.get('t') || 0, shot: Q.get('shot') || '', playing: !Q.has('still') && !FIXED_W, frame: 0 };

// --- görünüm: şafak öncesi mavi → gün doğumu (değerler zaman.js'de lerp edilir) ---
Object.assign(LOOK, {
  fogDensity: 0.0016, mistDensity: 0.03, mistHeight: 2.2, mistNoise: 1.0,
  hemiIntensity: 1.6, envIntensity: 0.9, ao: 0.7, aoRadius: 1.2,
  bloom: 0.55, bloomThreshold: 0.9, saturation: 1.08, contrast: 1.08, vignette: 0.28, grain: 0.02, chroma: 0.0004,
});
if (STIL === 'gercek') Object.assign(LOOK, {
  fogDensity: 0.0012, mistDensity: 0.024, ao: 0.9, aoRadius: 1.5, bloom: 0.42, saturation: 0.97, contrast: 1.13, grain: 0.008, vignette: 0.32, chroma: 0.0006,
});

const canvas = document.getElementById('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance', preserveDrawingBuffer: true });
renderer.setPixelRatio(1);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.NoToneMapping;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.info.autoReset = false;

// dikey (9:16) varsayılan
let W = FIXED_W || Math.min(window.innerWidth, Math.round(window.innerHeight * 9 / 16));
let H = FIXED_H || Math.round(W * 16 / 9);
renderer.setSize(W, H, false);
canvas.style.width = W + 'px'; canvas.style.height = H + 'px';

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(55, W / H, 0.3, 3000);
const post = createPost(renderer, W, H);

// gökyüzü yansıma haritası (paneller ve araçlar için). Gün doğumu rengiyle bir kez üretilir.
gunIsigi(13.5, LOOK);
{
  const skyScene = new THREE.Scene();
  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    uniforms: { uZenith: { value: LOOK.zenith.clone() }, uHorizon: { value: LOOK.horizon.clone() }, uSkyGlowDir: { value: LOOK.skyGlowDir.clone() }, uSkyGlow: { value: LOOK.skyGlow } },
    vertexShader: `varying vec3 vD; void main(){ vD = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: `varying vec3 vD; ${SKY_GLSL}
      void main(){ vec3 d = normalize(vD); vec3 c = skyColor(d);
        c = mix(c, vec3(0.05,0.045,0.04), smoothstep(0.02, -0.15, d.y));
        gl_FragColor = vec4(c * 1.4, 1.0); }`,
  });
  skyScene.add(new THREE.Mesh(new THREE.SphereGeometry(50, 32, 16), skyMat));
  const pm = new THREE.PMREMGenerator(renderer);
  scene.environment = pm.fromScene(skyScene, 0.02).texture;
  pm.dispose();
}
gunIsigi(0, LOOK);

const hemi = new THREE.HemisphereLight(LOOK.hemiSky, LOOK.hemiGround, LOOK.hemiIntensity);
scene.add(hemi);
const key = new THREE.DirectionalLight(LOOK.keyColor, LOOK.keyIntensity);
key.castShadow = true;
key.shadow.mapSize.set(4096, 4096);
Object.assign(key.shadow.camera, { left: -75, right: 75, top: 75, bottom: -75, near: 10, far: 400 });
key.shadow.bias = -0.0004; key.shadow.normalBias = 0.06; key.shadow.radius = 4;
scene.add(key, key.target);
const SAHA_MERKEZ = new THREE.Vector3(32, 0, 18);

const ctx = { THREE, scene, LOOK, TEX, renderer, camera, post, Q, rng: TEX.mulberry32, SAHA_MERKEZ, STIL, applyWeather, BGU };
const modules = [], errors = [], buildMs = {};
async function loadModules() {
  for (const name of MODS) {
    try {
      const t0 = performance.now();
      const m = await import(`./mods/${name}.js`);
      modules.push({ name, inst: await m.create(ctx) });
      buildMs[name] = Math.round(performance.now() - t0);
    } catch (e) { console.error(`[modül ${name}]`, e); errors.push(`${name}: ${e && e.stack ? e.stack : e}`); }
  }
}

const frameInfo = { t: 0, dt: 1 / 30, camera, shot: null, frame: 0, glow: [] };
function renderAt(t, opts = {}) {
  state.t = t;
  renderer.info.reset();
  const frame = Math.round((opts.frameT ?? t) * 30);
  gunIsigi(t, LOOK);
  hemi.color.copy(LOOK.hemiSky); hemi.groundColor.copy(LOOK.hemiGround); hemi.intensity = LOOK.hemiIntensity;
  key.color.copy(LOOK.keyColor); key.intensity = LOOK.keyIntensity;
  key.target.position.copy(SAHA_MERKEZ);
  key.position.copy(SAHA_MERKEZ).addScaledVector(LOOK.keyDir, 200);
  key.target.updateMatrixWorld();

  const shot = evalShot(state.shot, t);
  camera.position.set(shot.pos[0], Math.max(0.2, shot.pos[1]), shot.pos[2]);
  const hd = Math.hypot(shot.tgt[0] - shot.pos[0], shot.tgt[1] - shot.pos[1], shot.tgt[2] - shot.pos[2]) * 0.0018 * (shot.handheld ?? 0);
  const hx = (Math.sin(t * 0.83 + 1.3) + 0.5 * Math.sin(t * 2.17 + 0.4)) * hd;
  const hy = (Math.sin(t * 1.07 + 2.9) + 0.5 * Math.sin(t * 2.63 + 1.7)) * hd * 0.7;
  camera.up.set(0, 1, 0);
  camera.lookAt(shot.tgt[0] + hx, shot.tgt[1] + hy, shot.tgt[2] + hx * 0.6);
  camera.fov = shot.fov; camera.near = shot.near;
  if (opts.accum && opts.accum.n > 1) {
    const i = opts.accum.i + 1;
    const hal = (b) => { let f = 1, r = 0, k = i; while (k > 0) { f /= b; r += f * (k % b); k = Math.floor(k / b); } return r; };
    camera.setViewOffset(W, H, hal(2) - 0.5, hal(3) - 0.5, W, H);
  } else if (camera.view) camera.clearViewOffset();
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld(true);

  frameInfo.t = t; frameInfo.frame = frame; frameInfo.shot = shot; frameInfo.dt = opts.dt ?? 1 / 30; frameInfo.glow.length = 0;
  for (const m of modules) {
    try { m.inst && m.inst.update && m.inst.update(t, frameInfo); }
    catch (e) { if (!m.err) { m.err = true; console.error(`[update ${m.name}]`, e); errors.push(`${m.name}.update: ${e.stack || e}`); } }
  }
  // modüllerin istediği sıcak hâleler (inverter ışıkları vb.) — en çok 10
  const gn = Math.min(10, frameInfo.glow.length);
  for (let i = 0; i < gn; i++) { const g = frameInfo.glow[i]; post.glowPos[i].set(g[0], g[1], g[2], g[3]); post.glowCol[i].setRGB(g[4], g[5], g[6]); }
  post.render(scene, camera, { t, frame: STABIL ? 0 : frame, dof: shot.dof, glowN: gn, fade: opts.fade ?? shot.post.fade ?? 1, exposureMul: shot.post.exposureMul, fogMul: shot.post.fogMul, mistMul: shot.post.mistMul, accum: opts.accum });
  state.frame++;
}

function renderBlur(t, n = 4, shutter = 1 / 60) {
  let lo = -1e9, hi = 1e9;
  if (!state.shot) for (const s of TIMELINE) if (t >= s.start && t < s.end) { lo = s.start; hi = s.end - 1e-4; }
  for (let i = 0; i < n; i++) renderAt(Math.min(hi, Math.max(lo, t + shutter * (i + 0.5) / n)), { accum: { i, n }, frameT: t });
  state.t = t;
}

const ready = (async () => { await loadModules(); renderAt(state.t); return { errors }; })();
window.__app = {
  ready, renderAt, renderBlur, state, scene, camera, renderer, errors, LOOK, post, modules,
  setShot(name) { state.shot = name; },
  info() { return { W, H, calls: renderer.info.render.calls, tris: renderer.info.render.triangles, errors, buildMs }; },
};

if (!FIXED_W) {
  let last = performance.now();
  const hud = document.getElementById('hud');
  ready.then(() => {
    function loop(now) {
      const dt = Math.min(0.1, (now - last) / 1000); last = now;
      if (state.playing) state.t += dt;
      if (!state.shot && state.t > DURATION) state.t = 0;
      renderAt(state.t);
      if (hud) hud.textContent = `t=${state.t.toFixed(2)} ${(1 / dt).toFixed(0)}fps ${errors.length ? 'HATA ' + errors[0].slice(0, 200) : ''}`;
      requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);
  });
  window.addEventListener('keydown', (e) => {
    if (e.code === 'Space') state.playing = !state.playing;
    if (e.code === 'ArrowRight') state.t += 1;
    if (e.code === 'ArrowLeft') state.t = Math.max(0, state.t - 1);
  });
}
