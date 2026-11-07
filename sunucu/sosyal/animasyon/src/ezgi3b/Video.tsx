// Ezgi ve Dedesi (3B) — Bölüm 1: "Dedemin Gizli Hayatı". Sahne klipleri yapay zekâ ile üretildi
// (Topview: Nano Banana Pro ana kare + Seedance 2.5 hareket). Sesler ElevenLabs ses tasarımı (Ezgi, Dede; kimse klonlanmadı),
// müzik Topview Music. Karışım ffmpeg ile ayrı yapılır.
import React from 'react';
import {AbsoluteFill, Composition, Easing, interpolate, OffthreadVideo, Sequence, staticFile, useCurrentFrame} from 'remotion';
import {loadFont} from '@remotion/fonts';
import veri from '../../public/ezgi3b/kelimeler.json';

const YAZI = 'Inter';
loadFont({family: YAZI, url: staticFile('fonts/inter-latin-900-normal.woff2'), weight: '900', unicodeRange: 'U+0000-00FF'});
loadFont({family: YAZI, url: staticFile('fonts/inter-latin-ext-900-normal.woff2'), weight: '900', unicodeRange: 'U+0100-024F, U+1E00-1EFF'});

type Kelime = {w: string; s: number; e: number; c: number; k: string};
const K = (veri as Kelime[]).filter((k) => k.w);
const FPS = 30;
const SES_SON = 47.9;
const SON = SES_SON + 3.2;

// [başlangıç, bitiş, klip, klip süresi, geçiş (0 = kesme)]
const SAHNE: [number, number, string, number, number][] = [
  [0, 4.7, 's1.mp4', 5.05, 0],
  [4.7, 15.2, 's2.mp4', 10, 0],
  [15.2, 22.1, 's3.mp4', 7, 0],
  [22.1, 26.4, 's4.mp4', 5, 0],
  [26.4, 32.0, 's5.mp4', 6, 0],
  [32.0, 35.6, 's6.mp4', 4, 0],
  [35.6, 39.5, 's7.mp4', 4, 0.6],
  [39.5, SON, 's8.mp4', 9, 0.8],
];

const Klip: React.FC<{dosya: string; klip: number; sure: number; gecis: number}> = ({dosya, klip, sure, gecis}) => {
  const t = useCurrentFrame() / FPS;
  const hiz = Math.min(1, klip / Math.min(sure, klip + 0.6));
  const op = gecis ? interpolate(t, [0, gecis], [0, 1], {extrapolateRight: 'clamp'}) : 1;
  const z = interpolate(t, [0, sure], [1.0, 1.04]);
  // klip bitince son kareyi dondur
  const dur = t * hiz >= klip - 0.05;
  return (
    <AbsoluteFill style={{opacity: op}}>
      {!dur ? <OffthreadVideo src={staticFile(`ezgi3b/${dosya}`)} muted playbackRate={hiz}
        style={{width: '100%', height: '100%', objectFit: 'cover', transform: `scale(${z})`}} />
        : <OffthreadVideo src={staticFile(`ezgi3b/${dosya}`)} muted startFrom={Math.floor((klip - 0.1) * FPS)} playbackRate={0.0001}
        style={{width: '100%', height: '100%', objectFit: 'cover', transform: `scale(${z})`}} />}
    </AbsoluteFill>
  );
};

