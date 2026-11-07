// Ünlü tablo yorumu, soru-cevap ve mizah: soru ekrana gelir, kamera ayrıntıya dalar, anlatıcı esprili ve doğru cevap verir.
// Tablo telifi düşmüş eser (Wikimedia Commons); görsel üretim modeli yok. Ses: Uğur (sunucuda). Müzik kodla.
import React from 'react';
import {AbsoluteFill, Composition, Easing, Img, interpolate, staticFile, useCurrentFrame} from 'remotion';
import {loadFont} from '@remotion/fonts';
import veri from '../../public/tablo_yorum/kelimeler.json';

const YAZI = 'Inter';
loadFont({family: YAZI, url: staticFile('fonts/inter-latin-900-normal.woff2'), weight: '900', unicodeRange: 'U+0000-00FF'});
loadFont({family: YAZI, url: staticFile('fonts/inter-latin-ext-900-normal.woff2'), weight: '900', unicodeRange: 'U+0100-024F, U+1E00-1EFF'});

type Kelime = {w: string; s: number; e: number; c: number; k: string};
const K = veri as Kelime[];
const FPS = 30;
const SON = K[K.length - 1].e + 1.2;
const SARI = '#ffd84a';

const TABLO = {dosya: 'tablo_yorum/arnolfini.jpg', g: 1280, y: 1751, baslik: 'ARNOLFİNİ PORTRESİ • JAN VAN EYCK, 1434',
  alt: 'National Gallery, Londra'};
// her soru için ayrıntı: merkez (görsel pikseli), yakınlık, işaret halkası yarıçapları
const AYRINTI = [
  {x: 370, y: 380, z: 2.9, rx: 120, ry: 140},   // adamın yüzü
  {x: 900, y: 660, z: 2.3, rx: 170, ry: 150},   // kadının karnı
  {x: 540, y: 122, z: 4.2, rx: 38, ry: 48},     // tek yanan mum
  {x: 612, y: 388, z: 4.0, rx: 115, ry: 40},    // duvardaki imza
  {x: 648, y: 526, z: 4.6, rx: 72, ry: 72},     // dışbükey ayna
];
const TAM = {x: 640, y: 875, z: 1080 / 1280};
const EKRAN = {x: 540, y: 960};

type Satir = {c: number; k: string; bas: number; son: number; kelimeler: Kelime[]; soruNo: number};
const SATIRLAR: Satir[] = [];
let no = -1;
for (const k of K) {
  let s = SATIRLAR.find((x) => x.c === k.c);
  if (!s) { if (k.k === 'S') no++; s = {c: k.c, k: k.k, bas: k.s, son: k.e, kelimeler: [], soruNo: no}; SATIRLAR.push(s); }
  s.son = k.e; s.kelimeler.push(k);
}
const SORU_SAYI = AYRINTI.length;
const satirAn = (t: number) => SATIRLAR.filter((s) => s.bas - 0.25 <= t).pop();
const hedef = (s?: Satir) => (!s || s.soruNo < 0 || s.soruNo >= SORU_SAYI ? TAM : AYRINTI[s.soruNo]);

const kamera = (t: number) => {
  const s = satirAn(t);
  const i = s ? SATIRLAR.indexOf(s) : -1;
  const once = hedef(i > 0 ? SATIRLAR[i - 1] : undefined);
  const simdi = hedef(s);
  const g = s ? interpolate(t, [s.bas - 0.25, s.bas + 0.45], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.inOut(Easing.cubic)}) : 1;
  // yolculukta hafif uzaklaşıp yeniden dalma (ayrıntıdan ayrıntıya geçerken)
  const dal = once !== simdi ? Math.sin(g * Math.PI) * 0.35 : 0;
  const zl = Math.exp(Math.log(once.z) + (Math.log(simdi.z) - Math.log(once.z)) * g) * (1 - dal);
  const yavas = 1 + 0.04 * interpolate(t, [s?.bas ?? 0, (s?.son ?? 0) + 0.7], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  return {z: Math.max(TAM.z, zl * yavas), x: once.x + (simdi.x - once.x) * g, y: once.y + (simdi.y - once.y) * g, g};
};

const Halka: React.FC<{t: number}> = ({t}) => {
  const s = satirAn(t);
  if (!s || s.soruNo < 0 || s.soruNo >= SORU_SAYI) return null;
  const a = AYRINTI[s.soruNo];
  const c = kamera(t);
  const gir = interpolate(t, [s.k === 'S' ? s.bas + 0.4 : s.bas - 0.3, (s.k === 'S' ? s.bas + 0.4 : s.bas - 0.3) + 0.35], [0, 1],
    {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.back(2))});
  const nabiz = 1 + 0.04 * Math.sin(t * 6);
  return (
    <svg width={1080} height={1920} style={{position: 'absolute'}}>
      <ellipse cx={EKRAN.x + (a.x - c.x) * c.z} cy={EKRAN.y + (a.y - c.y) * c.z} rx={a.rx * c.z * gir * nabiz} ry={a.ry * c.z * gir * nabiz}
        fill="none" stroke={SARI} strokeWidth={9} strokeDasharray="28 14" opacity={gir} style={{filter: 'drop-shadow(0 0 12px rgba(0,0,0,.8))'}} />
    </svg>
  );
};

const buyuk = (x: string) => x.toLocaleUpperCase('tr-TR');

