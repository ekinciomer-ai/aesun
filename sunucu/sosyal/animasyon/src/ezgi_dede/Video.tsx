// "Ezgi ve Dedesi: Ördek Ziyareti" — kâğıt / mürekkep çizim dili (Kâğıt Masal ailesi). Görsellerin tamamı SVG koddur,
// yapay zekâ görseli yok. Ses: Ezgi (Ses D), Dede (Uğur) — ElevenLabs, sunucuda. Müzik ve efektler kodla (muzik/ezgi_ses.py).
// Zamanlar public/ezgi_dede/olaylar.json'dan gelir (muzik/ezgi_zaman.py üretir).
import React from 'react';
import {AbsoluteFill, Composition, Easing, interpolate, staticFile, useCurrentFrame} from 'remotion';
import {loadFont} from '@remotion/fonts';
import veri from '../../public/ezgi_dede/kelimeler.json';
import olay from '../../public/ezgi_dede/olaylar.json';

const EL = 'ElYazisi';
loadFont({family: EL, url: staticFile('fonts/patrick-hand-latin-400-normal.woff2'), weight: '400', unicodeRange: 'U+0000-00FF'});
loadFont({family: EL, url: staticFile('fonts/patrick-hand-latin-ext-400-normal.woff2'), weight: '400', unicodeRange: 'U+0100-024F, U+1E00-1EFF'});

type Kelime = {w: string; s: number; e: number; c: number; k: string};
const K = (veri as Kelime[]).filter((k) => k.w);
const O = olay.o;
const SON = olay.son;
const FPS = 30;
const SAT = olay.satirlar as {c: number; s: number; e: number; k: string}[];
const ss = (c: number) => SAT[c].s;
const ee = (c: number) => SAT[c].e;

// ---- yardımcılar
const gir = (t: number, t0: number, sure = 0.5) =>
  interpolate(t, [t0, t0 + sure], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.bezier(0.45, 0, 0.55, 1)});
