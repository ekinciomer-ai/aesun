// Pumpkin 2. bölüm: dedikodu. Kâğıt Arayış formatı (sepya kâğıt, titrek mürekkep, çubuk karakterler, el yazısı).
// Kurgu: gerçek kişi ve iş yeri adı yok. Görsellerin tamamı SVG koddur.
import React from 'react';
import {AbsoluteFill, Audio, Composition, Easing, interpolate, staticFile, useCurrentFrame} from 'remotion';
import {loadFont} from '@remotion/fonts';
import veri from '../../public/dedikodu/kelimeler.json';

const EL = 'ElYazisi';
loadFont({family: EL, url: staticFile('fonts/patrick-hand-latin-400-normal.woff2'), weight: '400', unicodeRange: 'U+0000-00FF'});
loadFont({family: EL, url: staticFile('fonts/patrick-hand-latin-ext-400-normal.woff2'), weight: '400', unicodeRange: 'U+0100-024F, U+1E00-1EFF'});

type Kelime = {w: string; s: number; e: number; c: number};
const K = veri as Kelime[];
const FPS = 30;
const SON = K[K.length - 1].e + 1.6;
const an = (satir: number, kelime = 0) => { const l = K.filter((k) => k.c === satir); return (l[Math.min(kelime, l.length - 1)] ?? l[0]).s; };
const anSon = (satir: number) => { const l = K.filter((k) => k.c === satir); return l[l.length - 1].e; };
const ka = (satir: number, bas: string) => (K.find((k) => k.c === satir && k.w.toLocaleLowerCase('tr-TR').startsWith(bas)) ?? K.filter((k) => k.c === satir)[0]).s;
const gir = (t: number, t0: number, sure = 0.8) =>
  interpolate(t, [t0, t0 + sure], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.bezier(0.45, 0, 0.55, 1)});
