// Pumpkin 1 – Bakkal, "Masal Bebek 3B" sürümü.
// Sahne klipleri yapay zekâ ile üretildi (Topview: Nano Banana Pro kare + Kling 3.0 Turbo hareket).
// Ses: Pumpkin anlatımı (public/bakkal/ses.mp3). Müzik ve ses karışımı render sonrası ffmpeg ile eklenir.
import React from 'react';
import {AbsoluteFill, Composition, Easing, interpolate, OffthreadVideo, Sequence, staticFile, useCurrentFrame} from 'remotion';
import {loadFont} from '@remotion/fonts';
import veri from '../../public/bakkal/kelimeler.json';

const EL = 'Patrick Hand';
loadFont({family: EL, url: staticFile('fonts/patrick-hand-latin-400-normal.woff2'), weight: '400', unicodeRange: 'U+0000-00FF'});
loadFont({family: EL, url: staticFile('fonts/patrick-hand-latin-ext-400-normal.woff2'), weight: '400', unicodeRange: 'U+0100-024F, U+1E00-1EFF'});

type Kelime = {w: string; s: number; e: number; c: number};
const K = veri as Kelime[];
const FPS = 24;
const SON = 39.52;
const GECIS = 0.35; // sahneler arası yumuşak geçiş (sn)

// [başlangıç, bitiş, dosya, klip süresi, yakınlaşma yönü]
const SAHNELER: [number, number, string, number, number][] = [
  [0, 5.7, 's1_sokak.mp4', 6, 1],
  [5.7, 9.8, 's2_oda.mp4', 4, -1],
  [9.8, 16.8, 's3_market.mp4', 7, 1],
  [16.8, 20.8, 's_merdiven.mp4', 5.04, 1],
  [20.8, 24.8, 's4_tabela.mp4', 4, 1],
  [24.8, 30.4, 's5_bakkal.mp4', 6, -1],
  [30.4, SON, 's6_donus.mp4', 9, 1],
];

const Sahne: React.FC<{bas: number; son: number; dosya: string; klip: number; yon: number; ilk: boolean}> = ({bas, son, dosya, klip, yon, ilk}) => {
  const f = useCurrentFrame();
  const t = f / FPS;
  const uzun = son - bas + GECIS;
  const hiz = Math.min(1, klip / uzun); // klip kısaysa hafifçe yavaşlat
  const op = ilk ? 1 : interpolate(t, [0, GECIS], [0, 1], {extrapolateRight: 'clamp'});
  const z = interpolate(t, [0, uzun], yon > 0 ? [1.0, 1.06] : [1.06, 1.0], {easing: Easing.inOut(Easing.quad)});
  return (
    <AbsoluteFill style={{opacity: op}}>
      <OffthreadVideo src={staticFile(`bakkal3b/${dosya}`)} muted playbackRate={hiz}
        style={{width: '100%', height: '100%', objectFit: 'cover', transform: `scale(${z})`}} />
    </AbsoluteFill>
  );
};

const Altyazi: React.FC<{t: number}> = ({t}) => {
  const aktif = K.filter((k) => k.s - 0.04 <= t).pop();
  if (!aktif || t > aktif.e + 1.2 && K.filter((k) => k.c === aktif.c).pop() === aktif) return null;
  return (
    <div style={{position: 'absolute', left: 70, right: 70, top: 1540, textAlign: 'center', fontFamily: `${EL}, sans-serif`, fontSize: 68, lineHeight: 1.2}}>
      {K.filter((k) => k.c === aktif.c).map((k, i) => (
        <span key={i} style={{color: k === aktif ? '#ffd84a' : '#fff',
          WebkitTextStroke: '8px #2b1f17', paintOrder: 'stroke fill'}}>{k.w}{' '}</span>
      ))}
    </div>
  );
};

const Video: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / FPS;
  const kapanis = interpolate(t, [SON - 0.8, SON], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const acilis = interpolate(t, [0, 0.5], [1, 0], {extrapolateRight: 'clamp'});
  return (
    <AbsoluteFill style={{background: '#1b130d'}}>
      {SAHNELER.map(([bas, son, dosya, klip, yon], i) => {
        const gir = Math.max(0, Math.round((bas - (i === 0 ? 0 : GECIS)) * FPS));
        const sure = Math.round((son + GECIS) * FPS) - gir;
        return (
          <Sequence key={i} from={gir} durationInFrames={sure}>
            <Sahne bas={bas} son={son} dosya={dosya} klip={klip} yon={yon} ilk={i === 0} />
          </Sequence>
        );
      })}
      {/* altyazı okunurluğu için alt gölge */}
      <AbsoluteFill style={{background: 'linear-gradient(180deg, rgba(0,0,0,.28) 0%, rgba(0,0,0,0) 14%, rgba(0,0,0,0) 62%, rgba(0,0,0,.45) 100%)'}} />
      <div style={{position: 'absolute', top: 60, left: 0, right: 0, textAlign: 'center', fontFamily: `${EL}, sans-serif`, fontSize: 30,
        color: 'rgba(255,248,230,.85)', letterSpacing: 1}}>Temsili illüstrasyon (yapay zekâ)</div>
      <Altyazi t={t} />
      <div style={{position: 'absolute', bottom: 70, width: '100%', textAlign: 'center', fontFamily: `${EL}, sans-serif`, fontSize: 36,
        letterSpacing: 4, color: 'rgba(255,248,230,.8)'}}>Antik Stüdyo</div>
      <AbsoluteFill style={{background: '#000', opacity: Math.max(acilis, kapanis)}} />
    </AbsoluteFill>
  );
};

export const Root: React.FC = () => (
  <Composition id="Bakkal3B" component={Video} durationInFrames={Math.ceil(SON * FPS)} fps={FPS} width={1080} height={1920} />
);