const zipla = (t: number, t0: number, sure = 0.4) =>
  interpolate(t, [t0, t0 + sure * 0.6, t0 + sure], [0, 1.15, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
const karis = (a: number, b: number, u: number) => a + (b - a) * u;
const arada = (t: number, a: number, b: number) => t >= a && t < b;
// konuşurken ağız: her kelimede bir kez açılıp kapanır (yavaş, sese oturan)
const agiz = (t: number, kim: string[]) => {
  const k = K.find((x) => kim.includes(x.k) && t >= x.s && t <= x.e);
  if (!k) return 0;
  const u = (t - k.s) / Math.max(0.12, k.e - k.s);
  const hece = Math.max(1, Math.min(3, Math.round(k.w.replace(/[^a-zçğıöşüâîû]/gi, '').length / 3)));
  return Math.abs(Math.sin(u * Math.PI * hece));
};

// ---- palet
const C = {
  kagit: '#eadcbc', mur: '#3b2d22', ten: '#f3dcc0', ten2: '#e9c9a6', sari: '#f2c94c', sari2: '#e0b13a',
  pembe: '#f0a8b8', lila: '#c9b6e4', mint: '#a9dcc6', gok: '#bcd7e6', gol: '#7fb2c9', gol2: '#5f98b3',
  cam: '#5f8a5b', cam2: '#4a7349', ahsap: '#a8744a', ahsap2: '#7a5132', yelek: '#7b5a3e', gomlek: '#ece3cc', pantol: '#77746c',
  sakal: '#c9c4ba', takke: '#f7f3ea', ekmek: '#d89a4e', simit: '#c9803c', susam: '#f4e3b5', cay: '#b3471f', kirmizi: '#c2493b',
  ordek: '#f1e7cf', ordekKafa: '#5d8f5c', gaga: '#e8973a', reis: '#e6d6b0', turuncu: '#e0953f', beyaz: '#fbf6ea', mavi: '#4f8fd6',
};
const M = {stroke: C.mur, strokeWidth: 4.5, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const};
const kalin = (renk: string, w = 34) => ({stroke: renk, strokeWidth: w, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, fill: 'none'});

// kol: dış çizgili kalın çizgi + el
const Kol: React.FC<{d: [number, number, number, number, number, number]; renk: string; el?: string; w?: number}> = ({d, renk, el = C.ten, w = 32}) => (
  <g>
    <path d={`M ${d[0]} ${d[1]} Q ${d[2]} ${d[3]} ${d[4]} ${d[5]}`} {...kalin(C.mur, w + 9)} />
    <path d={`M ${d[0]} ${d[1]} Q ${d[2]} ${d[3]} ${d[4]} ${d[5]}`} {...kalin(renk, w)} />
    <circle cx={d[4]} cy={d[5]} r={w * 0.62} fill={el} {...M} strokeWidth={4} />
  </g>
);

// ---- EZGİ (baş merkezde; gövde ayrı)
type EzgiYuz = 'gul' | 'heyecan' | 'panik' | 'sasir' | 'dil' | 'kapali' | 'bagir' | 'gulumse';
const EzgiBas: React.FC<{t: number; yuz?: EzgiYuz; bak?: number; konus?: number; egim?: number; yas?: number; kizar?: number}> = (p) => {
  const yuz = p.yuz ?? 'gul';
  const bak = p.bak ?? 0;
  const kirp = (p.t * 0.9) % 3.7 < 0.11 ? 0.1 : 1;
  const kapali = yuz === 'kapali';
  const gozY = yuz === 'sasir' || yuz === 'panik' || yuz === 'bagir' ? 1.2 : 1;
  const k = p.konus ?? 0;
  return (
    <g transform={`rotate(${p.egim ?? 0})`}>
      {/* arka saç */}
      <path d="M -86 -20 Q -104 -110 0 -116 Q 104 -110 86 -20 L 100 190 Q 60 214 44 150 L 50 20 Q 0 -10 -50 20 L -44 150 Q -60 214 -100 190 Z" fill={C.sari} {...M} />
      <path d="M -70 60 Q -78 120 -72 170 M 72 60 Q 80 120 74 170" fill="none" {...M} strokeWidth={2.5} stroke={C.sari2} />
      <ellipse cx={0} cy={0} rx={78} ry={84} fill={C.ten} {...M} />
      {/* kâkül */}
      <path d="M -80 -14 Q -70 -96 0 -96 Q 70 -96 80 -14 Q 56 -60 26 -54 Q 12 -40 -4 -58 Q -36 -62 -80 -14 Z" fill={C.sari} {...M} strokeWidth={4} />
      <path d="M 44 -70 l 22 -12 l 6 18 Z" fill={C.pembe} {...M} strokeWidth={3} />
      {/* gözler */}
      {kapali ? (
        <path d="M -48 4 Q -32 16 -16 4 M 16 4 Q 32 16 48 4" fill="none" {...M} />
      ) : (
        <g transform={`translate(0,4) scale(1,${kirp * gozY})`}>
          {[-32, 32].map((gx) => (
            <g key={gx}>
              <ellipse cx={gx} cy={0} rx={21} ry={25} fill="#fff" {...M} strokeWidth={3} />
              <circle cx={gx + bak * 7} cy={3} r={yuz === 'sasir' || yuz === 'panik' ? 9 : 13} fill="#3f8f8a" />
              <circle cx={gx + bak * 7} cy={3} r={yuz === 'sasir' || yuz === 'panik' ? 4.5 : 6.5} fill={C.mur} />
              <circle cx={gx + bak * 7 + 5} cy={-4} r={3.4} fill="#fff" />
            </g>
          ))}
        </g>
      )}
      {/* kaşlar */}
      {yuz === 'panik' || yuz === 'sasir' || yuz === 'bagir'
        ? <path d="M -52 -40 Q -32 -54 -14 -42 M 14 -42 Q 32 -54 52 -40" fill="none" {...M} />
        : <path d="M -50 -32 Q -32 -40 -14 -32 M 14 -32 Q 32 -40 50 -32" fill="none" {...M} strokeWidth={3.5} />}
      {/* yanaklar */}
      <ellipse cx={-50} cy={34} rx={14} ry={9} fill="#ef9a9a" opacity={0.55 + (p.kizar ?? 0) * 0.45} />
      <ellipse cx={50} cy={34} rx={14} ry={9} fill="#ef9a9a" opacity={0.55 + (p.kizar ?? 0) * 0.45} />
      {(p.kizar ?? 0) > 0.05 && <ellipse cx={0} cy={20} rx={70} ry={40} fill="#e86b5b" opacity={(p.kizar ?? 0) * 0.35} />}
      {/* ağız */}
      {yuz === 'dil' ? (
        <g><ellipse cx={0} cy={50} rx={22} ry={16} fill={C.mur} /><path d="M -12 52 Q -12 84 0 86 Q 12 84 12 52 Z" fill="#e8737a" {...M} strokeWidth={3} /></g>
      ) : yuz === 'bagir' || yuz === 'panik' ? (
        <ellipse cx={0} cy={50} rx={20} ry={14 + k * 12} fill={C.mur} />
      ) : yuz === 'sasir' ? (
        <ellipse cx={0} cy={50} rx={11} ry={14} fill={C.mur} />
      ) : k > 0.05 ? (
        <path d={`M -22 42 Q 0 ${48 + k * 30} 22 42 Q 0 ${46 + k * 8} -22 42 Z`} fill={C.mur} {...M} strokeWidth={3} />
      ) : yuz === 'heyecan' ? (
        <path d="M -26 40 Q 0 72 26 40 Z" fill={C.mur} {...M} strokeWidth={3} />
      ) : (
        <path d="M -20 42 Q 0 58 20 42" fill="none" {...M} />
      )}
      {/* gözyaşı */}
      {(p.yas ?? 0) > 0 && [-32, 32].map((gx, i) => (
        <path key={i} d={`M ${gx + (i ? 18 : -18)} ${20 + ((p.t * 120) % 60)} q -6 12 0 18 q 6 -6 0 -18 Z`} fill="#8fc6ea" {...M} strokeWidth={2} opacity={p.yas} />
      ))}
    </g>
  );
};
// gövde: omuz merkezi (0,0), aşağı doğru
const EzgiGovde: React.FC<{alt?: boolean}> = ({alt = false}) => (
  <g>
    <path d="M -70 10 Q -86 0 -96 40 L -104 230 L 104 230 L 96 40 Q 86 0 70 10 Q 0 34 -70 10 Z" fill={C.lila} {...M} />
    <path d="M -30 14 Q 0 40 30 14" fill="none" {...M} strokeWidth={3} />
    <path d="M -60 110 L 60 110 M -64 160 L 64 160" stroke="#b39fd2" strokeWidth={5} />
    {alt && <path d="M -104 226 L 104 226 L 124 330 L -124 330 Z" fill={C.mint} {...M} />}
  </g>
);

// ---- DEDE
const DedeBas: React.FC<{t: number; kas?: number; yuz?: 'ciddi' | 'ufle' | 'hi' | 'gul' | 'konus'; bak?: number; konus?: number}> = (p) => {
  const kirp = (p.t * 0.7 + 1.3) % 4.1 < 0.12 ? 0.12 : 1;
  const yuz = p.yuz ?? 'ciddi';
  const kas = p.kas ?? 0;
  const bak = p.bak ?? 0;
  const k = p.konus ?? 0;
  return (
    <g>
      <ellipse cx={-80} cy={10} rx={14} ry={22} fill={C.ten2} {...M} strokeWidth={3.5} />
      <ellipse cx={80} cy={10} rx={14} ry={22} fill={C.ten2} {...M} strokeWidth={3.5} />
      <ellipse cx={0} cy={0} rx={78} ry={86} fill={C.ten2} {...M} />
      {/* takke (örgü) */}
      <path d="M -78 -30 Q -80 -112 0 -116 Q 80 -112 78 -30 Q 0 -48 -78 -30 Z" fill={C.takke} {...M} />
      {[-60, -36, -12, 12, 36, 60].map((x) => <path key={x} d={`M ${x} -38 l 6 -14 l 6 14 M ${x} -64 l 6 -14 l 6 14 M ${x} -90 l 6 -12 l 6 12`} fill="none" stroke="#cfc6b3" strokeWidth={2.5} />)}
      {/* sakal */}
      <path d="M -74 4 Q -80 96 -30 120 Q 0 136 30 120 Q 80 96 74 4 Q 60 40 40 46 Q 0 30 -40 46 Q -60 40 -74 4 Z" fill={C.sakal} {...M} />
      {[-40, -18, 6, 28, 50].map((x) => <path key={x} d={`M ${x} 70 q 4 14 0 26`} fill="none" stroke="#a9a397" strokeWidth={3} />)}
      {/* gözler */}
      {yuz === 'hi' ? (
        <path d="M -42 -6 Q -28 4 -14 -6 M 14 -6 Q 28 4 42 -6" fill="none" {...M} />
      ) : (
        <g transform={`scale(1,${kirp})`}>
          <circle cx={-28 + bak * 6} cy={-6} r={7} fill={C.mur} />
          <circle cx={28 + bak * 6} cy={-6 - kas * 4} r={7 + kas * 2} fill={C.mur} />
        </g>
      )}
      {/* kalın kaşlar: sağ kaş kalkar */}
      <path d="M -52 -26 Q -30 -36 -10 -26" fill="none" stroke="#9c968b" strokeWidth={11} strokeLinecap="round" />
      <path d={`M 10 ${-26 - kas * 26} Q 30 ${-38 - kas * 34} 52 ${-26 - kas * 22}`} fill="none" stroke="#9c968b" strokeWidth={11} strokeLinecap="round" />
      {/* burun */}
      <ellipse cx={0} cy={18} rx={17} ry={14} fill="#e2b48e" {...M} strokeWidth={3.5} />
      {/* bıyık + ağız */}
      {yuz === 'ufle' ? <ellipse cx={0} cy={52} rx={8} ry={8} fill={C.mur} /> : null}
      {k > 0.05 ? <ellipse cx={0} cy={50} rx={14} ry={4 + k * 10} fill={C.mur} /> : null}
      <path d={`M -44 ${44 - (yuz === 'gul' ? 4 : 0)} Q -20 30 0 40 Q 20 30 44 ${44 - (yuz === 'gul' ? 4 : 0)} Q 22 ${50 - k * 4} 0 46 Q -22 ${50 - k * 4} -44 ${44 - (yuz === 'gul' ? 4 : 0)} Z`} fill="#b7b1a6" {...M} strokeWidth={3.5} />
    </g>
  );
};
const DedeGovde: React.FC<{yelekAcik?: number; alt?: boolean}> = ({yelekAcik = 0, alt = false}) => (
  <g>
    <path d="M -82 12 Q -100 4 -108 48 L -114 250 L 114 250 L 108 48 Q 100 4 82 12 Q 0 30 -82 12 Z" fill={C.gomlek} {...M} />
    {/* yelek (sağ kanat açılabilir) */}
    <path d="M -84 14 L -100 250 L -10 250 L -8 60 Q -40 40 -84 14 Z" fill={C.yelek} {...M} />
    <g transform={`translate(10,0) rotate(${-yelekAcik * 38}, 90, 30) translate(-10,0)`}>
      <path d="M 84 14 L 100 250 L 10 250 L 8 60 Q 40 40 84 14 Z" fill={C.yelek} {...M} />
      <path d="M 30 150 L 80 150 L 80 200 L 30 200 Z" fill="#6a4c33" {...M} strokeWidth={3} />
    </g>
    {[90, 140, 190].map((y) => <circle key={y} cx={-18} cy={y} r={6} fill="#d8c08c" {...M} strokeWidth={2.5} />)}
    {alt && <g><path d="M -96 248 L 96 248 L 100 300 L -100 300 Z" fill={C.pantol} {...M} /></g>}
  </g>
);
const Baston: React.FC<{x: number; y: number; aci?: number}> = ({x, y, aci = 0}) => (
  <g transform={`translate(${x},${y}) rotate(${aci})`}>
    <path d="M 0 0 L 0 420" stroke={C.mur} strokeWidth={17} strokeLinecap="round" />
    <path d="M 0 0 L 0 420" stroke={C.ahsap2} strokeWidth={10} strokeLinecap="round" />
    <path d="M 0 6 Q 0 -40 -34 -36 Q -56 -30 -50 -6" fill="none" stroke={C.mur} strokeWidth={17} strokeLinecap="round" />
    <path d="M 0 6 Q 0 -40 -34 -36 Q -56 -30 -50 -6" fill="none" stroke={C.ahsap2} strokeWidth={10} strokeLinecap="round" />
  </g>
);

// ---- ÖRDEKLER
const Ordek: React.FC<{x: number; y: number; s?: number; t: number; yon?: 1 | -1; reis?: boolean; kanat?: number; gul?: boolean; kirp?: boolean; su?: boolean; faz?: number}> = (p) => {
  const s = (p.s ?? 1) * (p.reis ? 1.35 : 1);
  const sal = p.su === false ? 0 : Math.sin(p.t * 3 + (p.faz ?? 0)) * 4;
  const kanat = p.kanat ?? 0;
  const goz = p.kirp ? null : <circle cx={46} cy={-92} r={5} fill={C.mur} />;
  return (
    <g transform={`translate(${p.x},${p.y + sal}) scale(${s * (p.yon ?? 1)},${s})`}>
      <path d="M -70 -20 Q -86 -70 -40 -64 Q 0 -80 40 -56 Q 70 -40 60 0 Q 40 20 -40 16 Q -76 12 -70 -20 Z" fill={p.reis ? C.reis : C.ordek} {...M} />
      <path d="M -82 -40 l -18 -10 l 8 18 Z" fill={p.reis ? C.reis : C.ordek} {...M} strokeWidth={3} />
      {/* kanat */}
      <g transform={`rotate(${-kanat * 110}, 0, -40)`}>
        <path d="M -40 -40 Q 0 -60 24 -36 Q 0 -10 -40 -20 Z" fill={p.reis ? '#c8b58c' : '#d9cba8'} {...M} strokeWidth={3.5} />
      </g>
      {/* boyun + baş */}
      <path d="M 26 -50 Q 24 -76 34 -96" fill="none" {...M} strokeWidth={26} stroke={C.mur} />
      <path d="M 26 -50 Q 24 -76 34 -96" fill="none" strokeWidth={18} stroke={p.reis ? C.reis : C.ordek} strokeLinecap="round" />
      <circle cx={40} cy={-100} r={28} fill={C.ordekKafa} {...M} />
      {p.reis && <ellipse cx={24} cy={-68} rx={12} ry={9} fill="#6b4a32" opacity={0.85} />}
      {p.reis && <path d="M 26 -122 Q 44 -134 62 -120" fill="none" {...M} strokeWidth={6} />}
      <path d={p.gul ? 'M 62 -98 Q 92 -96 94 -86 Q 82 -78 62 -86 Z' : 'M 62 -98 Q 96 -94 92 -84 Q 80 -80 62 -86 Z'} fill={C.gaga} {...M} strokeWidth={3} />
      {p.gul && <path d="M 66 -84 Q 80 -76 92 -84" fill="none" {...M} strokeWidth={2.5} />}
      {goz ?? <path d="M 38 -94 L 54 -92" {...M} strokeWidth={4} />}
    </g>
  );
};

// ---- nesneler
const Ekmek: React.FC<{x: number; y: number; s?: number; aci?: number}> = ({x, y, s = 1, aci = 0}) => (
  <g transform={`translate(${x},${y}) rotate(${aci}) scale(${s})`}>
    <path d="M -70 0 Q -74 -30 -40 -32 L 40 -32 Q 74 -30 70 0 Q 66 14 40 14 L -40 14 Q -66 14 -70 0 Z" fill={C.ekmek} {...M} />
    <path d="M -36 -26 l 14 22 M -8 -28 l 14 22 M 20 -28 l 14 22" {...M} strokeWidth={3} />
  </g>
);
const Simit: React.FC<{x: number; y: number; s?: number; aci?: number}> = ({x, y, s = 1, aci = 0}) => (
  <g transform={`translate(${x},${y}) rotate(${aci}) scale(${s})`}>
    <circle r={46} fill="none" stroke={C.mur} strokeWidth={34} />
    <circle r={46} fill="none" stroke={C.simit} strokeWidth={26} />
    {[0, 40, 80, 120, 160, 200, 240, 280, 320].map((a) => <ellipse key={a} cx={Math.cos(a * 0.01745) * 46} cy={Math.sin(a * 0.01745) * 46} rx={3} ry={1.6} fill={C.susam} transform={`rotate(${a}, ${Math.cos(a * 0.01745) * 46}, ${Math.sin(a * 0.01745) * 46})`} />)}
  </g>
);
const Biskuvi: React.FC<{x: number; y: number; s?: number; aci?: number}> = ({x, y, s = 1, aci = 0}) => (
  <g transform={`translate(${x},${y}) rotate(${aci}) scale(${s})`}>
    <rect x={-60} y={-26} width={120} height={52} rx={8} fill="#5b8fd1" {...M} />
    <rect x={-40} y={-12} width={80} height={24} rx={6} fill={C.sari} {...M} strokeWidth={2.5} />
    <path d="M -28 0 L 28 0" stroke={C.mur} strokeWidth={3} strokeDasharray="6 6" />
  </g>
);
const CayBardak: React.FC<{x: number; y: number; s?: number; aci?: number; buhar?: number; t: number}> = ({x, y, s = 1, aci = 0, buhar = 1, t}) => (
  <g transform={`translate(${x},${y}) rotate(${aci}) scale(${s})`}>
    <path d="M -26 -90 Q -34 -60 -18 -46 Q -28 -20 -22 0 L 22 0 Q 28 -20 18 -46 Q 34 -60 26 -90 Z" fill={C.cay} {...M} strokeWidth={3.5} opacity={0.92} />
    <path d="M -26 -90 L 26 -90" {...M} strokeWidth={3.5} />
    <path d="M -14 -82 Q -18 -60 -10 -50" fill="none" stroke="#fff" strokeWidth={4} opacity={0.6} strokeLinecap="round" />
    {buhar > 0 && [0, 1].map((i) => (
      <path key={i} d={`M ${-8 + i * 16} -100 q ${10 * Math.sin(t * 3 + i)} -20 0 -40 q ${-10 * Math.sin(t * 3 + i)} -20 0 -40`} fill="none" stroke={C.mur} strokeWidth={3} opacity={0.35 * buhar} strokeLinecap="round" />
    ))}
  </g>
);
const Tabak: React.FC<{x: number; y: number}> = ({x, y}) => <ellipse cx={x} cy={y} rx={56} ry={13} fill={C.beyaz} {...M} strokeWidth={3.5} />;
const Telefon: React.FC<{x: number; y: number; s?: number; aci?: number; isik?: boolean}> = ({x, y, s = 1, aci = 0, isik}) => (
  <g transform={`translate(${x},${y}) rotate(${aci}) scale(${s})`}>
    <rect x={-34} y={-62} width={68} height={124} rx={12} fill="#2d2a33" {...M} strokeWidth={4} />
    <rect x={-27} y={-52} width={54} height={100} rx={6} fill={isik ? '#bfe3ff' : '#4b6d8c'} />
  </g>
);
const Ter: React.FC<{x: number; y: number; t: number}> = ({x, y, t}) => (
  <path transform={`translate(${x},${y + ((t * 80) % 30)})`} d="M 0 0 q -8 14 0 20 q 8 -6 0 -20 Z" fill="#8fc6ea" {...M} strokeWidth={2} />
);
const Hiz: React.FC<{x: number; y: number; yon?: number}> = ({x, y, yon = -1}) => (
  <g transform={`translate(${x},${y}) scale(${yon},1)`}>{[0, 22, 44].map((d) => <path key={d} d={`M 0 ${d - 22} L 70 ${d - 22}`} {...M} strokeWidth={4} />)}</g>
);
const Yazi: React.FC<{x: number; y: number; u: number; boy?: number; renk?: string; aci?: number; children: React.ReactNode}> = ({x, y, u, boy = 70, renk = C.mur, aci = 0, children}) =>
  u <= 0 ? null : (
    <text x={x} y={y} textAnchor="middle" fontFamily={EL} fontSize={boy} fill={renk} stroke={C.beyaz} strokeWidth={8} paintOrder="stroke"
      transform={`rotate(${aci}, ${x}, ${y}) translate(${x * (1 - Math.min(u, 1.15))}, ${y * (1 - Math.min(u, 1.15))}) scale(${Math.min(u, 1.15)})`}>{children}</text>
  );

// ---- SAHNELER (her biri kendi 1080×1920 alanında)
const Araba: React.FC<{t: number}> = ({t}) => {
  const sar = Math.sin(t * 9) * 3 + Math.sin(t * 2.3) * 2;
  const kas = gir(t, O.kasKalk, 0.25);
  const ezgiKonus = agiz(t, ['E', 'I']);
  const icSes = arada(t, ss(3), ee(3) + 0.3);
  const yakin = gir(t, ee(1) + 0.5, 1.2) * (1 - gir(t, ss(3) - 0.1, 0.4));
  const kayma = (t * 260) % 1400;
  return (
    <g transform={`translate(${540 - 540 * (1 + yakin * 0.45) + (-180 * yakin)}, ${960 - 960 * (1 + yakin * 0.45) + (-120 * yakin)}) scale(${1 + yakin * 0.45})`}>
      {/* dış manzara (camdan) */}
      <clipPath id="cam"><path d="M 140 330 Q 150 250 260 240 L 900 240 Q 1000 250 1010 330 L 1010 860 L 140 860 Z" /></clipPath>
      <g clipPath="url(#cam)">
        <rect x={0} y={200} width={1080} height={700} fill={C.gok} />
        <path d={`M ${-kayma * 0.3} 700 Q ${300 - kayma * 0.3} 560 ${600 - kayma * 0.3} 680 T ${1200 - kayma * 0.3} 660 T ${1800 - kayma * 0.3} 680 L ${1800 - kayma * 0.3} 900 L ${-kayma * 0.3} 900 Z`} fill="#b9c79a" {...M} strokeWidth={3} />
        {[0, 1, 2, 3, 4, 5].map((i) => {
          const x = ((i * 300 - kayma) % 1800 + 1800) % 1800 - 200;
          return <g key={i} transform={`translate(${x},760)`}><path d="M 0 0 L -50 0 L 0 -150 L 50 0 Z" fill={C.cam} {...M} /><path d="M 0 -90 L -36 -90 L 0 -190 L 36 -90 Z" fill={C.cam2} {...M} /></g>;
        })}
        <rect x={0} y={790} width={1080} height={120} fill="#9a8f7f" />
      </g>
      <path d="M 140 330 Q 150 250 260 240 L 900 240 Q 1000 250 1010 330 L 1010 860 L 140 860 Z" fill="none" {...M} strokeWidth={9} />
      <path d="M 0 0 L 1080 0 L 1080 240 L 0 240 Z M 0 860 L 1080 860 L 1080 1920 L 0 1920 Z M 0 240 L 140 240 L 140 860 L 0 860 Z M 1010 240 L 1080 240 L 1080 860 L 1010 860 Z" fill="#d9c7a3" {...M} strokeWidth={4} />
      {/* koltuklar */}
      <path d="M 560 760 Q 560 640 700 640 L 900 640 Q 1000 640 1000 760 L 1010 1500 L 560 1500 Z" fill="#8c6b52" {...M} />
      <path d="M 70 780 Q 70 660 200 660 L 400 660 Q 520 660 520 780 L 530 1500 L 70 1500 Z" fill="#8c6b52" {...M} />
      {/* dede (sağda, cama bakıyor) */}
      <g transform={`translate(790,${1010 + sar})`}>
        <DedeGovde />
        <g transform="translate(0,-110)"><DedeBas t={t} kas={kas} bak={yakin > 0.1 ? 0 : 1} /></g>
      </g>
      {/* Ezgi (solda, telefonla çekiyor) */}
      <g transform={`translate(290,${1040 + sar * 1.2})`}>
        <EzgiGovde />
        <Kol d={[-70, 30, -90, 140, -20, 120]} renk={C.lila} />
        <g transform="translate(0,-112)"><EzgiBas t={t} yuz={icSes ? 'gulumse' : 'heyecan'} bak={icSes ? -0.3 : 1} konus={ezgiKonus} egim={icSes ? -8 : 6} /></g>
        <Kol d={[70, 30, 160, 60, 180, -60]} renk={C.lila} />
        <Telefon x={190} y={-120} aci={10} isik />
      </g>
      <Ter x={0} y={-999} t={t} />
      {kas > 0 && <Yazi x={900} y={760 + sar} u={zipla(t, O.kasKalk + 0.1, 0.35)} boy={90} renk={C.kirmizi}>!</Yazi>}
    </g>
  );
};

const EkmekKrizi: React.FC<{t: number}> = ({t}) => {
  const sar = Math.sin(t * 9) * 3;
  const ac = gir(t, O.yelekAc, 0.5);
  const avm = zipla(t, O.avm, 0.5);
  const esyaX = [-40, 60, 150, 60];
  const esyaY = [-260, -330, -260, -170];
  const ezgiK = agiz(t, ['E']);
  const sasir = t >= O.esya[0];
  return (
    <g>
      <rect width={1080} height={1920} fill="#d9c7a3" />
      <path d="M 0 0 L 1080 0 L 1080 420 Q 540 470 0 420 Z" fill="#cbb690" {...M} />
      <path d="M 40 900 Q 40 760 220 760 L 860 760 Q 1040 760 1040 900 L 1060 1920 L 20 1920 Z" fill="#8c6b52" {...M} />
      {/* Ezgi çanta karıştırıyor */}
      <g transform={`translate(300,${1060 + sar})`}>
        <EzgiGovde />
        <g transform="translate(-10,-112)"><EzgiBas t={t} yuz={sasir ? 'sasir' : 'panik'} konus={ezgiK} bak={sasir ? 1 : 0} egim={sasir ? 8 : -4} /></g>
        {!sasir && <><Ter x={-80} y={-200} t={t} /><Ter x={84} y={-230} t={t + 0.3} /></>}
        <path d="M -40 170 L 150 170 L 170 380 L -60 380 Z" fill="#e39fae" {...M} />
        <path d="M -10 170 Q 55 80 120 170" fill="none" {...M} strokeWidth={8} />
        <Kol d={[-70, 30, -60, 160, 10 + Math.sin(t * 18) * 20, 200]} renk={C.lila} />
        <Kol d={[70, 30, 110, 140, 60 + Math.cos(t * 16) * 20, 210]} renk={C.lila} />
        {!sasir && [0, 1, 2].map((i) => {
          const f = ((t * 1.6 + i * 0.33) % 1);
          return <g key={i} transform={`translate(${50 + (i - 1) * 90 * f},${170 - Math.sin(f * Math.PI) * 220})`} opacity={1 - f}>
            {i === 0 ? <rect x={-14} y={-30} width={28} height={60} rx={6} fill={C.kirmizi} {...M} strokeWidth={3} />
              : i === 1 ? <circle r={22} fill="#7fb2c9" {...M} strokeWidth={3} /> : <rect x={-30} y={-12} width={60} height={24} rx={4} fill={C.beyaz} {...M} strokeWidth={3} />}
          </g>;
        })}
      </g>
      {/* Dede: yeleğini açar, eşyalar fırlar */}
      <g transform={`translate(780,${1030 + sar})`}>
        <DedeGovde yelekAcik={ac} />
        <g transform="translate(0,-110)"><DedeBas t={t} yuz="ciddi" bak={-0.6} kas={0} /></g>
        <Kol d={[80, 30, 150, 150, 110 - ac * 10, 120 - ac * 60]} renk={C.gomlek} />
        {O.esya.map((te, i) => {
          const u = zipla(t, te, 0.45);
          if (u <= 0) return null;
          const x = karis(60, esyaX[i], Math.min(1, u));
          const y = karis(120, esyaY[i], Math.min(1, u));
          const ic = [<Ekmek key="e" x={0} y={0} s={1.1} />, <Simit key="s1" x={0} y={0} s={0.9} />, <Simit key="s2" x={0} y={0} s={0.9} aci={30} />, <Biskuvi key="b" x={0} y={0} />][i];
          return <g key={i} transform={`translate(${x},${y}) scale(${Math.min(1.1, u)})`}>{ic}</g>;
        })}
      </g>
      {avm > 0 && (
        <g transform={`translate(840,${1300 + sar}) scale(${avm})`}>
          <rect x={-110} y={-56} width={220} height={100} rx={16} fill="#2d2a33" {...M} />
          <text x={0} y={22} textAnchor="middle" fontFamily={EL} fontSize={74} fill={(t * 4) % 1 < 0.5 ? '#ff6fa8' : '#ffd84a'}>AVM</text>
          {[[-130, -60], [130, -50], [120, 60]].map(([x, y], i) => <path key={i} d={`M ${x} ${y - 16} L ${x + 5} ${y - 4} L ${x + 16} ${y} L ${x + 5} ${y + 4} L ${x} ${y + 16} L ${x - 5} ${y + 4} L ${x - 16} ${y} L ${x - 5} ${y - 4} Z`} fill={C.sari} {...M} strokeWidth={2.5} />)}
        </g>
      )}
    </g>
  );
};

const Manzara: React.FC<{t: number; gunbatimi?: number}> = ({t, gunbatimi = 0}) => (
  <g>
    <defs>
      <linearGradient id="gok" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor={gunbatimi ? '#f2a65a' : '#bcd7e6'} />
        <stop offset="1" stopColor={gunbatimi ? '#f7d38c' : '#e7efe4'} />
      </linearGradient>
    </defs>
    <rect width={1080} height={900} fill="url(#gok)" />
    {gunbatimi ? <circle cx={700} cy={820} r={120} fill="#f9c96b" {...M} strokeWidth={3} /> : <circle cx={860} cy={220} r={70} fill="#f7e08a" {...M} strokeWidth={3} />}
    <path d="M 0 760 Q 200 640 420 720 Q 620 620 820 700 Q 980 650 1080 700 L 1080 900 L 0 900 Z" fill={gunbatimi ? '#b98a6a' : '#a9bf95'} {...M} strokeWidth={3} />
    {[60, 180, 300, 860, 980].map((x, i) => (
      <g key={x} transform={`translate(${x},${880 - (i % 2) * 20}) scale(${1 + (i % 3) * 0.15})`}>
        <path d="M -6 0 L -6 40 L 6 40 L 6 0" fill={C.ahsap2} {...M} strokeWidth={3} />
        <path d="M 0 -220 L -60 -100 L -30 -100 L -80 0 L 80 0 L 30 -100 L 60 -100 Z" fill={gunbatimi ? '#4f5a3d' : C.cam} {...M} />
      </g>
    ))}
    <rect y={900} width={1080} height={1020} fill={gunbatimi ? '#d88f5f' : C.gol} />
    {gunbatimi > 0 && <path d={`M 600 920 L 800 920 L 760 1400 L 640 1400 Z`} fill="#f9c96b" opacity={0.45} />}
    {[0, 1, 2, 3, 4, 5, 6].map((i) => (
      <path key={i} d={`M ${((i * 170 + t * 30) % 1200) - 60} ${960 + i * 120} q 30 -10 60 0 q 30 10 60 0`} fill="none" stroke={gunbatimi ? '#b8673f' : C.gol2} strokeWidth={5} strokeLinecap="round" />
    ))}
  </g>
);

const Gol: React.FC<{t: number}> = ({t}) => {
  const kos = gir(t, O.kos, 0.6);
  const kac = gir(t, O.kac, 0.9);
  const dizil = gir(t, O.dizil + 0.2, 1.0);
  const tak = t >= O.tak && t < O.tak + 0.25;
  const selam = gir(t, O.selam, 0.25) * (1 - gir(t, O.selam + 1.1, 0.3));
  const ezgiK = agiz(t, ['E']);
  const sonra = t >= O.tak;
  const ordekler = [0, 1, 2, 3, 4];
  return (
    <g>
      <Manzara t={t} />
      {/* ahşap kafe (solda) */}
      <g transform="translate(-40,640)">
        <path d="M 0 0 L 300 0 L 300 260 L 0 260 Z" fill={C.ahsap} {...M} />
        <path d="M -30 0 L 150 -110 L 330 0 Z" fill={C.ahsap2} {...M} />
        <rect x={60} y={80} width={80} height={80} fill="#f7e6b0" {...M} />
        <text x={150} y={40} textAnchor="middle" fontFamily={EL} fontSize={40} fill={C.beyaz}>KAFE</text>
      </g>
      {/* ördekler: kaçar, sonra sıraya dizilir */}
      {ordekler.map((i) => {
        const x0 = 420 + i * 120, y0 = 1080 + (i % 2) * 70;
        const kx = 1200 + i * 60, ky = 980 + i * 30;
        const dx = 300 + i * 120, dy = 1190;
        const x = sonra ? karis(kx, dx, dizil) : karis(x0, kx, kac);
        const y = sonra ? karis(ky, dy, dizil) : karis(y0, ky, kac);
        return <Ordek key={i} x={x} y={y} s={0.8} t={t} faz={i} yon={sonra && dizil > 0.6 ? -1 : 1} />;
      })}
      {/* Reis */}
      <Ordek x={sonra ? karis(1250, 560, dizil) : karis(560, 1300, kac)} y={sonra ? karis(1000, 1290, dizil) : karis(1180, 1000, kac)} t={t} reis
        kanat={selam} yon={sonra && dizil > 0.6 ? -1 : 1} faz={2} />
      {kac > 0 && kac < 1 && !sonra && <><Hiz x={1100} y={1020} /><Yazi x={900} y={950} u={zipla(t, O.kac, 0.3)} boy={80} aci={-10}>VAK! VAK!</Yazi></>}
      {/* çimen kıyı */}
      <path d="M 0 1330 Q 300 1290 560 1330 Q 800 1370 1080 1320 L 1080 1920 L 0 1920 Z" fill="#a9bf95" {...M} />
      {/* Ezgi koşarak gelir */}
      <g transform={`translate(${karis(-150, 330, kos)},${1390 + (kos < 1 ? Math.abs(Math.sin(t * 14)) * -20 : 0)}) scale(0.82)`}>
        <path d="M -40 330 L -50 470 M 40 330 L 60 470" {...M} strokeWidth={8} />
        <EzgiGovde alt />
        <Kol d={[-70, 30, -150, -40, -140, -150]} renk={C.lila} />
        <Kol d={[70, 30, 150, -40, 140, -150]} renk={C.lila} />
        <g transform="translate(0,-112)"><EzgiBas t={t} yuz={sonra ? 'sasir' : 'bagir'} konus={ezgiK} bak={1} /></g>
      </g>
      {/* Dede arkada, bastonuyla */}
      <g transform="translate(860,1310) scale(0.82)">
        <path d="M -40 300 L -40 470 M 40 300 L 40 470" {...M} strokeWidth={10} />
        <DedeGovde alt />
        <g transform="translate(0,-110)"><DedeBas t={t} yuz="ciddi" bak={-1} /></g>
        <Kol d={[-82, 30, -150, 120, -150, 170]} renk={C.gomlek} />
        <Baston x={-150} y={tak ? 150 : 120} />
      </g>
      {tak && <Yazi x={640} y={1470} u={1} boy={110} renk={C.kirmizi}>TAK!</Yazi>}
      {selam > 0.2 && <Yazi x={560} y={1060} u={zipla(t, O.selam, 0.3)} boy={60}>Hoş geldin reis!</Yazi>}
    </g>
  );
};

const Masa: React.FC = () => (
  <g>
    <rect width={1080} height={1920} fill="#eadcbc" />
    <path d="M 0 0 L 1080 0 L 1080 900 L 0 900 Z" fill="#cfe0dc" />
    <path d="M 0 900 L 1080 900" {...M} strokeWidth={6} />
    {[100, 300, 500, 700, 900].map((x) => <path key={x} d={`M ${x} 0 L ${x} 900`} stroke="#b8cfca" strokeWidth={10} />)}
    <path d="M 540 120 Q 640 70 760 120 Q 860 90 900 160" fill="none" {...M} strokeWidth={3} />
  </g>
);
const MasaOn: React.FC = () => (
  <g>
    <path d="M -20 1260 L 1100 1260 L 1100 1350 L -20 1350 Z" fill={C.ahsap} {...M} />
    <path d="M -20 1350 L 1100 1350 L 1100 1920 L -20 1920 Z" fill={C.ahsap2} {...M} />
    {[1300, 1420, 1560, 1720].map((y) => <path key={y} d={`M 0 ${y} Q 540 ${y + 14} 1080 ${y}`} fill="none" stroke="#6a4528" strokeWidth={3} />)}
  </g>
);

const Cay: React.FC<{t: number}> = ({t}) => {
  const ufle = arada(t, O.ufle, O.yudum);
  const dedeYudum = gir(t, O.yudum, 0.35) * (1 - gir(t, ee(10) + 0.2, 0.4));
  const ezgiYudum = gir(t, O.ezgiYudum - 0.3, 0.3) * (1 - gir(t, O.yan, 0.2));
  const yandi = t >= O.yan;
  const pecete = gir(t, O.pecete, 0.5);
  const dedeK = agiz(t, ['D']);
  const ezgiK = agiz(t, ['E']);
  return (
    <g>
      <Masa />
      {/* Ezgi solda */}
      <g transform="translate(300,1050)">
        <EzgiGovde />
        <g transform="translate(0,-112)"><EzgiBas t={t} yuz={yandi ? 'dil' : ezgiYudum > 0.3 ? 'kapali' : 'gul'} konus={yandi ? 0 : ezgiK} yas={yandi ? 1 : 0} kizar={yandi ? 1 : 0} bak={0.6} /></g>
        <Kol d={[70, 30, 150, 160, karis(150, 90, ezgiYudum), karis(180, -40, ezgiYudum)]} renk={C.lila} />
        {pecete > 0 && <Kol d={[-70, 30, -60, 130, 40, 160]} renk={C.lila} />}
      </g>
      {/* Dede sağda, hiç bakmadan peçete uzatır */}
      <g transform="translate(790,1030)">
        <DedeGovde />
        <g transform="translate(0,-110)"><DedeBas t={t} yuz={ufle ? 'ufle' : dedeYudum > 0.3 || arada(t, ss(10), ee(10) + 0.3) ? 'hi' : 'ciddi'} konus={dedeK} bak={0} /></g>
        <Kol d={[-80, 30, -150, 160, karis(-150, -90, ufle ? 0.6 : dedeYudum), karis(180, -40, ufle ? 0.5 : dedeYudum)]} renk={C.gomlek} />
        {pecete > 0 && <Kol d={[-80, 40, -200, 200, karis(-120, -340, pecete), karis(220, 150, pecete)]} renk={C.gomlek} />}
      </g>
      <MasaOn />
      {/* çaylar */}
      <Tabak x={430} y={1290} /><Tabak x={660} y={1290} />
      {ezgiYudum < 0.05 ? <CayBardak x={430} y={1282} t={t} /> : <CayBardak x={karis(430, 380, ezgiYudum)} y={karis(1282, 1000, ezgiYudum)} t={t} aci={karis(0, 25, ezgiYudum)} />}
      {dedeYudum < 0.05 && !ufle ? <CayBardak x={660} y={1282} t={t} /> : <CayBardak x={karis(660, 720, ufle ? 0.6 : dedeYudum)} y={karis(1282, 1000, ufle ? 0.55 : dedeYudum)} t={t} aci={karis(0, -25, dedeYudum)} buhar={ufle ? 0.3 : 1} />}
      {ufle && [0, 1, 2].map((i) => <path key={i} d={`M ${720 - i * 14} ${980 - ((t * 2 + i * 0.3) % 1) * 60} q 10 -6 20 0`} fill="none" {...M} strokeWidth={3} opacity={0.6} />)}
      {pecete > 0 && <rect x={karis(660, 450, pecete) - 40} y={karis(1170, 1090, pecete) - 40} width={80} height={80} fill={C.beyaz} {...M} strokeWidth={3} transform={`rotate(12, ${karis(660, 450, pecete)}, ${karis(1170, 1090, pecete)})`} />}
      {yandi && <Yazi x={200} y={720} u={zipla(t, O.yan, 0.3)} boy={84} renk={C.kirmizi} aci={-12}>Ahh!</Yazi>}
      {arada(t, ss(10), ee(10) + 0.4) && <Yazi x={880} y={760} u={zipla(t, ss(10), 0.4)} boy={70} aci={8}>hıııı</Yazi>}
    </g>
  );
};

const Selfie: React.FC<{t: number}> = ({t}) => {
  const flas = O.flas.map((f) => t >= f && t < f + 0.12);
  const reis = zipla(t, O.reisGir, 0.4);
  const donma = gir(t, O.flas[2] + 0.15, 0.4);
  const ezgiK = agiz(t, ['E']);
  return (
    <g>
      <g transform={`translate(540,900) rotate(${donma * -4}) scale(${1 - donma * 0.08}) translate(-540,-900)`}>
        <rect x={90} y={160} width={900} height={1400} rx={70} fill="#2d2a33" {...M} strokeWidth={6} />
        <clipPath id="ekran"><rect x={120} y={200} width={840} height={1320} rx={44} /></clipPath>
        <g clipPath="url(#ekran)">
          <g transform="translate(0,-120)"><Manzara t={t} /></g>
          {reis > 0 && <Ordek x={560} y={karis(1100, 760, Math.min(1, reis))} s={1.5} t={t} reis gul kanat={0.5} su={false} />}
          <g transform="translate(360,1150) scale(1.15)">
            <EzgiGovde />
            <Kol d={[70, 30, 120, -20, 120, -110]} renk={C.lila} />
            <g transform="translate(0,-112)"><EzgiBas t={t} yuz="heyecan" konus={ezgiK} egim={-8} /></g>
          </g>
          <g transform="translate(740,1150) scale(1.15)">
            <DedeGovde />
            <g transform="translate(0,-110)"><DedeBas t={t} yuz="ciddi" /></g>
          </g>
          {/* çerçeve arayüzü */}
          <rect x={120} y={200} width={840} height={1320} fill="none" stroke="#fff" strokeWidth={2} strokeDasharray="8 10" opacity={0.6} />
          {flas.some(Boolean) && <rect x={0} y={0} width={1080} height={1920} fill="#fff" />}
        </g>
        <circle cx={540} cy={1470} r={44} fill="#fff" {...M} strokeWidth={5} />
        {O.flas.map((f, i) => t >= f + 0.12 && <text key={i} x={180 + i * 60} y={1490} fontFamily={EL} fontSize={40} fill="#fff">✓</text>)}
      </g>
      {O.flas.map((f, i) => arada(t, f, f + 0.6) && <Yazi key={i} x={[260, 820, 540][i]} y={[420, 420, 360][i]} u={zipla(t, f, 0.25)} boy={74} aci={[-10, 10, 0][i]} renk={C.kirmizi}>ÇEK!</Yazi>)}
    </g>
  );
};

const SimitHirsizi: React.FC<{t: number}> = ({t}) => {
  const kap = gir(t, O.kap, 0.25);
  const kac = gir(t, O.kap + 0.25, 0.9);
  const firla = zipla(t, O.firla, 0.35);
  const dedeYudum = gir(t, O.dedeYudum, 0.3) * (1 - gir(t, O.yedek - 0.2, 0.3));
  const yedek = gir(t, O.yedek, 0.6);
  const ezgiK = agiz(t, ['E']);
  return (
    <g>
      <Masa />
      <g transform={`translate(300,${1050 - firla * 120})`}>
        <EzgiGovde />
        <g transform="translate(0,-112)"><EzgiBas t={t} yuz={firla > 0 ? (yedek > 0.8 ? 'heyecan' : 'bagir') : 'gul'} konus={ezgiK} bak={firla > 0 ? -1 : 0.4} /></g>
        {firla > 0
          ? <><Kol d={[-70, 30, -150, -30, -160, -140]} renk={C.lila} /><Kol d={[70, 30, 160, 60, karis(170, 180, yedek), karis(-40, 120, yedek)]} renk={C.lila} /></>
          : <Kol d={[70, 30, 130, 150, 120, 110]} renk={C.lila} />}
        {firla <= 0 && <Telefon x={120} y={60} aci={-20} isik />}
      </g>
      <g transform="translate(790,1030)">
        <DedeGovde yelekAcik={gir(t, O.yedek - 0.4, 0.3) * (1 - gir(t, O.yedek + 0.4, 0.3))} />
        <g transform="translate(0,-110)"><DedeBas t={t} yuz={dedeYudum > 0.3 ? 'hi' : 'ciddi'} bak={0} /></g>
        <Kol d={[-80, 30, -150, 160, karis(-150, -90, dedeYudum), karis(180, -40, dedeYudum)]} renk={C.gomlek} />
        <Kol d={[80, 30, 120, 160, karis(60, -380, yedek), karis(130, 40, yedek)]} renk={C.gomlek} />
        {yedek > 0 && <Simit x={karis(60, -380, yedek)} y={karis(100, 10, yedek)} s={0.9} />}
      </g>
      <MasaOn />
      <Tabak x={660} y={1290} />
      <CayBardak x={dedeYudum > 0.05 ? karis(660, 720, dedeYudum) : 660} y={dedeYudum > 0.05 ? karis(1282, 1000, dedeYudum) : 1282} t={t} />
      {/* simit masada; Reis kapar */}
      {kap < 0.5 && <Simit x={430} y={1280} s={0.85} />}
      <Ordek x={kap < 1 ? karis(-120, 380, kap) : karis(380, -360, kac)} y={kap < 1 ? karis(1500, 1270, kap) : karis(1270, 1180, kac)} t={t} reis yon={kap < 1 ? 1 : -1} su={false} gul={kac > 0} />
      {kap >= 0.5 && kac < 1 && <Simit x={(kap < 1 ? karis(-120, 380, kap) : karis(380, -360, kac)) - 90 * (kap < 1 ? -1 : 1) + (kap < 1 ? 0 : 0)} y={(kap < 1 ? karis(1500, 1270, kap) : karis(1270, 1180, kac)) - 150} s={0.6} />}
      {kac > 0 && kac < 1 && <Hiz x={karis(380, -360, kac) + 150} y={1120} yon={1} />}
    </g>
  );
};

const Gunbatimi: React.FC<{t: number}> = ({t}) => {
  const omuz = gir(t, O.omuz, 0.8);
  const sasir = t >= O.sasir;
  const goz = arada(t, O.goz, O.goz + 0.5);
  const dedeK = agiz(t, ['D']);
  const ezgiK = agiz(t, ['E']);
  const yakin = gir(t, ss(22) - 0.3, 1.5);
  return (
    <g transform={`translate(540,1100) scale(${1 + yakin * 0.12}) translate(-540,-1100)`}>
      <Manzara t={t} gunbatimi={1} />
      <Ordek x={karis(140, 260, Math.min(1, (t - ss(20)) / 6))} y={1040} s={0.8} t={t} reis kirp={goz} />
      {goz && <Yazi x={300} y={860} u={zipla(t, O.goz, 0.3)} boy={70} renk="#fff">✦</Yazi>}
      {/* bank */}
      <path d="M 170 1420 L 930 1420 L 930 1460 L 170 1460 Z M 200 1460 L 200 1620 M 900 1460 L 900 1620" fill="#6b4a32" {...M} />
      <path d="M 160 1240 L 940 1240 L 940 1280 L 160 1280 Z" fill="#7a5132" {...M} />
      <g transform="translate(700,1200)">
        <DedeGovde alt />
        <g transform="translate(0,-110)"><DedeBas t={t} yuz={sasir ? 'gul' : 'ciddi'} konus={dedeK} bak={sasir ? -0.6 : 0} /></g>
      </g>
      <g transform={`translate(${karis(400, 470, omuz)},${1210 + omuz * 10})`}>
        <EzgiGovde alt />
        <g transform={`translate(${omuz * 40 * (sasir ? 0.2 : 1)},${-112 + omuz * 20 * (sasir ? 0 : 1)})`}>
          <EzgiBas t={t} yuz={sasir ? 'sasir' : omuz > 0.5 ? 'kapali' : 'gul'} konus={ezgiK} egim={sasir ? 0 : omuz * 22} bak={sasir ? 1 : 0} />
        </g>
      </g>
      {sasir && <Yazi x={420} y={880} u={zipla(t, O.sasir, 0.3)} boy={100} renk={C.kirmizi}>?!</Yazi>}
    </g>
  );
};

const Kapanis: React.FC<{t: number; bas: number}> = ({t, bas}) => {
  const u = (x: number) => zipla(t, bas + x, 0.45);
  return (
    <g>
      <rect width={1080} height={1920} fill={C.kagit} />
      <Ordek x={540} y={1020} s={1.6} t={t} reis gul kanat={0.4} su={false} />
      <Yazi x={540} y={520} u={u(0)} boy={96}>Dede & torun günümüz</Yazi>
      <Yazi x={540} y={1260} u={u(0.4)} boy={84} renk={C.kirmizi}>Bölüm 2: Reis'in borcu</Yazi>
      <Yazi x={540} y={1400} u={u(0.8)} boy={64}>Devamı için takip et</Yazi>
    </g>
  );
};

// sahne yakınlığı: [ölçek, merkez x, merkez y] — karakterler kareyi doldursun
const YAKIN: Record<string, [number, number, number]> = {araba: [1.32, 540, 760], ekmek: [1.22, 540, 860], cay: [1.28, 540, 980],
  simit: [1.28, 540, 980], gunbatimi: [1.18, 540, 1120]};
const SAHNE: Record<string, React.FC<{t: number; bas: number}>> = {
  araba: Araba, ekmek: EkmekKrizi, gol: Gol, cay: Cay, selfie: Selfie, simit: SimitHirsizi, gunbatimi: Gunbatimi, kapanis: Kapanis,
};

// altyazı: konuşma beyaz, iç ses sarı italik; ilk satır üstte TikTok başlığı
const Altyazi: React.FC<{t: number; ust?: boolean}> = ({t, ust}) => {
  const st = SAT.find((x) => x.k !== 'P' && x.c !== 0 && t >= x.s - 0.1 && t <= x.e + 0.35);
  if (!st) return null;
  const ic = st.k === 'I';
  const kelimeler = K.filter((k) => k.c === st.c);
  return (
    <div style={{position: 'absolute', left: 50, right: 50, top: ust ? 260 : 1560, textAlign: 'center', fontFamily: `${EL}, sans-serif`,
      fontSize: ic ? 70 : 78, lineHeight: 1.15, fontStyle: ic ? 'italic' : 'normal'}}>
      {kelimeler.map((k, i) => (
        <span key={i} style={{color: t >= k.s - 0.03 ? (ic ? '#ffd84a' : '#fff') : 'rgba(255,255,255,.35)',
          WebkitTextStroke: '9px #2b1f17', paintOrder: 'stroke fill'}}>{k.w.replace(/["“”]/g, '"')} </span>
      ))}
    </div>
  );
};
const Baslik: React.FC<{t: number}> = ({t}) => {
  const ilk = olay.sahneler[0];
  if (t > ilk.son) return null;
  const u = zipla(t, 0.1, 0.4);
  return (
    <div style={{position: 'absolute', left: 0, right: 0, top: 120, textAlign: 'center', transform: `scale(${u})`}}>
      <span style={{background: '#fff', color: '#111', fontFamily: `${EL}, sans-serif`, fontSize: 60, padding: '10px 26px', borderRadius: 14,
        boxShadow: '0 6px 0 #2b1f17'}}>Dedemle ördekleri görmeye gidiyoruz</span>
    </div>
  );
};

const Video: React.FC = () => {
  const kare = useCurrentFrame();
  const t = kare / FPS;
  const i = olay.sahneler.findIndex((x) => t >= x.bas && t < x.son);
  const sh = olay.sahneler[i < 0 ? olay.sahneler.length - 1 : i];
  const Sahne = SAHNE[sh.ad];
  const gecis = interpolate(t, [sh.bas, sh.bas + 0.25], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const kapat = interpolate(t, [SON - 0.5, SON], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  return (
    <AbsoluteFill style={{background: C.kagit}}>
      <svg width={1080} height={1920} viewBox="0 0 1080 1920">
        <defs>
          <filter id="kalem" x="-5%" y="-5%" width="110%" height="110%">
            <feTurbulence type="fractalNoise" baseFrequency="0.018" numOctaves={2} seed={Math.floor(kare / 4) % 5} result="g" />
            <feDisplacementMap in="SourceGraphic" in2="g" scale={4} />
          </filter>
          <filter id="gren"><feTurbulence type="fractalNoise" baseFrequency="0.75" numOctaves={3} seed={7} /><feColorMatrix values="0 0 0 0 0.23  0 0 0 0 0.17  0 0 0 0 0.12  0 0 0 0.14 0" /></filter>
          <radialGradient id="vinyet" cx="0.5" cy="0.45" r="0.75"><stop offset="0.5" stopColor="#2b1d12" stopOpacity="0" /><stop offset="1" stopColor="#2b1d12" stopOpacity="0.55" /></radialGradient>
        </defs>
        <g filter="url(#kalem)"><g transform={`translate(${YAKIN[sh.ad]?.[1] ?? 540},${YAKIN[sh.ad]?.[2] ?? 960}) scale(${YAKIN[sh.ad]?.[0] ?? 1}) translate(${-(YAKIN[sh.ad]?.[1] ?? 540)},${-(YAKIN[sh.ad]?.[2] ?? 960)})`}><Sahne t={t} bas={sh.bas} /></g></g>
        <rect width={1080} height={1920} filter="url(#gren)" />
        <rect width={1080} height={1920} fill="url(#vinyet)" />
        <rect width={1080} height={1920} fill={C.kagit} opacity={i > 0 ? gecis : 0} />
      </svg>
      <Baslik t={t} />
      <Altyazi t={t} ust={sh.ad === 'gol'} />
      <div style={{position: 'absolute', bottom: 46, width: '100%', textAlign: 'center', fontFamily: `${EL}, sans-serif`, fontSize: 30,
        letterSpacing: 3, color: 'rgba(255,248,230,.75)'}}>Antik Stüdyo</div>
      <AbsoluteFill style={{background: '#000', opacity: kapat}} />
    </AbsoluteFill>
  );
};

export const Root: React.FC = () => (
  <Composition id="EzgiDede" component={Video} durationInFrames={Math.ceil(SON * FPS)} fps={FPS} width={1080} height={1920} />
);
