// "Tabloya Sorduk": biz soruyoruz, tablodaki karakter komik cevap veriyor.
// Tablo: telifi düşmüş eser (Wikimedia Commons). Görsel üretim modeli yok; hareket kodla (yakınlaşma + çene).
// Ses: soru Uğur, cevap Ses D (ElevenLabs, sunucuda). Müzik kodla üretildi (muzik/tablo_sor.py), karışım ffmpeg ile.
import React from 'react';
import {AbsoluteFill, Composition, Easing, Img, interpolate, staticFile, useCurrentFrame} from 'remotion';
import {loadFont} from '@remotion/fonts';
import veri from '../../public/tablo_sor/kelimeler.json';

const YAZI = 'Inter';
loadFont({family: YAZI, url: staticFile('fonts/inter-latin-900-normal.woff2'), weight: '900', unicodeRange: 'U+0000-00FF'});
loadFont({family: YAZI, url: staticFile('fonts/inter-latin-ext-900-normal.woff2'), weight: '900', unicodeRange: 'U+0100-024F, U+1E00-1EFF'});

type Kelime = {w: string; s: number; e: number; c: number; k: 'S' | 'C'};
const K = veri as Kelime[];
const FPS = 30;
const SON = K[K.length - 1].e + 1.4;

// Tablo bilgisi (görsel piksel koordinatları)
const TABLO = {dosya: 'tablo_sor/mona_lisa.jpg', g: 1280, y: 1908, yuz: {x: 600, y: 500}, cene: {x: 470, y: 584, g: 250, y2: 150},
  ad: 'MONA LISA', alt: 'Leonardo da Vinci • 1503–1519 • Louvre'};

type Satir = {c: number; k: 'S' | 'C'; bas: number; son: number; kelimeler: Kelime[]};
const SATIRLAR: Satir[] = [];
for (const k of K) {
  let s = SATIRLAR.find((x) => x.c === k.c);
  if (!s) { s = {c: k.c, k: k.k, bas: k.s, son: k.e, kelimeler: []}; SATIRLAR.push(s); }
  s.son = k.e; s.kelimeler.push(k);
}
const satirAn = (t: number) => SATIRLAR.filter((s) => s.bas - 0.15 <= t).pop();

// kamera: soru → tablonun tamamı, cevap → yüze yakın
const TAM = 1080 / TABLO.g;
const kameraDurum = (s?: Satir) => {
  if (!s || s.k === 'S') return {z: TAM * 1.0, fx: TABLO.g / 2, fy: TABLO.y / 2 - 60, ex: 540, ey: 1000};
  return {z: TAM * 2.0, fx: TABLO.yuz.x, fy: TABLO.yuz.y, ex: 540, ey: 760};
};
const kamera = (t: number) => {
  const s = satirAn(t);
  const i = s ? SATIRLAR.indexOf(s) : -1;
  const once = kameraDurum(i > 0 ? SATIRLAR[i - 1] : undefined);
  const simdi = kameraDurum(s);
  const g = s ? interpolate(t, [s.bas - 0.15, s.bas + 0.55], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.inOut(Easing.cubic)}) : 1;
  const m = (a: number, b: number) => a + (b - a) * g;
  const nefes = 1 + 0.012 * Math.sin(t * 0.9);
  return {z: m(once.z, simdi.z) * nefes, fx: m(once.fx, simdi.fx), fy: m(once.fy, simdi.fy), ex: m(once.ex, simdi.ex), ey: m(once.ey, simdi.ey)};
};

// çene: cevap kelimesi okunurken açılıp kapanır
const ceneAcik = (t: number) => {
  const k = K.find((x) => x.k === 'C' && t >= x.s && t <= x.e + 0.03);
  if (!k) return 0;
  const hece = Math.max(1, Math.round(k.w.replace(/[^a-zçğıöşüâîû]/gi, '').length / 2.6));
  const f = hece / Math.max(0.12, k.e - k.s);
  return 0.5 - 0.5 * Math.cos((t - k.s) * f * Math.PI * 2);
};

const Tablo: React.FC<{t: number}> = ({t}) => {
  const c = kamera(t);
  const a = ceneAcik(t);
  const C = TABLO.cene;
  return (
    <div style={{position: 'absolute', left: 0, top: 0, width: TABLO.g, height: TABLO.y, transformOrigin: '0 0',
      transform: `translate(${c.ex - c.fx * c.z}px, ${c.ey - c.fy * c.z}px) scale(${c.z})`}}>
      <Img src={staticFile(TABLO.dosya)} style={{width: TABLO.g, height: TABLO.y, display: 'block', boxShadow: '0 30px 80px rgba(0,0,0,.6)'}} />
      {/* alt çene ve dudak: konuşurken birkaç piksel aşağı iner */}
      <div style={{position: 'absolute', left: C.x, top: C.y, width: C.g, height: C.y2,
        backgroundImage: `url(${staticFile(TABLO.dosya)})`, backgroundSize: `${TABLO.g}px ${TABLO.y}px`, backgroundPosition: `-${C.x}px -${C.y}px`,
        transform: `translateY(${a * 7}px) scaleY(${1 + a * 0.03})`, transformOrigin: '50% 0%',
        WebkitMaskImage: 'radial-gradient(ellipse 46% 44% at 50% 40%, #000 55%, transparent 100%)',
        maskImage: 'radial-gradient(ellipse 46% 44% at 50% 40%, #000 55%, transparent 100%)'}} />
      {/* ağız içi gölgesi */}
      <div style={{position: 'absolute', left: 528, top: 586, width: 84, height: 10 * a + 0.01, borderRadius: '50%',
        background: 'rgba(40,18,8,.55)', filter: 'blur(2px)', opacity: a > 0.05 ? 1 : 0}} />
    </div>
  );
};