const zipla = (t: number, t0: number, sure = 0.4) =>
  interpolate(t, [t0, t0 + sure * 0.6, t0 + sure], [0, 1.15, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
const karis = (a: number, b: number, u: number) => a + (b - a) * u;

const C = {
  kagit: '#eadcbc', kagit2: '#e2d1ab', duvar: '#e4d1aa', mur: '#3b2d22', ten: '#f3e6cf', sari: '#f2c94c', mavi: '#4f8fd6',
  kirmizi: '#c2493b', yesil: '#6f9a5b', lacivert: '#3f5a86', ahsap: '#9b6b43', ahsap2: '#7a5132', beyaz: '#f7f0df',
  kazak: '#c9744a', etek: '#5d7fa8', mor: '#7e5a9b', siyah: '#2e2a2b', gri: '#8f8a80', kir: '#cfcac0', cay: '#b8462e',
};
const M = {stroke: C.mur, strokeWidth: 4.5, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const};
const ODA = 1080;
const ZEMIN = 1340;

// ---- ortak parçalar
const Balon: React.FC<{x: number; y: number; w: number; h: number; u: number; children?: React.ReactNode; kuyruk?: number; dusunce?: boolean}> =
  ({x, y, w, h, u, children, kuyruk = 0, dusunce = true}) => u <= 0 ? null : (
    <g transform={`translate(${x},${y}) scale(${Math.min(1, u * 1.1)})`} opacity={Math.min(1, u * 1.5)}>
      <ellipse rx={w / 2} ry={h / 2} fill="#f6efdf" {...M} />
      {dusunce ? <g><circle cx={kuyruk - 30} cy={h / 2 + 30} r={16} fill="#f6efdf" {...M} /><circle cx={kuyruk - 50} cy={h / 2 + 66} r={9} fill="#f6efdf" {...M} /></g>
        : <path d={`M ${kuyruk - 20} ${h / 2 - 6} L ${kuyruk - 40} ${h / 2 + 50} L ${kuyruk + 16} ${h / 2 - 4}`} fill="#f6efdf" {...M} />}
      {children}
    </g>
  );
const Fisilti: React.FC<{x: number; y: number; t: number; u: number}> = ({x, y, t, u}) => u <= 0 ? null : (
  <g transform={`translate(${x},${y})`} opacity={u}>
    {[0, 1, 2].map((i) => <path key={i} d={`M ${i * 26} ${-i * 6} q 10 ${-12 + Math.sin(t * 9 + i) * 4} 20 0 t 20 0`} fill="none" {...M} strokeWidth={3} />)}
  </g>
);
const Cay: React.FC<{x: number; y: number; s?: number; t: number}> = ({x, y, s = 1, t}) => (
  <g transform={`translate(${x},${y}) scale(${s})`}>
    <path d="M -18 -60 Q -10 -30 -16 -10 Q -20 6 0 6 Q 20 6 16 -10 Q 10 -30 18 -60 Z" fill={C.cay} {...M} strokeWidth={3.5} />
    <path d="M -18 -60 L 18 -60" {...M} strokeWidth={3.5} />
    <ellipse cx={0} cy={10} rx={30} ry={7} fill={C.beyaz} {...M} strokeWidth={3} />
    {[0, 1].map((i) => <path key={i} d={`M ${-6 + i * 12} -70 q ${6 * Math.sin(t * 3 + i)} -14 0 -28`} fill="none" {...M} strokeWidth={2.5} opacity={0.5} />)}
  </g>
);
const Masa: React.FC<{x: number; ekran?: boolean; bitki?: boolean; t: number; ekranX?: number; bitkiX?: number}> = ({x, ekran = true, bitki = true, ekranX = 0, bitkiX = -140}) => (
  <g transform={`translate(${x},${ZEMIN})`}>
    {ekran && <g transform={`translate(${ekranX},0)`}><rect x={-60} y={-420} width={150} height={100} rx={8} fill="#cfe0dc" {...M} /><path d="M 15 -320 L 15 -296 M -10 -296 L 40 -296" {...M} /></g>}
    {bitki && <g transform={`translate(${bitkiX},-296)`}><path d="M -24 0 L -18 -40 L 18 -40 L 24 0 Z" fill={C.ahsap} {...M} strokeWidth={3.5} /><path d="M 0 -40 Q -30 -90 -10 -110 M 0 -40 Q 20 -100 36 -96 M 0 -40 Q -2 -80 6 -120" fill="none" stroke={C.yesil} strokeWidth={8} strokeLinecap="round" /></g>}
    <rect x={-200} y={-296} width={400} height={34} fill={C.ahsap} {...M} />
    <rect x={-186} y={-262} width={372} height={262} fill={C.ahsap2} {...M} />
    <rect x={-150} y={-230} width={140} height={60} fill={C.ahsap} {...M} strokeWidth={3} /><circle cx={-80} cy={-200} r={6} fill={C.sari} />
  </g>
);

// ---- fabl: kedi ve ciğer
const Fabl: React.FC<{t: number; t0: number; tMundar: number; u: number}> = ({t, t0, tMundar, u}) => {
  if (u <= 0) return null;
  const vazgec = gir(t, tMundar - 0.3, 0.5);
  const zipla = vazgec < 0.5 ? Math.abs(Math.sin((t - t0) * 4.2)) * 110 : 0;
  return (
    <g opacity={Math.min(1, u * 1.4)} transform={`translate(540,${karis(780, 760, u)})`}>
      <path d="M -330 -200 Q 0 -216 330 -198 L 326 200 Q 0 214 -326 198 Z" fill="#efe3c6" stroke={C.mur} strokeWidth={4} />
      <g transform="translate(-10,6) scale(1.3)">
      {/* kasap çengeli ve ciğer */}
      <path d="M 120 -130 L 120 -120 Q 120 -96 100 -100" fill="none" {...M} strokeWidth={5} />
      <path d="M 70 -110 Q 60 -150 110 -146 Q 160 -150 160 -110 Q 166 -70 120 -60 Q 76 -60 70 -110 Z" fill="#8e2f2a" {...M} />
      <path d="M 96 -120 q 12 -10 24 0" fill="none" stroke="#c45a52" strokeWidth={4} />
      {/* zemin */}
      <path d="M -200 150 L 200 150" {...M} strokeWidth={3} />
      {/* kedi: sıçrar, uzanamaz, burnunu kaldırıp döner */}
      <g transform={`translate(${karis(60, -90, vazgec)},${150 - zipla}) scale(${vazgec > 0.5 ? -1 : 1},1)`}>
        <path d="M -40 0 Q -46 -54 0 -54 Q 40 -54 40 0 Z" fill="#c98a4b" {...M} />
        <g transform={`rotate(${vazgec > 0.5 ? -25 : -35} 26 -70)`}>
          <circle cx={26} cy={-72} r={24} fill="#c98a4b" {...M} />
          <path d="M 10 -90 L 12 -108 L 26 -94 M 30 -94 L 44 -108 L 44 -88" fill="#c98a4b" {...M} strokeWidth={3} />
          {vazgec > 0.5 ? <path d="M 16 -74 l 8 0 M 32 -74 l 8 0" {...M} strokeWidth={3} /> : <g><circle cx={20} cy={-76} r={3} fill={C.mur} /><circle cx={34} cy={-76} r={3} fill={C.mur} /></g>}
        </g>
        <path d={`M -40 -6 Q -80 ${-30 + Math.sin(t * 4) * 14} -66 -64`} fill="none" {...M} />
        {vazgec <= 0.5 && <path d="M 30 -40 L 70 -90" {...M} strokeWidth={5} />}
      </g>
      {vazgec > 0.5 && <text x={-200} y={40} fontFamily={EL} fontSize={54} fill={C.kirmizi} opacity={vazgec}>pıh!</text>}
      </g>
    </g>
  );
};

// ---- çubuk karakter (genel)
type KisiP = {x: number; y: number; s?: number; t: number; adim?: number; yon?: 1 | -1; otur?: number;
  sac?: 'uzun' | 'kare' | 'kisa' | 'kir'; sacRenk?: string; goz?: string; ust?: string; alt?: string; etek?: boolean;
  gozluk?: string; kravat?: string; cizgili?: boolean; yuz?: 'gul' | 'sasir' | 'kibir' | 'endise' | 'sakin' | 'ciddi' | 'mutlu';
  ter?: number; sagKol?: number; solKol?: number; bak?: number; elde?: React.ReactNode; gizleBacak?: boolean};
const Kisi: React.FC<KisiP> = (p) => {
  const s = p.s ?? 1, yon = p.yon ?? 1, otur = p.otur ?? 0, ad = p.adim ?? 0;
  const sal = ad ? Math.sin(ad) * 30 : 0;
  const nefes = Math.sin(p.t * 2.2 + p.x * 0.01) * 2;
  const kirp = (p.t * 0.8 + p.x * 0.0013) % 3.4 < 0.1 ? 0.1 : 1;
  const BOY = 250, kalca = -BOY * (1 - otur * 0.45);
  const bacak = (aci: number, k: number) => {
    if (otur > 0.5) return <path d={`M ${k * 10} ${kalca} L ${k * 10 + 90} ${kalca} L ${k * 10 + 96} 0`} fill="none" {...M} strokeWidth={5} />;
    const r = (aci * Math.PI) / 180;
    return <path d={`M ${k * 10} ${kalca} L ${k * 10 + Math.sin(r) * BOY * 0.5} ${kalca + Math.cos(r) * BOY * 0.5} L ${k * 10 + Math.sin(r) * BOY * 0.9} 0`} fill="none" {...M} strokeWidth={5} />;
  };
  const kol = (aci: number, k: number) => {
    const r = (aci * Math.PI) / 180;
    return <path d={`M ${k * 34} ${kalca - 140} L ${k * 34 + Math.sin(r) * k * 70} ${kalca - 140 + Math.cos(r) * 70} L ${k * 34 + Math.sin(r) * k * 130} ${kalca - 140 + Math.cos(r) * 130}`} fill="none" {...M} strokeWidth={5} />;
  };
  const sacR = p.sacRenk ?? C.sari;
  const bak = p.bak ?? 0;
  return (
    <g transform={`translate(${p.x},${p.y}) scale(${s * yon},${s})`}>
      {!p.gizleBacak && <g>{bacak(sal, -1)}{bacak(-sal, 1)}</g>}
      <g transform={`translate(0,${nefes})`}>
        {kol(p.solKol ?? (ad ? -sal * 0.8 : 10), -1)}
        {p.etek
          ? <path d={`M -38 ${kalca - 170} L 38 ${kalca - 170} L 50 ${kalca + 10} L -50 ${kalca + 10} Z`} fill={p.ust ?? C.kazak} {...M} />
          : <rect x={-38} y={kalca - 170} width={76} height={178} rx={10} fill={p.ust ?? C.lacivert} {...M} />}
        {p.etek && <path d={`M -50 ${kalca - 20} L 50 ${kalca - 20} L 58 ${kalca + 30} L -58 ${kalca + 30} Z`} fill={p.alt ?? C.etek} {...M} />}
        {p.cizgili && [0, 1, 2].map((i) => <path key={i} d={`M -30 ${kalca - 140 + i * 40} L 30 ${kalca - 140 + i * 40}`} stroke="#b3603b" strokeWidth={4} />)}
        {p.kravat && <g><path d={`M -14 ${kalca - 170} L 0 ${kalca - 150} L 14 ${kalca - 170}`} fill={C.beyaz} {...M} strokeWidth={3} /><path d={`M 0 ${kalca - 152} L -10 ${kalca - 80} L 0 ${kalca - 60} L 10 ${kalca - 80} Z`} fill={p.kravat} {...M} strokeWidth={3} /></g>}
        {kol(p.sagKol ?? (ad ? sal * 0.8 : 10), 1)}
        {p.elde}
        <g transform={`translate(0,${kalca - 236})`}>
          {p.sac === 'uzun' && <path d="M -56 -10 Q -66 -80 0 -82 Q 66 -80 56 -10 L 64 110 Q 40 96 40 60 L 46 -6 Q 0 -40 -46 -6 L -40 60 Q -40 96 -64 110 Z" fill={sacR} {...M} />}
          {p.sac === 'kare' && <path d="M -62 -10 Q -70 -84 0 -84 Q 70 -84 62 -10 L 66 46 L 40 46 L 44 -10 Q 0 -30 -44 -10 L -40 46 L -66 46 Z" fill={sacR} {...M} />}
          <circle r={56} fill={C.ten} {...M} />
          {p.sac === 'uzun' && <path d="M -54 -14 Q -40 -70 0 -66 Q 40 -70 54 -14 Q 30 -44 4 -40 Q -22 -46 -54 -14 Z" fill={sacR} {...M} strokeWidth={3.5} />}
          {p.sac === 'kare' && <path d="M -56 -12 Q -50 -66 0 -64 Q 50 -66 56 -12 L 30 -30 L -40 -26 Z" fill={sacR} {...M} strokeWidth={3.5} />}
          {p.sac === 'kisa' && <path d="M -54 -20 Q -50 -70 0 -66 Q 50 -70 54 -20 Q 30 -48 0 -44 Q -30 -48 -54 -20 Z" fill={sacR} {...M} strokeWidth={3.5} />}
          {p.sac === 'kir' && <path d="M -56 -6 Q -60 -40 -40 -40 M 56 -6 Q 60 -40 40 -40 M -30 -52 Q 0 -62 30 -52" fill="none" stroke={C.kir} strokeWidth={14} strokeLinecap="round" />}
          {/* gözler */}
          <g transform={`translate(${bak},0) scale(1,${p.yuz === 'sakin' ? 0.35 : kirp})`}>
            {p.goz ? [-20, 22].map((gx) => <g key={gx}><ellipse cx={gx} cy={-4} rx={11} ry={13} fill="#fff" {...M} strokeWidth={2.5} /><circle cx={gx + 2} cy={-2} r={7} fill={p.goz} /><circle cx={gx + 3} cy={-3} r={3} fill={C.mur} /><circle cx={gx + 5} cy={-6} r={1.8} fill="#fff" /></g>)
              : <g><circle cx={-18} cy={-4} r={5.5} fill={C.mur} /><circle cx={18} cy={-4} r={5.5} fill={C.mur} /></g>}
          </g>
          {p.gozluk && <g fill="none" stroke={p.gozluk} strokeWidth={4}><path d="M -36 -14 L -4 -12 L -6 8 L -32 8 Z M 4 -12 L 36 -14 L 32 8 L 6 8 Z M -4 -10 L 4 -10" /></g>}
          {/* kaşlar */}
          {p.yuz === 'kibir' ? <path d="M -34 -26 L -8 -22 M 10 -30 L 34 -36" {...M} strokeWidth={4} />
            : p.yuz === 'endise' ? <path d="M -34 -22 L -10 -30 M 10 -30 L 34 -22" {...M} strokeWidth={4} />
            : p.yuz === 'ciddi' ? <path d="M -34 -28 L -10 -24 M 10 -24 L 34 -28" {...M} strokeWidth={4} />
            : p.yuz === 'sasir' ? <path d="M -34 -34 L -10 -38 M 10 -38 L 34 -34" {...M} strokeWidth={4} /> : null}
          {/* ağız */}
          {p.yuz === 'sasir' ? <ellipse cx={0} cy={30} rx={9} ry={12} fill={C.mur} />
            : p.yuz === 'kibir' ? <path d="M -16 28 Q 4 34 20 20" fill="none" {...M} />
            : p.yuz === 'endise' ? <path d="M -16 32 q 8 -8 16 0 t 16 0" fill="none" {...M} strokeWidth={3.5} />
            : p.yuz === 'ciddi' ? <path d="M -14 28 L 14 28" {...M} />
            : p.yuz === 'mutlu' ? <path d="M -20 22 Q 0 44 20 22 Z" fill={C.mur} {...M} strokeWidth={3} />
            : <path d="M -16 26 Q 0 38 16 26" fill="none" {...M} />}
          {p.etek && <g><circle cx={-34} cy={18} r={8} fill="#e9a19a" opacity={0.6} /><circle cx={34} cy={18} r={8} fill="#e9a19a" opacity={0.6} /></g>}
          {(p.ter ?? 0) > 0 && <path transform={`translate(52,${-20 + (p.t * 40) % 30})`} d="M 0 -14 Q 10 0 0 8 Q -10 0 0 -14 Z" fill="#9fd0f0" {...M} strokeWidth={2.5} opacity={p.ter} />}
        </g>
      </g>
    </g>
  );
};

// ---- yollar (dünya koordinatı)
type N = {t: number; x: number};
const konum = (p: N[], t: number) => {
  for (let i = 1; i < p.length; i++) if (t <= p[i].t) {
    const a = p[i - 1], b = p[i], u = b.t > a.t ? Math.min(1, Math.max(0, (t - a.t) / (b.t - a.t))) : 1;
    return {x: karis(a.x, b.x, u), yuru: Math.abs(b.x - a.x) > 5 && u > 0 && u < 1, yon: (b.x >= a.x ? 1 : -1) as 1 | -1};
  }
  const l = p[p.length - 1]; return {x: l.x, yuru: false, yon: 1 as 1 | -1};
};
const DEDIKODU_X = 330, PUMPKIN_X = ODA + 700;
const musteriYolu = (): N[] => [
  {t: 0, x: -120}, {t: an(0, 3), x: 640}, {t: an(3, 0), x: 640}, {t: an(3, 3), x: ODA + 380}, {t: 999, x: ODA + 380}];
const yoneticiYolu = (): N[] => [
  {t: 0, x: ODA * 2 + 200}, {t: an(7, 0) - 0.5, x: ODA * 2 + 200}, {t: an(7, 2), x: 650}, {t: 999, x: 650}];

// ---- mekân
const Ofis: React.FC<{t: number}> = ({t}) => {
  const isik = gir(t, an(6, 0), 0.6) * (1 - gir(t, an(11, 0), 0.8));
  const bakis = (x: number) => (t >= an(6, 3) && t < an(11, 0) ? (x > DEDIKODU_X ? -8 : 8) : 0);
  return (
    <g>
      <rect x={-200} y={-400} width={ODA * 3 + 400} height={ZEMIN + 400} fill={C.duvar} />
      <path d={`M -200 ${ZEMIN - 520} L ${ODA * 3 + 200} ${ZEMIN - 520}`} {...M} strokeWidth={2.5} opacity={0.5} />
      {/* pencereler */}
      {[700, ODA + 160, ODA * 2 + 560].map((x, i) => <g key={i}><rect x={x - 150} y={360} width={300} height={360} fill="#efe4c4" {...M} />
        <path d={`M ${x} 360 L ${x} 720 M ${x - 150} 540 L ${x + 150} 540`} {...M} />
        <g transform={`translate(${x},700) scale(0.32)`} fill="#c9b892" {...M} strokeWidth={8}><path d="M -300 0 L -300 -60 Q -220 -170 -140 -60 L -140 0 Z" /><path d="M 40 0 L 44 -220 L 50 -246 L 56 -220 L 60 0 Z" /><path d="M 120 0 L 120 -90 Q 200 -200 280 -90 L 280 0 Z" /></g></g>)}
      {/* saat */}
      <g transform="translate(1000,300)"><circle r={50} fill={C.beyaz} {...M} /><path d={`M 0 0 L 0 -34 M 0 0 L ${Math.sin(t * 0.5) * 26} ${-Math.cos(t * 0.5) * 26}`} {...M} /></g>
      {/* arka masalardaki iş arkadaşları (yalnız baş) */}
      {[ODA - 150, ODA * 2 - 120].map((x, i) => (
        <g key={i}><Kisi t={t} x={x} y={ZEMIN - 60} s={0.8} otur={1} sac={i ? 'kisa' : 'uzun'} sacRenk={i ? C.siyah : '#8a4b2a'} ust={i ? C.yesil : '#b07d9b'}
          etek={!i} yuz={t >= an(6, 0) && t < an(11, 0) ? 'sasir' : 'gul'} bak={bakis(x)} gizleBacak yon={-1} />
          <Masa x={x + 20} t={t} bitki={false} ekranX={-170} /></g>))}
      <rect x={-200} y={ZEMIN} width={ODA * 3 + 400} height={800} fill="#cdb48c" />
      <path d={`M -200 ${ZEMIN} L ${ODA * 3 + 200} ${ZEMIN}`} {...M} />
      {Array.from({length: 12}).map((_, i) => <path key={i} d={`M ${i * 300 - 100} ${ZEMIN} L ${i * 300 - 180} ${ZEMIN + 600}`} {...M} strokeWidth={2.5} opacity={0.4} />)}
      {/* yönetici kapısı */}
      <rect x={ODA * 2 + 300} y={ZEMIN - 560} width={200} height={560} fill={C.ahsap} {...M} />
      <rect x={ODA * 2 + 330} y={ZEMIN - 520} width={140} height={60} fill={C.beyaz} {...M} strokeWidth={3} />
      <text x={ODA * 2 + 400} y={ZEMIN - 478} textAnchor="middle" fontFamily={EL} fontSize={34} fill={C.mur}>YÖNETİCİ</text>
      {/* spot: bütün gözler o masada */}
      <rect x={-400} y={-600} width={ODA * 3 + 800} height={3200} fill="url(#spot)" opacity={isik} />
    </g>
  );
};

const kamera = (t: number) => {
  const o = (i: number) => i * ODA + 540;
  type A = {t: number; d: number; x: number; y: number; z: number};
  const plan: A[] = [
    {t: 0, d: 0.01, x: o(0), y: 960, z: 1},
    {t: an(2, 3), d: 0.8, x: o(0) + 80, y: 880, z: 1.12},          // müşterinin balonu
    {t: an(3, 0), d: 1.6, x: o(1) + 20, y: 960, z: 1},             // Pumpkin'in masası
    {t: an(5, 1) - 0.2, d: 0.6, x: o(1) + 120, y: 900, z: 1.22},    // "Kim söyledi?"
    {t: an(6, 0) - 0.2, d: 1.2, x: o(0) + 60, y: 960, z: 1},        // gözler o masaya
    {t: ka(8, 'kâğıd') - 0.3, d: 0.9, x: DEDIKODU_X + 20, y: ZEMIN - 400, z: 1.8},  // boş kâğıt
    {t: an(10, 0) - 0.3, d: 0.8, x: DEDIKODU_X + 70, y: ZEMIN - 290, z: 2.6},  // itiraf yazısı
    {t: an(11, 0) - 0.2, d: 1.3, x: o(1) + 80, y: 960, z: 1},       // Pumpkin, katlanmış kâğıt, çay
    {t: an(13, 0), d: 1.0, x: o(1) + 120, y: 900, z: 1.1},
  ];
  let c = {x: plan[0].x, y: plan[0].y, z: plan[0].z};
  for (const a of plan) { if (t < a.t) break; const u = gir(t, a.t, a.d); c = {x: karis(c.x, a.x, u), y: karis(c.y, a.y, u), z: karis(c.z, a.z, u)}; }
  // "Kim söyledi?" müzikteki vuruşla kısa kamera itişi
  const v = t - ka(5, 'kim');
  if (v > 0 && v < 0.5) c = {...c, z: c.z * (1 + 0.06 * Math.sin((v / 0.5) * Math.PI))};
  return c;
};

const Altyazi: React.FC<{t: number}> = ({t}) => {
  const aktif = K.filter((k) => k.s - 0.04 <= t).pop();
  if (!aktif) return null;
  return (
    <div style={{position: 'absolute', left: 70, right: 70, top: 1450, textAlign: 'center', fontFamily: `${EL}, sans-serif`, fontSize: 64, lineHeight: 1.2}}>
      {K.filter((k) => k.c === aktif.c).map((k, i) => (
        <span key={i} style={{opacity: t >= k.s - 0.04 ? 1 : 0, color: k === aktif ? '#ffd84a' : '#fff', WebkitTextStroke: '7px #2b1f17', paintOrder: 'stroke fill'}}>{k.w}{' '}</span>
      ))}
    </div>
  );
};

const Video: React.FC = () => {
  const kare = useCurrentFrame();
  const t = kare / FPS;
  const c = kamera(t);
  const mu = konum(musteriYolu(), t), yo = konum(yoneticiYolu(), t);
  const fisilti = gir(t, an(1, 0) - 0.2, 0.3) * (1 - gir(t, anSon(1), 0.3));
  const musteriBalon = gir(t, an(2, 2), 0.5) * (1 - gir(t, an(3, 0), 0.4));
  const soru = gir(t, ka(3, 'bunu') - 0.1, 0.4) * (1 - gir(t, an(4, 0) + 0.3, 0.4));
  const kim = zipla(t, ka(5, 'kim') - 0.1, 0.5) * (1 - gir(t, an(6, 0) + 0.4, 0.4));
  const ayaga = gir(t, an(5, 0), 0.6) * (1 - gir(t, an(11, 0) - 0.4, 0.6));
  const kagitUc = gir(t, ka(7, 'yazılı') - 0.1, 0.8);
  const ter = gir(t, an(6, 3), 0.5);
  const sifir = zipla(t, ka(8, 'gerçek') - 0.1, 0.5);
  const ders = gir(t, ka(12, 'kedi') - 0.2, 0.6), ders2 = gir(t, ka(12, 'mundar') - 0.1, 0.5), cizgi = gir(t, ka(12, 'der'), 0.5);
  const fabl = gir(t, ka(12, 'kedi') - 0.2, 0.6) * (1 - gir(t, an(13, 0) + 0.3, 0.5));
  const itiraf = K.filter((k) => k.c === 10);
  const dedikoduYuz: KisiP['yuz'] = t < an(2, 0) ? 'kibir' : t < an(6, 0) ? 'gul' : 'endise';
  const pumpkinYuz: KisiP['yuz'] = t >= an(11, 0) ? 'mutlu' : t >= an(4, 0) ? (t >= an(5, 0) ? 'ciddi' : 'sakin') : t >= an(3, 0) ? 'sasir' : 'gul';
  const son = gir(t, an(13, 0), 0.8);
  const ilk = 1 - gir(t, an(1, 0) - 0.1, 0.4);
  // duygu tonu: gerilimde soğuk ve koyu, itiraftan sonra yavaşça ısınır
  const soguk = gir(t, an(6, 0) - 0.3, 1.2) * (1 - gir(t, an(10, 0) - 0.4, 1.6));
  const sicak = gir(t, an(10, 0), 5);
  const kalemTitre = t >= ka(8, 'kâğıd') && t < an(9, 0) ? Math.sin(t * 40) * 4 : t >= an(9, 0) && t < anSon(10) ? Math.sin(t * 12) * 18 : 0;
  return (
    <AbsoluteFill style={{background: C.kagit}}>
      <Audio src={staticFile('dedikodu/ses.mp3')} />
      <svg width={1080} height={1920} viewBox="0 0 1080 1920">
        <defs>
          <filter id="kalem" x="-5%" y="-5%" width="110%" height="110%">
            <feTurbulence type="fractalNoise" baseFrequency="0.018" numOctaves={2} seed={Math.floor(kare / 4) % 5} result="g" />
            <feDisplacementMap in="SourceGraphic" in2="g" scale={4.5} />
          </filter>
          <filter id="gren"><feTurbulence type="fractalNoise" baseFrequency="0.75" numOctaves={3} seed={7} /><feColorMatrix values="0 0 0 0 0.23  0 0 0 0 0.17  0 0 0 0 0.12  0 0 0 0.16 0" /></filter>
          <filter id="leke"><feTurbulence type="fractalNoise" baseFrequency="0.004" numOctaves={3} seed={3} /><feColorMatrix values="0 0 0 0 0.45  0 0 0 0 0.33  0 0 0 0 0.2  0 0 0 0.22 0" /></filter>
          <radialGradient id="vinyet" cx="0.5" cy="0.45" r="0.72"><stop offset="0.45" stopColor="#2b1d12" stopOpacity="0" /><stop offset="1" stopColor="#2b1d12" stopOpacity="0.62" /></radialGradient>
          <radialGradient id="spot" gradientUnits="userSpaceOnUse" cx={DEDIKODU_X} cy={ZEMIN - 420} r={460}>
            <stop offset="0.55" stopColor="#1e140c" stopOpacity="0" /><stop offset="1" stopColor="#1e140c" stopOpacity="0.55" /></radialGradient>
        </defs>
        <g filter="url(#kalem)">
          <g transform={`translate(540,960) scale(${c.z}) translate(${-c.x},${-c.y})`}>
            <Ofis t={t} />
            {/* dedikoducu kız (kurgu): oturur, masanın arkasında */}
            <Kisi t={t} x={DEDIKODU_X} y={ZEMIN - 70} s={1.0} otur={1} sac="kare" sacRenk={C.siyah} gozluk={C.kirmizi} ust={C.mor} etek alt={C.gri}
              yuz={dedikoduYuz} ter={ter} bak={t < an(2, 0) ? 8 : 0} gizleBacak sagKol={fisilti > 0 ? -150 : t >= ka(8, 'kâğıd') ? -40 : 10}
              elde={t >= ka(8, 'kâğıd') ? <g transform={`translate(${110 + kalemTitre},-210) rotate(30)`}><rect x={-5} y={-50} width={10} height={64} rx={4} fill={C.sari} {...M} strokeWidth={3} /></g> : null} />
            <Masa x={DEDIKODU_X + 30} t={t} ekranX={-170} bitkiX={150} />
            {/* masadaki kâğıt: Yazılı Açıklama, boş */}
            {kagitUc > 0 && t < an(11, 0) && <g transform={`translate(${karis(650, DEDIKODU_X + 70, kagitUc)},${karis(ZEMIN - 520, ZEMIN - 300, kagitUc)}) rotate(${karis(-30, -4, kagitUc)})`}>
              <rect x={-90} y={-60} width={180} height={124} fill={C.beyaz} {...M} strokeWidth={3} />
              <text y={-30} textAnchor="middle" fontFamily={EL} fontSize={22} fill={C.mur}>Yazılı Açıklama</text>
              {[0, 1, 2].map((i) => <path key={i} d={`M -76 ${2 + i * 22} L 76 ${2 + i * 22}`} stroke={C.gri} strokeWidth={1.5} />)}
              {/* itiraf: söylendikçe el yazısıyla belirir */}
              {[[0, 4], [4, 6], [6, 8]].map(([a, b], i) => (
                <text key={i} x={-74} y={-2 + i * 22} fontFamily={EL} fontSize={17} fill="#2c3f7a">
                  {itiraf.slice(a, b).filter((k) => t >= k.s - 0.05).map((k) => k.w).join(' ')}</text>
              ))}
            </g>}
            <Fisilti x={DEDIKODU_X + 70} y={ZEMIN - 560} t={t} u={fisilti} />
            {/* müşteri */}
            <Kisi t={t} x={mu.x} y={ZEMIN} s={1.05} adim={mu.yuru ? t * 9 : 0} yon={mu.x > ODA ? 1 : (t < an(3, 0) ? -1 : mu.yon)} sac="kisa" sacRenk="#6b4a2f"
              ust={C.lacivert} kravat={C.kirmizi} yuz={t >= an(2, 0) && t < an(3, 0) ? 'sasir' : t >= an(3, 0) && t < an(5, 0) ? 'ciddi' : 'gul'} />
            <Balon x={mu.x + 40} y={ZEMIN - 760} w={300} h={210} u={musteriBalon} kuyruk={-40}>
              <Kisi t={t} x={0} y={110} s={0.42} sac="uzun" goz={C.mavi} ust={C.kazak} etek cizgili yuz="mutlu" gizleBacak />
              <path d="M 70 -40 Q 60 -64 84 -60 Q 96 -76 106 -56 Q 112 -36 84 -20 Q 66 -32 70 -40 Z" fill={C.kirmizi} {...M} strokeWidth={3} />
            </Balon>
            <Balon x={mu.x + 70} y={ZEMIN - 700} w={150} h={120} u={soru} kuyruk={-40} dusunce={false}>
              <text y={26} textAnchor="middle" fontFamily={EL} fontSize={84} fill={C.mur}>?</text>
            </Balon>
            {/* Pumpkin */}
            <Kisi t={t} x={PUMPKIN_X} y={karis(ZEMIN - 70, ZEMIN, ayaga)} s={1.05} otur={1 - ayaga} sac="uzun" goz={C.mavi} ust={C.kazak} etek cizgili
              yon={-1} yuz={pumpkinYuz} gizleBacak={ayaga < 0.5} sagKol={t >= ka(11, 'çay') - 0.3 ? -120 : 10}
              elde={t >= ka(11, 'çay') - 0.3 ? <Cay x={-120} y={-330} s={0.9} t={t} /> : null} />
            <Masa x={PUMPKIN_X - 40} t={t} ekranX={140} bitkiX={-150} />
            {t < ka(11, 'çay') - 0.3 && <Cay x={PUMPKIN_X - 160} y={ZEMIN - 300} s={0.8} t={t} />}
            {t >= an(11, 0) && <g transform={`translate(${PUMPKIN_X - 70},${ZEMIN - 304}) rotate(-6) scale(${karis(1, 0.6, gir(t, ka(11, 'katladı'), 0.5))},1)`}>
              <rect x={-60} y={-14} width={120} height={22} fill={C.beyaz} {...M} strokeWidth={3} /><path d="M 0 -14 L 0 8" stroke={C.gri} strokeWidth={2} /></g>}
            <Balon x={PUMPKIN_X - 160} y={ZEMIN - 760} w={340} h={150} u={kim} kuyruk={90} dusunce={false}>
              <text y={20} textAnchor="middle" fontFamily={EL} fontSize={64} fill={C.kirmizi}>Kim söyledi?</text>
            </Balon>
            {/* yönetici */}
            <Kisi t={t} x={yo.x} y={ZEMIN} s={1.1} adim={yo.yuru ? t * 9 : 0} yon={-1} sac="kir" ust="#efe6d0" kravat={C.kirmizi} gozluk={C.mur}
              yuz="ciddi" sagKol={t >= ka(7, 'yazılı') - 0.2 && t < ka(7, 'yazılı') + 0.8 ? -80 : 10} />
            {sifir > 0 && <g transform={`translate(${DEDIKODU_X - 150},${ZEMIN - 640})`} fontFamily={EL}>
              <text textAnchor="middle" fontSize={40} fill={C.mur} opacity={Math.min(1, sifir)}>gerçek</text>
              <text y={100} textAnchor="middle" fontSize={120 * sifir} fill={C.kirmizi}>0</text>
            </g>}
            {son > 0 && <g transform={`translate(${PUMPKIN_X - 200},${ZEMIN - 680}) scale(${zipla(t, an(11, 2), 0.5)})`}>
              <circle r={58} fill="#f6efdf" {...M} /><text y={30} textAnchor="middle" fontFamily={EL} fontSize={90} fill={C.kirmizi}>?</text></g>}
          </g>
        </g>
        <g filter="url(#kalem)"><Fabl t={t} t0={ka(12, 'kedi')} tMundar={ka(12, 'mundar')} u={fabl} /></g>
        <g fontFamily={EL}>
          {ilk > 0 && <g opacity={ilk}><text x={80} y={330} fontSize={92} fill={C.mur}>Hiç tanımadığı biri,</text>
            <text x={80} y={440} fontSize={92} fill={C.kirmizi}>onu kötüledi.</text></g>}
          {ders > 0 && <g opacity={ders}>
            <path d="M 70 210 Q 540 190 1010 214 L 1004 468 Q 540 486 76 462 Z" fill="#efe3c6" stroke={C.mur} strokeWidth={4} />
            <text x={540} y={310} textAnchor="middle" fontSize={78} fill={C.mur}>Kedi uzanamadığı ciğere</text>
            <text x={540} y={420} textAnchor="middle" fontSize={84} fill={C.kirmizi} opacity={ders2}>mundar der.</text>
            <path d={`M 360 446 Q 540 458 ${karis(360, 720, cizgi)} 442`} fill="none" stroke={C.kirmizi} strokeWidth={6} strokeLinecap="round" opacity={cizgi > 0 ? 1 : 0} />
          </g>}
        </g>
        <rect width={1080} height={1920} fill="#3a4d72" opacity={0.2 * soguk} style={{mixBlendMode: 'multiply'}} />
        <rect width={1080} height={1920} fill="#e08a3a" opacity={0.13 * sicak} style={{mixBlendMode: 'multiply'}} />
        <rect width={1080} height={1920} fill="#ffd9a0" opacity={0.08 * sicak} style={{mixBlendMode: 'screen'}} />
        <rect width={1080} height={1920} filter="url(#leke)" />
        <rect width={1080} height={1920} filter="url(#gren)" />
        <rect width={1080} height={1920} fill="url(#vinyet)" />
      </svg>
      <Altyazi t={t} />
      <div style={{position: 'absolute', bottom: 70, width: '100%', textAlign: 'center', fontFamily: `${EL}, sans-serif`, fontSize: 34,
        letterSpacing: 4, color: 'rgba(255,248,230,.75)'}}>Antik Stüdyo · Pumpkin</div>
    </AbsoluteFill>
  );
};

export const Root: React.FC = () => (
  <Composition id="Dedikodu" component={Video} durationInFrames={Math.ceil(SON * FPS)} fps={FPS} width={1080} height={1920} />
);