const Soru: React.FC<{t: number}> = ({t}) => {
  const s = satirAn(t);
  if (!s) return null;
  const soru = s.k === 'S' ? s : SATIRLAR[SATIRLAR.indexOf(s) - 1];
  if (!soru || soru.k !== 'S') return null;
  const son = soru.soruNo >= SORU_SAYI;
  const gir = interpolate(t, [soru.bas - 0.2, soru.bas + 0.15], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.back(1.7))});
  const kucul = s.k === 'S' ? 1 : 0.8;
  return (
    <div style={{position: 'absolute', left: 40, right: 40, top: 150, textAlign: 'center', transform: `scale(${gir * kucul})`, transformOrigin: '50% 0%'}}>
      {!son && <div style={{display: 'inline-block', background: SARI, color: '#111', fontFamily: YAZI, fontWeight: 900, fontSize: 36,
        padding: '6px 20px', borderRadius: 8, letterSpacing: 2, marginBottom: 14}}>SORU {soru.soruNo + 1}/{SORU_SAYI}</div>}
      <div style={{fontFamily: YAZI, fontWeight: 900, fontSize: son ? 72 : 76, lineHeight: 1.08, color: '#fff',
        WebkitTextStroke: '12px #000', paintOrder: 'stroke fill', textShadow: '0 8px 24px rgba(0,0,0,.6)'}}>
        {buyuk(soru.kelimeler.map((k) => k.w).join(' '))}
      </div>
    </div>
  );
};

// cevap altyazısı: 2–3 kelimelik parçalar, büyük harf, pop
const PARCALAR: {s: number; e: number; kelimeler: Kelime[]}[] = [];
for (const st of SATIRLAR.filter((x) => x.k !== 'S')) {
  let p: Kelime[] = [];
  st.kelimeler.forEach((k, i) => {
    p.push(k);
    const uzun = p.map((x) => x.w).join(' ').length;
    if (p.length >= 3 || uzun > 15 || /[.!?,:…"]$/.test(k.w) || i === st.kelimeler.length - 1) {
      PARCALAR.push({s: p[0].s, e: p[p.length - 1].e, kelimeler: p}); p = [];
    }
  });
}
const Altyazi: React.FC<{t: number}> = ({t}) => {
  const p = PARCALAR.find((x) => t >= x.s - 0.05 && t <= x.e + 0.25);
  if (!p) return null;
  const pop = interpolate(t, [p.s - 0.05, p.s + 0.1], [0.7, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.back(3))});
  return (
    <div style={{position: 'absolute', left: 40, right: 40, top: 1440, textAlign: 'center', transform: `scale(${pop})`}}>
      {p.kelimeler.map((k, i) => (
        <span key={i} style={{fontFamily: YAZI, fontWeight: 900, fontSize: 92, lineHeight: 1.1,
          color: t >= k.s - 0.03 && t <= k.e + 0.05 ? SARI : '#fff', WebkitTextStroke: '14px #000', paintOrder: 'stroke fill'}}>{buyuk(k.w)} </span>
      ))}
    </div>
  );
};

const Video: React.FC = () => {
  const t = useCurrentFrame() / FPS;
  const c = kamera(t);
  const acilis = interpolate(t, [0, 0.3], [1, 0], {extrapolateRight: 'clamp'});
  const kapanis = interpolate(t, [SON - 0.5, SON], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  return (
    <AbsoluteFill style={{background: '#0d0a07', overflow: 'hidden'}}>
      <Img src={staticFile(TABLO.dosya)} style={{position: 'absolute', width: '150%', left: '-25%', top: '-5%', filter: 'blur(45px) brightness(.32)'}} />
      <div style={{position: 'absolute', left: 0, top: 0, width: TABLO.g, height: TABLO.y, transformOrigin: '0 0',
        transform: `translate(${EKRAN.x - c.x * c.z}px, ${EKRAN.y - c.y * c.z}px) scale(${c.z})`}}>
        <Img src={staticFile(TABLO.dosya)} style={{width: TABLO.g, height: TABLO.y, display: 'block'}} />
      </div>
      <Halka t={t} />
      <AbsoluteFill style={{background: 'radial-gradient(ellipse 75% 55% at 50% 50%, transparent 50%, rgba(0,0,0,.65) 100%)'}} />
      <div style={{position: 'absolute', top: 0, left: 0, right: 0, height: 108, background: 'rgba(0,0,0,.72)', display: 'flex',
        alignItems: 'center', justifyContent: 'center', fontFamily: YAZI, fontWeight: 900, fontSize: 36, color: SARI, letterSpacing: 1.5}}>{TABLO.baslik}</div>
      <Soru t={t} />
      <Altyazi t={t} />
      <div style={{position: 'absolute', bottom: 64, left: 0, right: 0, textAlign: 'center', fontFamily: YAZI, fontWeight: 900, fontSize: 26,
        color: 'rgba(255,248,230,.7)', letterSpacing: 2}}>ANTİK STÜDYO • {TABLO.alt}</div>
      <AbsoluteFill style={{background: '#000', opacity: Math.max(acilis, kapanis)}} />
    </AbsoluteFill>
  );
};

export const Root: React.FC = () => (
  <Composition id="TabloYorum" component={Video} durationInFrames={Math.ceil(SON * FPS)} fps={FPS} width={1080} height={1920} />
);
