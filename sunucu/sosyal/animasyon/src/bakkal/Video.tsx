// "Bakkal": İstanbul'da bakkal arayan Elif. Çizim dili "Keskin balta" örneği: eski kâğıt, sepya, titrek mürekkep,
// ince bacaklı çubuk karakterler, el yazısı. Görsellerin tamamı SVG koddur; yapay zekâ görseli yok.
import React from 'react';
import {AbsoluteFill, Audio, Composition, Easing, interpolate, staticFile, useCurrentFrame} from 'remotion';
import {loadFont} from '@remotion/fonts';
import veri from '../../public/bakkal/kelimeler.json';

const EL = 'ElYazisi';
loadFont({family: EL, url: staticFile('fonts/patrick-hand-latin-400-normal.woff2'), weight: '400', unicodeRange: 'U+0000-00FF'});
loadFont({family: EL, url: staticFile('fonts/patrick-hand-latin-ext-400-normal.woff2'), weight: '400', unicodeRange: 'U+0100-024F, U+1E00-1EFF'});

type Kelime = {w: string; s: number; e: number; c: number};
const K = veri as Kelime[];
const FPS = 30;
const SON = K[K.length - 1].e + 1.6;
const an = (satir: number, kelime = 0) => {
  const l = K.filter((k) => k.c === satir);
  return (l[Math.min(kelime, l.length - 1)] ?? l[0]).s;
};
const anSon = (satir: number) => { const l = K.filter((k) => k.c === satir); return l[l.length - 1].e; };
const kelimeAn = (satir: number, bas: string) => (K.find((k) => k.c === satir && k.w.toLocaleLowerCase('tr-TR').startsWith(bas)) ?? K.filter((k) => k.c === satir)[0]).s;
const gir = (t: number, t0: number, sure = 0.8) =>
  interpolate(t, [t0, t0 + sure], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.bezier(0.45, 0, 0.55, 1)});