const Altyazi: React.FC<{t: number}> = ({t}) => {
  const satirlar = [...new Set(K.map((k) => k.c))];
  const c = satirlar.find((x) => {
    const l = K.filter((k) => k.c === x);
    return t >= l[0].s - 0.08 && t <= l[l.length - 1].e + 0.35;
  });
  if (c === undefined) return null;
  const l = K.filter((k) => k.c === c);
  const kim = l[0].k;
  const ic = kim === 'I';
  return (
    <div style={{position: 'absolute', left: 60, right: 60, bottom: 330, textAlign: 'center'}}>
      {kim === 'D' && <div style={{fontFamily: YAZI, fontWeight: 900, fontSize: 30, color: '#ffd84a', letterSpacing: 3, marginBottom: 6,
        textShadow: '0 2px 8px #000'}}>DEDE</div>}
      <div style={{fontFamily: YAZI, fontWeight: 900, fontSize: ic ? 60 : 68, lineHeight: 1.15, fontStyle: ic ? 'italic' : 'normal'}}>
        {l.map((k, i) => (
          <span key={i} style={{color: t >= k.s - 0.04 ? (ic ? '#ffe9a8' : '#ffffff') : 'rgba(255,255,255,.35)',
            WebkitTextStroke: '10px rgba(0,0,0,.85)', paintOrder: 'stroke fill'}}>{k.w.replace(/"/g, '"')} </span>
        ))}
      </div>
    </div>
  );
};

const UcSaat: React.FC<{t: number}> = ({t}) => {
  const g = interpolate(t, [3.0, 3.4, 4.4, 4.7], [0, 1, 1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  if (g <= 0) return null;
  return (
    <AbsoluteFill style={{background: `rgba(0,0,0,${0.55 * g})`, alignItems: 'center', justifyContent: 'center'}}>
      <div style={{fontFamily: YAZI, fontWeight: 900, fontSize: 96, color: '#fff', opacity: g, letterSpacing: 2,
        transform: `scale(${0.92 + 0.08 * g})`}}>3 saat önce…</div>
    </AbsoluteFill>
  );
};

const Kapanis: React.FC<{t: number}> = ({t}) => {
  const g = interpolate(t, [SES_SON, SES_SON + 0.6], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic)});
  if (g <= 0) return null;
  return (
    <AbsoluteFill style={{background: `rgba(10,6,2,${0.6 * g})`, alignItems: 'center', justifyContent: 'center', textAlign: 'center'}}>
      <div style={{opacity: g, transform: `translateY(${(1 - g) * 30}px)`}}>
        <div style={{fontFamily: YAZI, fontWeight: 900, fontSize: 44, color: '#ffd84a', letterSpacing: 4}}>EZGİ VE DEDESİ</div>
        <div style={{fontFamily: YAZI, fontWeight: 900, fontSize: 84, color: '#fff', marginTop: 18, lineHeight: 1.05}}>Bölüm 2:<br />Reis'in Borcu</div>
        <div style={{fontFamily: YAZI, fontWeight: 900, fontSize: 40, color: '#fff', marginTop: 40, opacity: 0.85}}>Devamı için takip et</div>
      </div>
    </AbsoluteFill>
  );
};

const Video: React.FC = () => {
  const t = useCurrentFrame() / FPS;
  const acilis = interpolate(t, [0, 0.35], [1, 0], {extrapolateRight: 'clamp'});
  const kapat = interpolate(t, [SON - 0.5, SON], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  return (
    <AbsoluteFill style={{background: '#000'}}>
      {SAHNE.map(([bas, son, dosya, klip, gecis], i) => (
        <Sequence key={i} from={Math.round((bas - gecis) * FPS)} durationInFrames={Math.round((son - bas + gecis) * FPS) + 1}>
          <Klip dosya={dosya} klip={klip} sure={son - bas + gecis} gecis={gecis} />
        </Sequence>
      ))}
      {/* sinematik bantlar ve hafif vinyet */}
      <AbsoluteFill style={{background: 'radial-gradient(ellipse 85% 70% at 50% 45%, transparent 60%, rgba(0,0,0,.45) 100%)'}} />
      <AbsoluteFill style={{background: 'linear-gradient(180deg, rgba(0,0,0,.35) 0%, transparent 12%, transparent 70%, rgba(0,0,0,.55) 100%)'}} />
      <UcSaat t={t} />
      <Altyazi t={t} />
      <Kapanis t={t} />
      <div style={{position: 'absolute', top: 54, left: 0, right: 0, textAlign: 'center', fontFamily: YAZI, fontWeight: 900, fontSize: 24,
        color: 'rgba(255,255,255,.75)', letterSpacing: 1}}>Temsili animasyon (yapay zekâ)</div>
      <div style={{position: 'absolute', bottom: 64, left: 0, right: 0, textAlign: 'center', fontFamily: YAZI, fontWeight: 900, fontSize: 26,
        color: 'rgba(255,255,255,.7)', letterSpacing: 4}}>ANTİK STÜDYO</div>
      <AbsoluteFill style={{background: '#000', opacity: Math.max(acilis, kapat)}} />
    </AbsoluteFill>
  );
};

export const Root: React.FC = () => (
  <Composition id="Ezgi3B" component={Video} durationInFrames={Math.ceil(SON * FPS)} fps={FPS} width={1080} height={1920} />
);