const Soru: React.FC<{t: number}> = ({t}) => {
  const s = satirAn(t);
  const soru = s && s.k === 'S' ? s : SATIRLAR.filter((x) => x.k === 'S' && x.bas - 0.15 <= t).pop();
  if (!soru) return null;
  const i = SATIRLAR.indexOf(soru);
  const sonraki = SATIRLAR[i + 1];
  const bitis = sonraki ? (SATIRLAR.slice(i + 1).find((x) => x.k === 'S')?.bas ?? SON + 1) - 0.2 : SON + 1;
  const gir = interpolate(t, [soru.bas - 0.15, soru.bas + 0.2], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.back(1.6))});
  const cik = interpolate(t, [bitis - 0.2, bitis], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const kucuk = s && s.k === 'C' ? 0.82 : 1;
  return (
    <div style={{position: 'absolute', left: 50, right: 50, top: 150, opacity: Math.min(gir, cik),
      transform: `translateY(${(1 - gir) * -40}px) scale(${kucuk})`, transformOrigin: '50% 0%'}}>
      <div style={{display: 'inline-block', background: '#ffd84a', color: '#1b1208', fontFamily: YAZI, fontWeight: 900, fontSize: 34,
        padding: '6px 18px', borderRadius: 10, letterSpacing: 3}}>SORU</div>
      <div style={{marginTop: 12, background: 'rgba(15,10,6,.82)', color: '#fff', fontFamily: YAZI, fontWeight: 900, fontSize: 54,
        lineHeight: 1.15, padding: '22px 28px', borderRadius: 22, border: '3px solid #ffd84a'}}>
        {soru.kelimeler.map((k, j) => <span key={j} style={{opacity: t >= k.s - 0.05 ? 1 : 0.35}}>{k.w} </span>)}
      </div>
    </div>
  );
};

const Cevap: React.FC<{t: number}> = ({t}) => {
  const s = satirAn(t);
  if (!s || s.k !== 'C') return null;
  const gir = interpolate(t, [s.bas - 0.1, s.bas + 0.25], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.back(1.8))});
  return (
    <div style={{position: 'absolute', left: 60, right: 60, top: 1300, transform: `scale(${gir})`, transformOrigin: '50% 0%'}}>
      <svg width={80} height={50} style={{position: 'absolute', left: 430, top: -44}}><path d="M10 50 L40 0 L70 50 Z" fill="#fffaf0" /></svg>
      <div style={{background: '#fffaf0', color: '#1b1208', fontFamily: YAZI, fontWeight: 900, fontSize: 56, lineHeight: 1.18,
        padding: '26px 30px', borderRadius: 30, boxShadow: '0 16px 50px rgba(0,0,0,.5)', textAlign: 'center'}}>
        {s.kelimeler.map((k, j) => (
          <span key={j} style={{opacity: t >= k.s - 0.04 ? 1 : 0.22, color: t >= k.s - 0.04 && t <= k.e + 0.05 ? '#c0392b' : '#1b1208'}}>{k.w} </span>
        ))}
      </div>
    </div>
  );
};

const Video: React.FC = () => {
  const t = useCurrentFrame() / FPS;
  const acilis = interpolate(t, [0, 0.4], [1, 0], {extrapolateRight: 'clamp'});
  const kapanis = interpolate(t, [SON - 0.6, SON], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  return (
    <AbsoluteFill style={{background: '#120c08', overflow: 'hidden'}}>
      <Img src={staticFile(TABLO.dosya)} style={{position: 'absolute', width: '140%', left: '-20%', top: '-10%', filter: 'blur(40px) brightness(.35)'}} />
      <Tablo t={t} />
      <AbsoluteFill style={{background: 'radial-gradient(ellipse 80% 60% at 50% 45%, transparent 55%, rgba(0,0,0,.6) 100%)'}} />
      <div style={{position: 'absolute', top: 60, left: 0, right: 0, textAlign: 'center', fontFamily: YAZI, fontWeight: 900, fontSize: 38,
        color: '#ffd84a', letterSpacing: 2, textShadow: '0 3px 10px rgba(0,0,0,.8)'}}>TABLOYA SORDUK • {TABLO.ad}</div>
      <Soru t={t} />
      <Cevap t={t} />
      <div style={{position: 'absolute', bottom: 120, left: 0, right: 0, textAlign: 'center', fontFamily: YAZI, fontWeight: 900, fontSize: 26,
        color: 'rgba(255,248,230,.8)', textShadow: '0 2px 6px #000'}}>{TABLO.alt}</div>
      <div style={{position: 'absolute', bottom: 70, left: 0, right: 0, textAlign: 'center', fontFamily: YAZI, fontWeight: 900, fontSize: 24,
        color: 'rgba(255,248,230,.6)', letterSpacing: 3}}>ANTİK STÜDYO • Seslendirme: yapay zekâ</div>
      <AbsoluteFill style={{background: '#000', opacity: Math.max(acilis, kapanis)}} />
    </AbsoluteFill>
  );
};

export const Root: React.FC = () => (
  <Composition id="TabloSor" component={Video} durationInFrames={Math.ceil(SON * FPS)} fps={FPS} width={1080} height={1920} />
);