const zipla = (t: number, t0: number, sure = 0.4) =>
  interpolate(t, [t0, t0 + sure * 0.6, t0 + sure], [0, 1.15, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
const karis = (a: number, b: number, u: number) => a + (b - a) * u;

// ---- palet (örnekteki gibi soluk değil, sıcak sepya)
const C = {
  kagit: '#eadcbc', kagit2: '#e2d1ab', mur: '#3b2d22', tepe1: '#d3c49f', tepe2: '#c4b38b', tepe3: '#b4a37c',
  agac: '#a9aa83', agac2: '#959a72', govde: '#7d6248', ten: '#f3e6cf', sari: '#f2c94c', sari2: '#d9a92e', mavi: '#4f8fd6',
  kirmizi: '#c2493b', yesil: '#6f9a5b', lacivert: '#3f5a86', turuncu: '#e0953f', tas: '#8c8578', ahsap: '#9b6b43', ahsap2: '#7a5132',
  ekmek: '#d89a4e', beyaz: '#f7f0df', kazak: '#c9744a', etek: '#5d7fa8',
};
const M = {stroke: C.mur, strokeWidth: 4.5, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const};
const ODA = 1080;
const ZEMIN = 1340;

// ---- ortam parçaları
const Bulut: React.FC<{x: number; y: number; s?: number}> = ({x, y, s = 1}) => (
  <path transform={`translate(${x},${y}) scale(${s})`} d="M -70 0 Q -78 -30 -46 -34 Q -36 -62 -4 -54 Q 18 -76 44 -52 Q 78 -56 74 -22 Q 96 -8 74 4 Z" fill="#f6efdf" {...M} strokeWidth={3.5} />
);
const Kus: React.FC<{x: number; y: number; t: number}> = ({x, y, t}) => (
  <path transform={`translate(${x + Math.sin(t * 0.7 + x) * 20},${y})`} d={`M -12 0 Q -6 ${-6 - Math.sin(t * 8 + x) * 4} 0 0 Q 6 ${-6 - Math.sin(t * 8 + x) * 4} 12 0`} fill="none" {...M} strokeWidth={3} />
);
const Ot: React.FC<{x: number; y: number}> = ({x, y}) => (
  <path transform={`translate(${x},${y})`} d="M -10 0 L -14 -22 M -4 0 L -4 -28 M 3 0 L 8 -24 M 9 0 L 16 -16" fill="none" {...M} strokeWidth={2.5} />
);
const Agac: React.FC<{x: number; y: number; s?: number}> = ({x, y, s = 1}) => (
  <g transform={`translate(${x},${y}) scale(${s})`}>
    <path d="M -6 0 L -4 -70 M 6 0 L 4 -70" {...M} />
    <path d="M -64 -80 Q -84 -130 -40 -150 Q -30 -200 18 -186 Q 70 -196 72 -140 Q 100 -110 64 -76 Q 30 -60 0 -70 Q -40 -56 -64 -80 Z" fill={C.agac} {...M} />
    <path d="M -30 -120 l 8 -4 M 20 -150 l 8 -4 M 30 -100 l 8 -4" {...M} strokeWidth={2.5} />
  </g>
);
const Tepeler: React.FC<{renk: string; y: number; dalga: number; faz?: number}> = ({renk, y, dalga, faz = 0}) => {
  let d = `M -40 ${y}`;
  for (let x = -40; x <= ODA + 40; x += 120) d += ` Q ${x + 60} ${y - dalga * (0.6 + 0.4 * Math.sin(x * 0.01 + faz))} ${x + 120} ${y}`;
  return <path d={d + ` L ${ODA + 40} ${ZEMIN} L -40 ${ZEMIN} Z`} fill={renk} {...M} strokeWidth={3} />;
};
const Kaldirim: React.FC = () => (
  <g>
    <rect x={-20} y={ZEMIN} width={ODA + 40} height={600} fill={C.kagit2} />
    <path d={`M -20 ${ZEMIN} L ${ODA + 20} ${ZEMIN}`} {...M} />
    <path d={`M -20 ${ZEMIN + 26} L ${ODA + 20} ${ZEMIN + 26}`} {...M} strokeWidth={2.5} />
    {Array.from({length: 16}).map((_, i) => <ellipse key={i} cx={(i % 8) * 140 + (Math.floor(i / 8) % 2) * 70 + 40} cy={ZEMIN + 120 + Math.floor(i / 8) * 130} rx={40} ry={12} fill="none" {...M} strokeWidth={2.5} opacity={0.6} />)}
    {[120, 520, 880].map((x) => <Ot key={x} x={x} y={ZEMIN + 260} />)}
  </g>
);
const Silüet: React.FC<{x: number; y: number; s?: number}> = ({x, y, s = 1}) => (
  <g transform={`translate(${x},${y}) scale(${s})`} fill={C.tepe3} {...M} strokeWidth={3}>
    <path d="M -260 0 L -260 -60 Q -200 -150 -140 -60 L -140 0 Z" />
    <path d="M -300 0 L -296 -170 L -290 -190 L -284 -170 L -280 0 Z" /><path d="M -120 0 L -116 -160 L -110 -180 L -104 -160 L -100 0 Z" />
    <path d="M -60 0 L -60 -90 Q 30 -230 120 -90 L 120 0 Z" /><path d="M 30 -170 L 30 -200" />
    <path d="M -90 0 L -86 -200 L -80 -224 L -74 -200 L -70 0 Z" /><path d="M 150 0 L 154 -200 L 160 -224 L 166 -200 L 170 0 Z" />
    <path d="M 240 0 L 240 -190 L 230 -200 L 262 -250 L 294 -200 L 284 -190 L 284 0 Z" />
  </g>
);
const Market: React.FC<{x: number; renk: string; isik?: number}> = ({x, renk, isik = 0}) => (
  <g transform={`translate(${x},${ZEMIN})`}>
    <rect x={-210} y={-520} width={420} height={520} fill="#e9dfc9" {...M} />
    <rect x={-230} y={-560} width={460} height={78} rx={6} fill={renk} {...M} />
    <text x={0} y={-506} textAnchor="middle" fontFamily={EL} fontSize={58} fill={C.beyaz} letterSpacing={4}>MARKET</text>
    {[-1, 1].map((k) => <rect key={k} x={k < 0 ? -186 : 30} y={-430} width={156} height={250} fill="#cfe0dc" {...M} />)}
    {[-1, 1].map((k) => [0, 1, 2].map((r) => <path key={`${k}${r}`} d={`M ${k < 0 ? -180 : 36} ${-380 + r * 70} L ${k < 0 ? -36 : 180} ${-380 + r * 70}`} {...M} strokeWidth={3} />))}
    <rect x={-60} y={-170} width={120} height={170} fill="#cfe0dc" {...M} />
    {isik > 0 && <rect x={-240} y={-570} width={480} height={98} rx={10} fill="none" stroke={C.kirmizi} strokeWidth={8} opacity={isik} />}
  </g>
);
const Ev: React.FC<{x: number; y: number; renk: string; h?: number}> = ({x, y, renk, h = 460}) => (
  <g transform={`translate(${x},${y})`}>
    <rect x={-120} y={-h} width={240} height={h} fill={renk} {...M} />
    <path d={`M -140 ${-h} L 0 ${-h - 90} L 140 ${-h} Z`} fill="#a8644a" {...M} />
    <rect x={-90} y={-h + 60} width={180} height={120} fill="#e9dfc9" {...M} /><path d={`M 0 ${-h + 60} L 0 ${-h + 180} M -90 ${-h + 120} L 90 ${-h + 120}`} {...M} strokeWidth={3} />
    <path d={`M -100 ${-h + 200} L 100 ${-h + 200} L 80 ${-h + 236} L -80 ${-h + 236} Z`} fill={C.ahsap} {...M} strokeWidth={3} />
    <rect x={-40} y={-140} width={80} height={140} fill={C.ahsap2} {...M} />
  </g>
);
const Kedi: React.FC<{x: number; y: number; t: number; s?: number}> = ({x, y, t, s = 1}) => (
  <g transform={`translate(${x},${y}) scale(${s})`}>
    <path d="M -30 0 Q -34 -40 0 -40 Q 30 -40 30 0 Z" fill="#c98a4b" {...M} />
    <circle cx={22} cy={-50} r={18} fill="#c98a4b" {...M} />
    <path d="M 10 -64 L 12 -78 L 22 -66 M 26 -66 L 36 -78 L 36 -62" fill="#c98a4b" {...M} strokeWidth={3} />
    <path d={`M -30 -6 Q -60 ${-20 + Math.sin(t * 3) * 12} -52 -46`} fill="none" {...M} />
    <circle cx={18} cy={-52} r={2.5} fill={C.mur} /><circle cx={28} cy={-52} r={2.5} fill={C.mur} />
  </g>
);
const Ekmek: React.FC<{x: number; y: number; s?: number; aci?: number}> = ({x, y, s = 1, aci = 0}) => (
  <g transform={`translate(${x},${y}) rotate(${aci}) scale(${s})`}>
    <path d="M -70 0 Q -74 -30 -40 -32 L 40 -32 Q 74 -30 70 0 Q 66 14 40 14 L -40 14 Q -66 14 -70 0 Z" fill={C.ekmek} {...M} />
    <path d="M -36 -26 l 14 22 M -8 -28 l 14 22 M 20 -28 l 14 22" {...M} strokeWidth={3} />
  </g>
);
const Sakiz: React.FC<{x: number; y: number; s?: number}> = ({x, y, s = 1}) => (
  <g transform={`translate(${x},${y}) scale(${s})`}>
    <rect x={-26} y={-16} width={52} height={32} rx={6} fill="#e98aa6" {...M} />
    <path d="M -16 0 L 16 0" stroke={C.beyaz} strokeWidth={5} strokeLinecap="round" />
  </g>
);
const Balon: React.FC<{x: number; y: number; w: number; h: number; u: number; children?: React.ReactNode; kuyruk?: number}> = ({x, y, w, h, u, children, kuyruk = 0}) =>
  u <= 0 ? null : (
    <g transform={`translate(${x},${y}) scale(${Math.min(1, u * 1.1)})`} opacity={Math.min(1, u * 1.5)}>
      <ellipse cx={0} cy={0} rx={w / 2} ry={h / 2} fill="#f6efdf" {...M} />
      <circle cx={kuyruk - 30} cy={h / 2 + 30} r={16} fill="#f6efdf" {...M} />
      <circle cx={kuyruk - 50} cy={h / 2 + 66} r={9} fill="#f6efdf" {...M} />
      {children}
    </g>
  );
const Kalp: React.FC<{x: number; y: number; u: number}> = ({x, y, u}) => u <= 0 || u >= 1 ? null : (
  <path transform={`translate(${x},${y - u * 140}) scale(${0.6 + u * 0.6})`} opacity={1 - u} d="M 0 10 Q -30 -16 -16 -28 Q -4 -36 0 -22 Q 4 -36 16 -28 Q 30 -16 0 10 Z" fill={C.kirmizi} {...M} strokeWidth={3} />
);

// ---- çubuk karakter (örnekteki gibi: yuvarlak baş, ince uzun bacak)
type Kisi = {x: number; y: number; s?: number; t: number; adim?: number; yon?: 1 | -1; kiz?: boolean; amca?: boolean;
  yuz?: 'gul' | 'sasir' | 'uzgun' | 'esne' | 'mutlu'; sagKol?: number; solKol?: number; otur?: number; uzan?: number; elde?: React.ReactNode; bas?: number};
const Kisi: React.FC<Kisi> = (p) => {
  const s = p.s ?? 1, yon = p.yon ?? 1, otur = p.otur ?? 0;
  const ad = p.adim ?? 0; // yürüme fazı (0 = durur)
  const sal = Math.sin(ad) * 30 * (ad ? 1 : 0);
  const nefes = Math.sin(p.t * 2.2 + p.x * 0.01) * 2;
  const kirp = (p.t * 0.8 + p.x * 0.001) % 3.4 < 0.1 ? 0.1 : 1;
  const BOY = 250; // bacak
  const kalca = -BOY * (1 - otur * 0.45);
  const bacak = (aci: number, k: number) => {
    if (otur > 0.5) return <path d={`M ${k * 10} ${kalca} L ${k * 10 + 90} ${kalca} L ${k * 10 + 96} 0`} fill="none" {...M} strokeWidth={5} />;
    const r = (aci * Math.PI) / 180;
    return <path d={`M ${k * 10} ${kalca} L ${k * 10 + Math.sin(r) * BOY * 0.5} ${kalca + Math.cos(r) * BOY * 0.5} L ${k * 10 + Math.sin(r) * BOY * 0.9} 0`} fill="none" {...M} strokeWidth={5} />;
  };
  const kol = (aci: number, k: number) => {
    const r = (aci * Math.PI) / 180;
    return <path d={`M ${k * 34} ${kalca - 140} L ${k * 34 + Math.sin(r) * k * 70} ${kalca - 140 + Math.cos(r) * 70} L ${k * 34 + Math.sin(r) * k * 130} ${kalca - 140 + Math.cos(r) * 130}`} fill="none" {...M} strokeWidth={5} />;
  };
  const govdeR = p.kiz ? C.kazak : p.amca ? '#efe6d0' : C.lacivert;
  return (
    <g transform={`translate(${p.x},${p.y}) scale(${s * yon},${s})`}>
      {bacak(sal, -1)}{bacak(-sal, 1)}
      <g transform={`translate(0,${nefes})`}>
        {kol(p.solKol ?? (ad ? -sal * 0.8 : 10), -1)}
        {p.kiz
          ? <path d={`M -38 ${kalca - 170} L 38 ${kalca - 170} L 50 ${kalca + 10} L -50 ${kalca + 10} Z`} fill={govdeR} {...M} />
          : <rect x={-36} y={kalca - 170} width={72} height={175} rx={10} fill={govdeR} {...M} />}
        {p.kiz && <path d={`M -50 ${kalca - 20} L 50 ${kalca - 20} L 58 ${kalca + 30} L -58 ${kalca + 30} Z`} fill={C.etek} {...M} />}
        {p.amca && <g><rect x={-30} y={kalca - 120} width={60} height={130} rx={6} fill={C.beyaz} {...M} strokeWidth={3} /><path d={`M -36 ${kalca - 170} L -36 ${kalca} M 36 ${kalca - 170} L 36 ${kalca}`} stroke={C.ahsap} strokeWidth={10} /></g>}
        {p.kiz && [0, 1, 2].map((i) => <path key={i} d={`M -30 ${kalca - 140 + i * 40} L 30 ${kalca - 140 + i * 40}`} stroke="#b3603b" strokeWidth={4} />)}
        {kol(p.sagKol ?? (ad ? sal * 0.8 : 10), 1)}
        {p.elde}
        <g transform={`translate(0,${kalca - 236}) rotate(${p.bas ?? 0})`}>
          {p.kiz && <path d="M -56 -10 Q -66 -80 0 -82 Q 66 -80 56 -10 L 64 110 Q 40 96 40 60 L 46 -6 Q 0 -40 -46 -6 L -40 60 Q -40 96 -64 110 Z" fill={C.sari} {...M} />}
          <circle r={56} fill={C.ten} {...M} />
          {p.kiz && <path d="M -54 -14 Q -40 -70 0 -66 Q 40 -70 54 -14 Q 30 -44 4 -40 Q -22 -46 -54 -14 Z" fill={C.sari} {...M} strokeWidth={3.5} />}
          {p.amca && <g><path d="M -60 -26 Q -50 -78 6 -74 Q 60 -72 64 -30 Z" fill={C.ahsap2} {...M} /><path d="M 40 -30 L 80 -24" {...M} strokeWidth={6} /></g>}
          {/* gözler: kızda renkli (mavi) iris */}
          {p.kiz ? (
            <g transform={`scale(1,${p.yuz === 'esne' ? 0.2 : kirp})`}>
              {[-20, 22].map((gx) => <g key={gx}><ellipse cx={gx} cy={-4} rx={11} ry={13} fill="#fff" {...M} strokeWidth={2.5} /><circle cx={gx + 2} cy={-2} r={7} fill={C.mavi} /><circle cx={gx + 3} cy={-3} r={3} fill={C.mur} /><circle cx={gx + 5} cy={-6} r={1.8} fill="#fff" /></g>)}
              <path d="M -32 -18 l -6 -6 M 34 -18 l 6 -6" {...M} strokeWidth={2.5} />
            </g>
          ) : (
            <g transform={`scale(1,${kirp})`}><circle cx={-18} cy={-4} r={5} fill={C.mur} /><circle cx={18} cy={-4} r={5} fill={C.mur} /></g>
          )}
          {p.amca && <g fill="none" {...M} strokeWidth={3}><circle cx={-18} cy={-4} r={14} /><circle cx={18} cy={-4} r={14} /><path d="M -4 -4 L 4 -4" /></g>}
          {p.amca && <path d="M -30 22 Q -16 10 0 20 Q 16 10 30 22 Q 14 32 0 26 Q -14 32 -30 22 Z" fill={C.ahsap2} {...M} strokeWidth={3} />}
          {p.yuz === 'sasir' ? <ellipse cx={0} cy={30} rx={9} ry={12} fill={C.mur} />
            : p.yuz === 'uzgun' ? <path d="M -16 34 Q 0 24 16 34" fill="none" {...M} />
            : p.yuz === 'esne' ? <ellipse cx={0} cy={30} rx={14} ry={18} fill={C.mur} />
            : p.yuz === 'mutlu' ? <path d="M -20 22 Q 0 44 20 22 Z" fill={C.mur} {...M} strokeWidth={3} />
            : <path d="M -16 26 Q 0 38 16 26" fill="none" {...M} />}
          {p.kiz && <g><circle cx={-34} cy={18} r={8} fill="#e9a19a" opacity={0.6} /><circle cx={34} cy={18} r={8} fill="#e9a19a" opacity={0.6} /></g>}
        </g>
      </g>
    </g>
  );
};

// ---- Elif'in yolu (dünya koordinatı)
type Nokta = {t: number; x: number; y: number};
const yol = (): Nokta[] => [
  {t: 0, x: ODA * 1 + 500, y: ZEMIN - 40},
  {t: an(3, 0) - 0.1, x: ODA * 1 + 560, y: ZEMIN},
  {t: an(3, 2), x: ODA * 2 + 470, y: ZEMIN},           // sokağa çıkar, ilk market
  {t: an(4, 0) - 0.1, x: ODA * 2 + 470, y: ZEMIN},
  {t: an(4, 3), x: ODA * 3 + 470, y: ZEMIN},           // ikinci market
  {t: an(5, 0) - 0.1, x: ODA * 3 + 470, y: ZEMIN},
  {t: an(5, 2), x: ODA * 4 + 470, y: ZEMIN},           // üçüncü market
  {t: an(6, 0), x: ODA * 4 + 470, y: ZEMIN},
  {t: kelimeAn(6, 'merdiven'), x: ODA * 5 + 560, y: ZEMIN - 380}, // yokuş çıkar
  {t: kelimeAn(6, 'ara'), x: ODA * 5 + 940, y: ZEMIN},           // merdiven iner
  {t: anSon(6) + 0.3, x: ODA * 6 + 300, y: ZEMIN},               // ara sokak
  {t: an(9, 0) - 0.3, x: ODA * 6 + 300, y: ZEMIN},
  {t: an(9, 2), x: ODA * 7 + 360, y: ZEMIN},                     // bakkala girer
  {t: an(12, 0), x: ODA * 7 + 360, y: ZEMIN},
];
const elif = (t: number) => {
  const p = yol();
  for (let i = 1; i < p.length; i++) {
    if (t <= p[i].t) {
      const a = p[i - 1], b = p[i];
      const u = b.t > a.t ? Math.min(1, Math.max(0, (t - a.t) / (b.t - a.t))) : 1;
      const yuru = Math.abs(b.x - a.x) > 5 && u > 0 && u < 1;
      return {x: karis(a.x, b.x, u), y: karis(a.y, b.y, u), yuru, yon: (b.x >= a.x ? 1 : -1) as 1 | -1};
    }
  }
  const l = p[p.length - 1];
  return {x: l.x, y: l.y, yuru: false, yon: 1 as 1 | -1};
};

// ---- mekânlar
const Gokyuzu: React.FC<{t: number; i: number}> = ({t, i}) => (
  <g>
    <rect x={-20} y={0} width={ODA + 40} height={ZEMIN} fill={C.kagit} />
    <Bulut x={200 + ((i * 97) % 300)} y={300 + (i % 3) * 40} s={0.9} />
    <Bulut x={760 - ((i * 53) % 200)} y={240 + (i % 2) * 60} s={0.7} />
    <Kus x={420 + i * 7} y={200} t={t} /><Kus x={470 + i * 5} y={230} t={t + 1} />
  </g>
);
const Giris: React.FC<{t: number}> = ({t}) => {
  // her köşede market: tabelalar tek tek belirir
  const renk = [C.yesil, C.kirmizi, C.lacivert, C.turuncu, C.yesil, C.kirmizi];
  return (
    <g>
      <Gokyuzu t={t} i={0} />
      <Tepeler renk={C.tepe1} y={900} dalga={120} />
      <Silüet x={560} y={900} s={1.15} />
      <Tepeler renk={C.tepe2} y={1080} dalga={60} faz={2} />
      {renk.map((r, k) => {
        const u = zipla(t, an(0, Math.min(k, 6)) + k * 0.12, 0.35);
        const x = 110 + k * 172, y = ZEMIN - (k % 2) * 26;
        return u <= 0 ? null : <g key={k} transform={`translate(${x},${y}) scale(${u * 0.78})`}>
          <rect x={-120} y={-200} width={240} height={200} fill="#e9dfc9" {...M} strokeWidth={8} />
          <rect x={-136} y={-240} width={272} height={60} rx={6} fill={r} {...M} strokeWidth={8} />
          <text y={-196} textAnchor="middle" fontFamily={EL} fontSize={48} fill={C.beyaz}>MARKET</text>
        </g>;
      })}
      <Kaldirim />
    </g>
  );
};
const Oda: React.FC<{t: number}> = ({t}) => {
  const gun = gir(t, an(2, 0) - 0.6, 1.6);
  return (
    <g>
      <rect x={-20} y={0} width={ODA + 40} height={ZEMIN} fill="#e6d4b0" />
      <path d="M -20 300 L 1100 300" {...M} strokeWidth={2.5} opacity={0.5} />
      {/* pencere: güneş doğar */}
      <rect x={560} y={420} width={360} height={420} fill="#f3e3b8" {...M} />
      <clipPath id="pencere"><rect x={560} y={420} width={360} height={420} /></clipPath>
      <g clipPath="url(#pencere)">
        <circle cx={740} cy={karis(900, 640, gun)} r={70} fill="#f1b84a" {...M} />
        <Silüet x={760} y={850} s={0.55} />
      </g>
      <path d="M 740 420 L 740 840 M 560 630 L 920 630" {...M} />
      <path d="M 540 410 Q 600 520 560 840 M 940 410 Q 880 520 920 840" fill="none" stroke={C.kirmizi} strokeWidth={14} opacity={0.6} />
      {/* yatak */}
      <rect x={200} y={ZEMIN - 170} width={440} height={130} rx={14} fill="#d9c7a3" {...M} />
      <rect x={190} y={ZEMIN - 270} width={40} height={230} rx={10} fill={C.ahsap} {...M} />
      <rect x={230} y={ZEMIN - 220} width={120} height={60} rx={24} fill={C.beyaz} {...M} />
      <path d={`M 330 ${ZEMIN - 170} Q 480 ${ZEMIN - 200} 640 ${ZEMIN - 170} L 640 ${ZEMIN - 100} L 330 ${ZEMIN - 100} Z`} fill={C.etek} {...M} />
      <rect x={-20} y={ZEMIN} width={ODA + 40} height={600} fill="#cdb48c" />
      <path d={`M -20 ${ZEMIN} L ${ODA + 20} ${ZEMIN}`} {...M} />
      {/* kapı (sağda) */}
      <rect x={950} y={ZEMIN - 520} width={130} height={520} fill={C.ahsap} {...M} />
      <circle cx={975} cy={ZEMIN - 260} r={9} fill={C.sari2} {...M} strokeWidth={3} />
    </g>
  );
};
const Sokak: React.FC<{t: number; i: number; renk: string; isik: number}> = ({t, i, renk, isik}) => (
  <g>
    <Gokyuzu t={t} i={i} />
    <Tepeler renk={C.tepe1} y={860} dalga={60} faz={i} />
    <Ev x={150} y={ZEMIN} renk="#d7a979" h={520} />
    <Market x={640} renk={renk} isik={isik} />
    <Agac x={980} y={ZEMIN} s={1.1} />
    <Kaldirim />
    {i === 3 && <Kedi x={900} y={ZEMIN} t={t} />}
  </g>
);
const Yokus: React.FC<{t: number}> = ({t}) => {
  const basamak = Array.from({length: 7});
  return (
    <g>
      <Gokyuzu t={t} i={5} />
      <Tepeler renk={C.tepe1} y={820} dalga={80} faz={5} />
      <Ev x={180} y={ZEMIN - 120} renk="#c99a72" h={560} />
      <Ev x={880} y={ZEMIN - 80} renk="#d9b48a" h={600} />
      {/* yokuş + merdiven: sol aşağıdan tepeye, tepeden sağa merdivenle iniş */}
      <path d={`M -20 ${ZEMIN} L 560 ${ZEMIN - 380} L 560 ${ZEMIN + 600} L -20 ${ZEMIN + 600} Z`} fill={C.kagit2} {...M} />
      {basamak.map((_, k) => <path key={k} d={`M ${560 + k * 56} ${ZEMIN - 380 + k * 54} L ${616 + k * 56} ${ZEMIN - 380 + k * 54} L ${616 + k * 56} ${ZEMIN - 326 + k * 54}`} fill="none" {...M} />)}
      <path d={`M 560 ${ZEMIN - 380} L 940 ${ZEMIN} L 1100 ${ZEMIN} L 1100 ${ZEMIN + 600} L 560 ${ZEMIN + 600} Z`} fill={C.kagit2} />
      <path d={`M 940 ${ZEMIN} L 1100 ${ZEMIN}`} {...M} />
      {Array.from({length: 8}).map((_, k) => <ellipse key={k} cx={70 + k * 60} cy={ZEMIN - 30 - k * 46} rx={22} ry={8} fill="none" {...M} strokeWidth={2.5} opacity={0.6} />)}
      <Kedi x={680} y={ZEMIN - 266} t={t} s={0.8} />
      <Kedi x={300} y={ZEMIN - 190} t={t + 1.3} s={0.7} />
      <g transform={`translate(${700 + Math.sin(t) * 60},${280 + Math.sin(t * 2) * 20})`}><path d={`M -40 0 Q -20 ${-20 - Math.sin(t * 7) * 8} 0 0 Q 20 ${-20 - Math.sin(t * 7) * 8} 40 0`} fill="none" {...M} strokeWidth={5} /></g>
    </g>
  );
};
const AraSokak: React.FC<{t: number}> = ({t}) => {
  const isik = gir(t, an(8, 0) - 0.1, 0.6);
  return (
    <g>
      <Gokyuzu t={t} i={6} />
      <Ev x={120} y={ZEMIN} renk="#bf9068" h={640} />
      <Ev x={420} y={ZEMIN} renk="#cfa77d" h={560} />
      {/* küçük bakkal tabelası: önce sönük, sonra ışır */}
      <g transform={`translate(800,${ZEMIN - 480})`}>
        <circle r={150} fill="#f6d27a" opacity={isik * 0.45} />
        <rect x={-130} y={-46} width={260} height={92} rx={8} fill={karis(0, 1, isik) > 0.5 ? '#f3d38a' : '#d8c9a8'} {...M} />
        <text y={26} textAnchor="middle" fontFamily={EL} fontSize={70} fill={C.mur}>BAKKAL</text>
      </g>
      <rect x={660} y={ZEMIN - 420} width={280} height={420} fill="#b98a5e" {...M} />
      <path d={`M 640 ${ZEMIN - 420} L 960 ${ZEMIN - 420} L 930 ${ZEMIN - 360} L 670 ${ZEMIN - 360} Z`} fill={C.kirmizi} {...M} />
      <rect x={700} y={ZEMIN - 330} width={200} height={330} fill="#e9dcc0" {...M} />
      {/* basamak */}
      <rect x={180} y={ZEMIN - 50} width={260} height={50} fill={C.tas} {...M} />
      <Kaldirim />
    </g>
  );
};
const BakkalIci: React.FC<{t: number}> = ({t}) => {
  const ver = gir(t, kelimeAn(10, 'ekmek') - 0.2, 0.7);
  return (
    <g>
      <rect x={-20} y={0} width={ODA + 40} height={ZEMIN} fill="#e2c99c" />
      {/* raflar, kavanozlar */}
      {[0, 1, 2].map((r) => <g key={r}><rect x={460} y={380 + r * 170} width={560} height={16} fill={C.ahsap2} {...M} />
        {Array.from({length: 6}).map((_, k) => <rect key={k} x={480 + k * 90} y={300 + r * 170} width={60} height={80} rx={10} fill={['#e0953f', '#c2493b', '#6f9a5b', '#f2c94c', '#4f8fd6', '#d89a4e'][(k + r) % 6]} {...M} strokeWidth={3} />)}</g>)}
      {/* ekmek sepeti */}
      <path d={`M 120 ${ZEMIN - 380} L 380 ${ZEMIN - 380} L 350 ${ZEMIN - 280} L 150 ${ZEMIN - 280} Z`} fill={C.ahsap} {...M} />
      {[0, 1, 2].map((k) => <Ekmek key={k} x={180 + k * 70} y={ZEMIN - 390 - (k % 2) * 16} s={0.6} aci={-20 + k * 18} />)}
      {/* tezgâh */}
      <rect x={500} y={ZEMIN - 300} width={520} height={300} fill={C.ahsap} {...M} />
      <rect x={480} y={ZEMIN - 320} width={560} height={30} fill={C.ahsap2} {...M} />
      <g transform={`translate(560,${ZEMIN - 340})`}>{[0, 1, 2].map((k) => <Sakiz key={k} x={k * 36} y={-k * 4} s={0.6} />)}</g>
      <rect x={-20} y={ZEMIN} width={ODA + 40} height={600} fill="#c9ad82" />
      <path d={`M -20 ${ZEMIN} L ${ODA + 20} ${ZEMIN}`} {...M} />
      <Kisi t={t} x={800} y={ZEMIN - 40} s={1.05} amca yon={-1} yuz="gul" sagKol={karis(10, -70, ver)} />
    </g>
  );
};

const MEKANLAR: React.FC<{t: number}>[] = [
  Giris, Oda,
  ({t}) => <Sokak t={t} i={2} renk={C.yesil} isik={gir(t, an(3, 3), 0.3) * (1 - gir(t, an(4, 0), 0.4))} />,
  ({t}) => <Sokak t={t} i={3} renk={C.kirmizi} isik={gir(t, an(4, 3), 0.3) * (1 - gir(t, an(5, 0), 0.4))} />,
  ({t}) => <Sokak t={t} i={4} renk={C.lacivert} isik={gir(t, an(5, 3), 0.3) * (1 - gir(t, an(6, 0), 0.4))} />,
  Yokus, AraSokak, BakkalIci,
];

// ---- kamera
const kamera = (t: number) => {
  const e = elif(t);
  const o = (i: number) => i * ODA + 540;
  type A = {t: number; d: number; x: number; y: number; z: number};
  const takip = {x: Math.min(Math.max(e.x + 60, o(2)), o(7)), y: 960, z: 1};
  const plan: A[] = [
    {t: 0, d: 0.01, x: o(0), y: 960, z: 1},
    {t: an(2, 0) - 0.4, d: 1.1, x: o(1), y: 960, z: 1},
    {t: kelimeAn(2, 'ekmek') - 0.3, d: 0.8, x: o(1) - 60, y: 900, z: 1.18},
    {t: an(3, 0) - 0.2, d: 0.9, x: o(1) + 200, y: 960, z: 1},
  ];
  let c = {x: plan[0].x, y: plan[0].y, z: plan[0].z};
  for (const a of plan) { if (t < a.t) break; const u = gir(t, a.t, a.d); c = {x: karis(c.x, a.x, u), y: karis(c.y, a.y, u), z: karis(c.z, a.z, u)}; }
  // sokağa çıkınca Elif'i takip
  const tk = gir(t, an(3, 0) + 0.2, 1.0);
  c = {x: karis(c.x, takip.x, tk), y: karis(c.y, karis(960, e.y - 360, gir(t, an(6, 0), 0.6) * (1 - gir(t, anSon(6), 0.6))), tk), z: c.z};
  // "Tam vazgeçecekken": yavaş yaklaş, dur
  const dur = gir(t, an(7, 0), 1.4) * (1 - gir(t, an(9, 0) - 0.2, 0.8));
  c = {x: c.x, y: karis(c.y, 1000, dur), z: karis(c.z, 1.15, dur)};
  // ders: geniş plan
  const ders = gir(t, an(11, 0) - 0.2, 1.4) * (1 - gir(t, an(12, 0) - 0.1, 1.0));
  c = {x: karis(c.x, o(7) - 40, ders), y: karis(c.y, 980, ders), z: karis(c.z, 1, ders)};
  return c;
};

// ---- ekran yazıları (dünyadan bağımsız)
const Sayac: React.FC<{t: number}> = ({t}) => {
  const gor = gir(t, an(1, 0), 0.6) * (1 - gir(t, an(6, 0), 0.6)) + gir(t, an(8, 2), 0.4) * (1 - gir(t, an(9, 0) + 0.6, 0.5));
  const market = Math.min(9, Math.floor(gir(t, an(0, 0), anSon(0) - an(0, 0)) * 9)) + [3, 4, 5].filter((s) => t >= an(s, 3)).length;
  const bakkal = t >= an(8, 2) ? 1 : 0;
  if (gor <= 0) return null;
  return (
    <g opacity={Math.min(1, gor)} fontFamily={EL}>
      <text x={290} y={330} textAnchor="middle" fontSize={50} fill={C.mur}>market</text>
      <text x={790} y={330} textAnchor="middle" fontSize={50} fill={C.mur}>bakkal</text>
      <text x={290} y={440} textAnchor="middle" fontSize={120} fill={C.mur}>{market}</text>
      <text x={790} y={440} textAnchor="middle" fontSize={120} fill={bakkal ? C.kirmizi : C.mur}>{bakkal}</text>
    </g>
  );
};
const BuyukYazi: React.FC<{t: number}> = ({t}) => {
  const ilk = 1 - gir(t, an(1, 0) - 0.1, 0.4);
  const d = gir(t, an(11, 0), 0.6), d2 = gir(t, kelimeAn(11, 'ama'), 0.6), cizgi = gir(t, kelimeAn(11, 'kalbi'), 0.6);
  return (
    <g fontFamily={EL}>
      {ilk > 0 && <g opacity={ilk}><text x={80} y={330} fontSize={92} fill={C.mur}>Her köşede</text>
        <text x={80} y={440} fontSize={92} fill={C.kirmizi}>bir market...</text></g>}
      {d > 0 && <g opacity={d}>
        <path d="M 70 210 Q 540 190 1010 214 L 1004 468 Q 540 486 76 462 Z" fill="#efe3c6" stroke={C.mur} strokeWidth={4} />
        <text x={540} y={310} textAnchor="middle" fontSize={84} fill={C.mur}>Market her köşede.</text>
        <text x={540} y={420} textAnchor="middle" fontSize={84} fill={C.kirmizi} opacity={d2}>Kalbi hâlâ bakkalda.</text>
        <path d={`M 230 446 Q 540 ${458 + Math.sin(t) * 2} ${karis(230, 850, cizgi)} 442`} fill="none" stroke={C.kirmizi} strokeWidth={6} strokeLinecap="round" opacity={cizgi > 0 ? 1 : 0} />
      </g>}
    </g>
  );
};

const Altyazi: React.FC<{t: number}> = ({t}) => {
  const aktif = K.filter((k) => k.s - 0.04 <= t).pop();
  if (!aktif) return null;
  return (
    <div style={{position: 'absolute', left: 70, right: 70, top: 1450, textAlign: 'center', fontFamily: `${EL}, sans-serif`, fontSize: 64, lineHeight: 1.2}}>
      {K.filter((k) => k.c === aktif.c).map((k, i) => (
        <span key={i} style={{opacity: t >= k.s - 0.04 ? 1 : 0, color: k === aktif ? '#ffd84a' : '#fff',
          WebkitTextStroke: '7px #2b1f17', paintOrder: 'stroke fill'}}>{k.w}{' '}</span>
      ))}
    </div>
  );
};

const Video: React.FC = () => {
  const kare = useCurrentFrame();
  const t = kare / FPS;
  const c = kamera(t);
  const e = elif(t);
  const adim = e.yuru ? t * 9 : 0;
  // Elif'in hâli satır satır
  const uyan = gir(t, kelimeAn(2, 'uyan'), 0.8);
  const yatakta = t < an(3, 0) - 0.1;
  const otur = t >= anSon(6) + 0.3 && t < an(8, 1) ? gir(t, anSon(6) + 0.3, 0.5) * (1 - gir(t, an(8, 1) - 0.3, 0.4)) : 0;
  const yuz: Kisi['yuz'] = t < kelimeAn(2, 'uyan') + 0.9 && t > kelimeAn(2, 'uyan') ? 'esne'
    : t >= an(10, 0) ? 'mutlu' : t >= an(8, 1) ? 'sasir' : t >= an(7, 0) ? 'uzgun' : t >= an(5, 3) && t < an(6, 0) ? 'uzgun' : 'gul';
  const sasirma = zipla(t, an(8, 1), 0.4) * (1 - gir(t, an(9, 0), 0.4));
  const al = gir(t, kelimeAn(10, 'ekmek'), 0.7);
  const sakiz = gir(t, kelimeAn(10, 'sakız'), 0.5);
  const elde = t >= kelimeAn(10, 'ekmek') + 0.5 ? (
    <g><Ekmek x={70} y={-300} s={0.75} aci={-30} />{sakiz > 0 && <Sakiz x={-70} y={-230} s={0.7 * sakiz} />}</g>) : null;
  const ekmekBalonu = gir(t, kelimeAn(2, 'ekmek') - 0.1, 0.5) * (1 - gir(t, an(3, 0), 0.4));
  const aynilik = gir(t, kelimeAn(5, 'hepsi') - 0.1, 0.5) * (1 - gir(t, an(6, 0), 0.4));
  const amcaBalon = gir(t, kelimeAn(9, 'ekmek') - 0.15, 0.4) * (1 - gir(t, an(10, 0) + 0.6, 0.4));
  const son = gir(t, an(12, 0), 0.8);
  // ışık: sabah serin bej → sonda sıcak turuncu (örnekteki gibi)
  const sicak = gir(t, an(9, 0), 6);
  return (
    <AbsoluteFill style={{background: C.kagit}}>
      <Audio src={staticFile('bakkal/ses.mp3')} />
      <svg width={1080} height={1920} viewBox="0 0 1080 1920">
        <defs>
          <filter id="kalem" x="-5%" y="-5%" width="110%" height="110%">
            <feTurbulence type="fractalNoise" baseFrequency="0.018" numOctaves={2} seed={Math.floor(kare / 4) % 5} result="g" />
            <feDisplacementMap in="SourceGraphic" in2="g" scale={4.5} />
          </filter>
          <filter id="gren"><feTurbulence type="fractalNoise" baseFrequency="0.75" numOctaves={3} seed={7} /><feColorMatrix values="0 0 0 0 0.23  0 0 0 0 0.17  0 0 0 0 0.12  0 0 0 0.16 0" /></filter>
          <filter id="leke"><feTurbulence type="fractalNoise" baseFrequency="0.004" numOctaves={3} seed={3} /><feColorMatrix values="0 0 0 0 0.45  0 0 0 0 0.33  0 0 0 0 0.2  0 0 0 0.22 0" /></filter>
          <radialGradient id="vinyet" cx="0.5" cy="0.45" r="0.72"><stop offset="0.45" stopColor="#2b1d12" stopOpacity="0" /><stop offset="1" stopColor="#2b1d12" stopOpacity="0.62" /></radialGradient>
        </defs>
        <g filter="url(#kalem)">
          <g transform={`translate(540,960) scale(${c.z}) translate(${-c.x},${-c.y})`}>
            {MEKANLAR.map((Mk, i) => Math.abs(c.x - (i * ODA + 540)) < ODA * 1.8 / c.z
              ? <g key={i} transform={`translate(${i * ODA},0)`}><Mk t={t} /></g> : null)}
            {/* Elif */}
            {yatakta
              ? <Kisi t={t} x={ODA + 500} y={ZEMIN - 40} s={1.0} kiz otur={1} yuz={uyan < 0.2 ? 'esne' : yuz} bas={karis(14, 0, uyan)}
                  sagKol={karis(10, 165, gir(t, kelimeAn(2, 'uyan') + 0.1, 0.6) * (1 - gir(t, an(2, 6), 0.5)))}
                  solKol={karis(10, 165, gir(t, kelimeAn(2, 'uyan') + 0.1, 0.6) * (1 - gir(t, an(2, 6), 0.5)))} />
              : <Kisi t={t} x={e.x} y={e.y} s={1.05} kiz adim={adim} yon={t >= an(12, 0) ? -1 : e.yon} otur={otur} yuz={yuz} elde={elde}
                  sagKol={al > 0 && !elde ? karis(10, -70, al) : undefined} bas={otur * 12} />}
            {/* Elif'in balonları */}
            <Balon x={ODA + 520} y={ZEMIN - 620} w={260} h={170} u={ekmekBalonu} kuyruk={-60}><Ekmek x={0} y={10} s={1} /></Balon>
            <Balon x={e.x + 40} y={e.y - 760} w={420} h={170} u={aynilik} kuyruk={-80}>
              {[-130, 0, 130].map((x, i) => <g key={i} transform={`translate(${x},20) scale(0.22)`}><rect x={-210} y={-260} width={420} height={260} fill="#e9dfc9" {...M} strokeWidth={14} /><rect x={-230} y={-300} width={460} height={78} rx={6} fill={[C.yesil, C.kirmizi, C.lacivert][i]} {...M} strokeWidth={14} /></g>)}
            </Balon>
            {sasirma > 0 && <text x={e.x} y={e.y - 640} textAnchor="middle" fontFamily={EL} fontSize={120 * sasirma} fill={C.kirmizi}>!</text>}
            {otur > 0.3 && t < an(8, 0) && <text x={e.x + 70} y={e.y - 420 + Math.sin(t * 2) * 6} fontFamily={EL} fontSize={44} fill={C.mur} opacity={0.7}>off...</text>}
            <Balon x={ODA * 7 + 700} y={ZEMIN - 800} w={420} h={140} u={amcaBalon} kuyruk={90}>
              <text y={14} textAnchor="middle" fontFamily={EL} fontSize={44} fill={C.mur}>Ekmek sıcak kızım!</text>
            </Balon>
            {[0, 1, 2].map((k) => <Kalp key={k} x={e.x - 40 + k * 40} y={e.y - 620} u={(t - kelimeAn(10, 'sakız') - k * 0.25) / 1.4} />)}
            {son > 0 && <g transform={`translate(${e.x - 130},${e.y - 640}) scale(${zipla(t, an(12, 3), 0.5)})`}>
              <circle r={58} fill="#f6efdf" {...M} /><text y={30} textAnchor="middle" fontFamily={EL} fontSize={90} fill={C.kirmizi}>?</text></g>}
          </g>
        </g>
        <BuyukYazi t={t} />
        <Sayac t={t} />
        <rect width={1080} height={1920} fill="#e08a3a" opacity={0.1 * sicak} style={{mixBlendMode: 'multiply'}} />
        <rect width={1080} height={1920} filter="url(#leke)" />
        <rect width={1080} height={1920} filter="url(#gren)" />
        <rect width={1080} height={1920} fill="url(#vinyet)" />
      </svg>
      <Altyazi t={t} />
      <div style={{position: 'absolute', bottom: 70, width: '100%', textAlign: 'center', fontFamily: `${EL}, sans-serif`, fontSize: 34,
        letterSpacing: 4, color: 'rgba(255,248,230,.75)'}}>Antik Stüdyo</div>
    </AbsoluteFill>
  );
};

export const Root: React.FC = () => (
  <Composition id="Bakkal" component={Video} durationInFrames={Math.ceil(SON * FPS)} fps={FPS} width={1080} height={1920} />
);
