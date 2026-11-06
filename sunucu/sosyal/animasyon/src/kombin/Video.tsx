// Tişört + kot: dünün iç çamaşırı ve iş kıyafeti. Tek dünya, 7 mekân yan yana; kamera kelime zamanlarıyla süzülür.
// Görsellerin tamamı SVG koddur (yapay zekâ görseli yok). Ses: ElevenLabs, kelime zamanları kelimeler.json.
import React from 'react';
import {AbsoluteFill, Audio, Composition, Easing, interpolate, staticFile, useCurrentFrame} from 'remotion';
import {loadFont} from '@remotion/fonts';
import veri from '../../public/kombin/kelimeler.json';

// Yazı tipi pakette (Inter, OFL lisansı): dışarıdan indirilmez, sunucuda da aynı görünür.
const INTER = 'InterYerel';
loadFont({family: INTER, url: staticFile('fonts/inter-latin-900-normal.woff2'), weight: '900', unicodeRange: 'U+0000-00FF'});
loadFont({family: INTER, url: staticFile('fonts/inter-latin-ext-900-normal.woff2'), weight: '900', unicodeRange: 'U+0100-024F, U+1E00-1EFF'});

type Kelime = {w: string; s: number; e: number; c: number};
const K = veri as Kelime[];
const FPS = 30;
const SON = K[K.length - 1].e + 1.4;

const an = (satir: number, kelime = 0) => K.filter((k) => k.c === satir)[kelime].s;
const anSon = (satir: number) => {
  const l = K.filter((k) => k.c === satir);
  return l[l.length - 1].e;
};
const gir = (t: number, t0: number, sure = 0.8) =>
  interpolate(t, [t0, t0 + sure], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.bezier(0.45, 0, 0.55, 1)});
const zipla = (t: number, t0: number, sure = 0.45) =>
  interpolate(t, [t0, t0 + sure * 0.6, t0 + sure], [0, 1.12, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.quad)});
const karis = (a: number, b: number, u: number) => a + (b - a) * u;

// ---- renkler (bütün videoda aynı)
const C = {
  murekkep: '#2b2230', ten: '#f2c29b', ten2: '#c98b62', sac: '#3b2a24', sac2: '#8a4b2a',
  kot: '#2f5fa8', kotKoyu: '#244a85', beyaz: '#fbf8f1', bakir: '#d9822b',
  gok: '#9fd3f2', kagit: '#f6e7c8', ahsap: '#a86b3c', ahsapKoyu: '#7a4a26', deniz: '#2d8fd6', lacivert: '#24345e',
  kirmizi: '#e2483d', sari: '#ffd84a', yesil: '#3fae6b', mor: '#7b5cc7',
};
const CIZ = {stroke: C.murekkep, strokeWidth: 6, strokeLinejoin: 'round' as const, strokeLinecap: 'round' as const};
const ODA = 1080;
const ZEMIN = 1320; // ayakların bastığı çizgi; altyazı bunun altında okunur

// ---- karakter: ayaklar (x, y)'de; tek çizim dili
type KisiProps = {
  x: number; y: number; s?: number; ten?: string; sac?: string; sacTip?: 'kisa' | 'uzun' | 'kel';
  ust?: string; ustTip?: 'tisort' | 'ceket' | 'yelek' | 'gomlek'; alt?: string; kot?: boolean; percin?: number;
  yuz?: 'gulumse' | 'sasir' | 'duz' | 'kararli'; solKol?: number; sagKol?: number; t: number; sapka?: 'melon' | 'baret' | 'denizci' | null;
  biyik?: boolean; onluk?: boolean; egil?: number; bakis?: number; children?: React.ReactNode;
};
const Kisi: React.FC<KisiProps> = (p) => {
  const s = p.s ?? 1;
  const nefes = Math.sin(p.t * 2.1 + p.x) * 3;
  const kirp = (p.t * 0.9 + p.x * 0.01) % 3.2 < 0.12 ? 0.1 : 1;
  const ust = p.ust ?? C.beyaz, alt = p.alt ?? C.kot, ten = p.ten ?? C.ten, sac = p.sac ?? C.sac;
  const kol = (aci: number, taraf: 1 | -1) => (
    <g transform={`translate(${taraf * 74},-525) rotate(${aci * taraf})`}>
      <rect x={-20} y={0} width={40} height={210} rx={20} fill={ten} {...CIZ} />
      {p.ustTip === 'tisort' || !p.ustTip ? <rect x={-25} y={-8} width={50} height={78} rx={18} fill={ust} {...CIZ} /> :
        <rect x={-24} y={-8} width={48} height={190} rx={20} fill={ust} {...CIZ} />}
      <circle cx={0} cy={212} r={22} fill={ten} {...CIZ} />
    </g>
  );
  return (
    <g transform={`translate(${p.x},${p.y}) scale(${s}) rotate(${p.egil ?? 0} 0 -300)`}>
      {/* bacaklar */}
      <rect x={-58} y={-318} width={54} height={300} rx={20} fill={alt} {...CIZ} />
      <rect x={4} y={-318} width={54} height={300} rx={20} fill={alt} {...CIZ} />
      {p.kot && <g>
        <path d="M -31 -300 L -31 -30 M 31 -300 L 31 -30" stroke={C.sari} strokeWidth={3} strokeDasharray="8 7" fill="none" opacity={0.8} />
        <path d="M -54 -300 Q -40 -250 -10 -262" fill="none" stroke={C.kotKoyu} strokeWidth={5} />
        {Array.from({length: p.percin ?? 0}).map((_, i) => (
          <circle key={i} cx={[-50, -12, 12, 50][i % 4]} cy={-292} r={7} fill={C.bakir} stroke={C.murekkep} strokeWidth={3} />
        ))}
      </g>}
      <ellipse cx={-34} cy={-10} rx={44} ry={20} fill={C.murekkep} />
      <ellipse cx={34} cy={-10} rx={44} ry={20} fill={C.murekkep} />
      {/* gövde */}
      <g transform={`translate(0,${nefes})`}>
        {kol(p.solKol ?? 8, -1)}
        <rect x={-82} y={-560} width={164} height={268} rx={46} fill={ust} {...CIZ} />
        {p.ustTip === 'ceket' && <path d="M 0 -556 L -30 -470 L 0 -300 L 30 -470 Z" fill={C.beyaz} {...CIZ} strokeWidth={4} />}
        {p.ustTip === 'yelek' && <path d="M -60 -540 L -60 -300 L 60 -300 L 60 -540 L 20 -540 L 0 -440 L -20 -540 Z" fill={C.ahsapKoyu} {...CIZ} strokeWidth={4} />}
        {p.onluk && <rect x={-60} y={-470} width={120} height={230} rx={14} fill="#e9d8b6" {...CIZ} strokeWidth={4} />}
        {(p.ustTip === 'tisort' || !p.ustTip) && <path d="M -36 -556 Q 0 -526 36 -556" fill="none" {...CIZ} strokeWidth={5} />}
        {p.children}
        {kol(p.sagKol ?? 8, 1)}
        {/* boyun ve baş */}
        <rect x={-22} y={-600} width={44} height={50} fill={ten} {...CIZ} />
        <g transform={`translate(${p.bakis ?? 0},0)`}>
          <circle cx={0} cy={-664} r={74} fill={ten} {...CIZ} />
          {p.sacTip !== 'kel' && (p.sacTip === 'uzun'
            ? <path d="M -78 -660 Q -84 -760 0 -750 Q 84 -760 80 -660 L 86 -560 Q 60 -590 56 -680 Q 0 -700 -56 -680 Q -60 -590 -86 -560 Z" fill={sac} {...CIZ} />
            : <path d="M -76 -668 Q -78 -752 0 -746 Q 78 -752 76 -668 Q 46 -716 0 -704 Q -46 -716 -76 -668 Z" fill={sac} {...CIZ} />)}
          <g transform={`translate(0,-668) scale(1,${kirp})`}>
            <circle cx={-26} cy={0} r={8} fill={C.murekkep} />
            <circle cx={26} cy={0} r={8} fill={C.murekkep} />
          </g>
          {p.yuz === 'sasir'
            ? <g><ellipse cx={0} cy={-618} rx={13} ry={17} fill={C.murekkep} /><path d="M -42 -702 L -14 -712 M 14 -712 L 42 -702" {...CIZ} strokeWidth={5} /></g>
            : p.yuz === 'kararli' ? <path d="M -22 -622 L 22 -622" {...CIZ} strokeWidth={6} />
            : p.yuz === 'duz' ? <path d="M -18 -622 Q 0 -616 18 -622" fill="none" {...CIZ} strokeWidth={6} />
            : <path d="M -26 -630 Q 0 -602 26 -630" fill="none" {...CIZ} strokeWidth={6} />}
          <circle cx={-46} cy={-636} r={10} fill="#f08a7a" opacity={0.45} />
          <circle cx={46} cy={-636} r={10} fill="#f08a7a" opacity={0.45} />
          {p.biyik && <path d="M -34 -640 Q -16 -652 0 -640 Q 16 -652 34 -640 Q 16 -630 0 -638 Q -16 -630 -34 -640 Z" fill={C.sac} {...CIZ} strokeWidth={3} />}
          {p.sapka === 'melon' && <g><ellipse cx={0} cy={-726} rx={98} ry={18} fill={C.murekkep} /><path d="M -60 -728 Q -62 -800 0 -804 Q 62 -800 60 -728 Z" fill={C.murekkep} /></g>}
          {p.sapka === 'baret' && <g><path d="M -84 -700 Q -84 -800 0 -804 Q 84 -800 84 -700 Z" fill={C.sari} {...CIZ} /><circle cx={0} cy={-756} r={20} fill="#fff6c8" {...CIZ} strokeWidth={4} /></g>}
          {p.sapka === 'denizci' && <g><ellipse cx={0} cy={-732} rx={80} ry={22} fill={C.beyaz} {...CIZ} /><rect x={-60} y={-760} width={120} height={30} rx={10} fill={C.beyaz} {...CIZ} /></g>}
        </g>
      </g>
    </g>
  );
};

// ---- askıdaki tişört
const AskiTisort: React.FC<{x: number; y: number; s?: number; aci?: number; renk?: string}> = ({x, y, s = 1, aci = 0, renk = C.beyaz}) => (
  <g transform={`translate(${x},${y}) rotate(${aci}) scale(${s})`}>
    <path d="M 0 -40 Q 0 -70 22 -66 M -90 10 L 0 -30 L 90 10" fill="none" {...CIZ} strokeWidth={5} />
    <path d="M -60 0 L -130 40 L -100 100 L -66 84 L -66 260 L 66 260 L 66 84 L 100 100 L 130 40 L 60 0 Q 0 30 -60 0 Z" fill={renk} {...CIZ} />
  </g>
);

const Kot: React.FC<{x: number; y: number; s?: number; yirtik?: boolean; percin?: number; renk?: string}> = ({x, y, s = 1, yirtik, percin = 0, renk = '#8a6a43'}) => (
  <g transform={`translate(${x},${y}) scale(${s})`}>
    <path d="M -90 0 L 90 0 L 100 300 L 20 300 L 0 90 L -20 300 L -100 300 Z" fill={renk} {...CIZ} />
    <path d="M -86 26 L 86 26" {...CIZ} strokeWidth={4} />
    <path d="M -80 40 Q -50 90 -16 70 M 80 40 Q 50 90 16 70" fill="none" {...CIZ} strokeWidth={4} />
    {yirtik && <path d="M 50 150 L 62 168 L 48 182 L 64 198" fill="none" stroke={C.kagit} strokeWidth={7} />}
    {[[-78, 44], [-18, 70], [18, 70], [78, 44]].slice(0, percin).map(([cx, cy], i) => (
      <g key={i}><circle cx={cx} cy={cy} r={15} fill={C.bakir} stroke={C.murekkep} strokeWidth={4} /><circle cx={cx - 4} cy={cy - 4} r={5} fill="#ffe0b0" /></g>
    ))}
  </g>
);

const Parilti: React.FC<{x: number; y: number; u: number; r?: number; renk?: string}> = ({x, y, u, r = 40, renk = C.sari}) =>
  u <= 0 || u >= 1 ? null : (
    <g transform={`translate(${x},${y}) scale(${Math.sin(u * Math.PI) * 1.2}) rotate(${u * 90})`} opacity={Math.sin(u * Math.PI)}>
      <path d={`M 0 ${-r} L ${r * 0.22} ${-r * 0.22} L ${r} 0 L ${r * 0.22} ${r * 0.22} L 0 ${r} L ${-r * 0.22} ${r * 0.22} L ${-r} 0 L ${-r * 0.22} ${-r * 0.22} Z`} fill={renk} stroke={C.murekkep} strokeWidth={3} />
    </g>
  );

// ---- mekânlar (her biri ODA genişliğinde, yan yana)
const Bugun: React.FC<{t: number}> = ({t}) => {
  const ders = gir(t, an(9, 0), 0.7), soru = gir(t, an(10, 0), 0.8);
  const ilk = 1 - gir(t, an(1, 0), 0.5); // kanca ilk karede tam görünür
  const madenci = gir(t, an(1, 3), 0.5) * (1 - gir(t, an(2, 0), 0.4));
  return (
    <g>
      <rect x={0} y={0} width={ODA} height={1920} fill="url(#gokGun)" />
      {[[30, 640, 220, '#f4a261'], [260, 560, 200, '#e76f51'], [470, 700, 160, '#2a9d8f'], [640, 600, 220, '#e9c46a'], [870, 660, 200, '#8ab17d']].map(([x, h, w, c], i) => (
        <g key={i}><rect x={x as number} y={ZEMIN - (h as number)} width={w as number} height={h as number} fill={c as string} {...CIZ} />
          {Array.from({length: 4}).map((_, j) => <rect key={j} x={(x as number) + 30 + (j % 2) * 80} y={ZEMIN - (h as number) + 50 + Math.floor(j / 2) * 120} width={50} height={70} rx={8} fill="#fff3d6" {...CIZ} strokeWidth={4} />)}
        </g>
      ))}
      <rect x={0} y={ZEMIN} width={ODA} height={600} fill="#cdb99a" {...CIZ} />
      <path d={`M 0 ${ZEMIN + 140} L ${ODA} ${ZEMIN + 140}`} stroke="#b39f80" strokeWidth={6} />
      {/* bugünün askıları (son soru) */}
      <g opacity={soru} transform={`translate(${karis(1180, 860, soru)},0)`}>
        <path d={`M -120 ${ZEMIN - 700} L 120 ${ZEMIN - 700} M -110 ${ZEMIN - 700} L -110 ${ZEMIN} M 110 ${ZEMIN - 700} L 110 ${ZEMIN}`} {...CIZ} strokeWidth={10} fill="none" />
        <AskiTisort x={-40} y={ZEMIN - 620} s={0.55} renk={C.mor} aci={Math.sin(t * 2) * 4} />
        <AskiTisort x={50} y={ZEMIN - 610} s={0.55} renk={C.yesil} aci={Math.sin(t * 2 + 1) * 4} />
        <g transform={`translate(0,${ZEMIN - 860}) scale(${zipla(t, an(10, 4))})`}>
          <circle r={70} fill={C.sari} {...CIZ} />
          <text y={30} textAnchor="middle" fontFamily={INTER} fontWeight={900} fontSize={90} fill={C.murekkep}>?</text>
        </g>
      </g>
      <Kisi t={t} x={karis(540, 400, soru)} y={ZEMIN} s={1.22} ustTip="tisort" kot percin={0} sacTip="uzun" sac={C.sac2}
        yuz={soru > 0.5 ? 'gulumse' : 'gulumse'} sagKol={soru > 0 ? karis(8, -60, soru) : 8} solKol={8 + Math.sin(t * 1.3) * 3} bakis={karis(0, 10, soru)} />
      {/* kot yanında maden işareti */}
      <g opacity={madenci} transform={`translate(760,${ZEMIN - 230})`}>
        <circle r={56} fill="#ffcf6b" opacity={0.5} />
        <rect x={-24} y={-40} width={48} height={70} rx={10} fill="#5b4a3a" {...CIZ} />
        <rect x={-14} y={-26} width={28} height={36} rx={6} fill="#ffe28a" />
        <path d="M 90 -60 L 160 40 M 60 -40 Q 110 -90 170 -60" {...CIZ} strokeWidth={10} fill="none" />
      </g>
      {/* ders etiketleri */}
      <g opacity={ders * (1 - soru)}>
        <g transform={`translate(${540 + 160},${ZEMIN - 640})`}><rect x={0} y={-36} width={260} height={72} rx={36} fill={C.lacivert} {...CIZ} />
          <text x={130} y={14} textAnchor="middle" fontFamily={INTER} fontWeight={900} fontSize={34} fill="#fff">1900 · DENİZ</text></g>
        <g transform={`translate(${540 - 420},${ZEMIN - 230})`}><rect x={0} y={-36} width={260} height={72} rx={36} fill={C.ahsapKoyu} {...CIZ} />
          <text x={130} y={14} textAnchor="middle" fontFamily={INTER} fontWeight={900} fontSize={34} fill="#fff">1873 · MADEN</text></g>
      </g>
      {/* ilk cümle: dev yazı */}
      <g opacity={ilk} transform="translate(540,300)">
        <text textAnchor="middle" fontFamily={INTER} fontWeight={900} fontSize={92} fill="#fff" stroke={C.murekkep} strokeWidth={16} paintOrder="stroke">BU TİŞÖRT</text>
        <text y={104} textAnchor="middle" fontFamily={INTER} fontWeight={900} fontSize={92} fill={C.sari} stroke={C.murekkep} strokeWidth={16} paintOrder="stroke">İÇ ÇAMAŞIRIYDI</text>
      </g>
      <g opacity={ders} transform="translate(540,300)">
        <text textAnchor="middle" fontFamily={INTER} fontWeight={900} fontSize={70} fill="#fff" stroke={C.murekkep} strokeWidth={14} paintOrder="stroke">DÜNÜN İÇ ÇAMAŞIRI</text>
        <text y={86} textAnchor="middle" fontFamily={INTER} fontWeight={900} fontSize={70} fill={C.sari} stroke={C.murekkep} strokeWidth={14} paintOrder="stroke">VE İŞ KIYAFETİ</text>
      </g>
    </g>
  );
};

const Terzi: React.FC<{t: number}> = ({t}) => {
  const b = an(2, 0);
  const vuruslar = K.filter((k) => k.c === 2).slice(-3).map((k) => k.s); // "bakır perçin çaktı"
  const cekic = vuruslar.reduce((a, v) => Math.max(a, t >= v - 0.15 && t < v + 0.25 ? Math.sin(((t - v + 0.15) / 0.4) * Math.PI) : 0), 0);
  const percin = vuruslar.filter((v) => t >= v).length + (t >= anSon(2) ? 1 : 0);
  return (
    <g>
      <rect x={0} y={0} width={ODA} height={ZEMIN} fill="#e7c48f" />
      {Array.from({length: 9}).map((_, i) => <path key={i} d={`M ${i * 130} 0 L ${i * 130} ${ZEMIN}`} stroke="#d4ab73" strokeWidth={8} />)}
      <rect x={0} y={ZEMIN} width={ODA} height={600} fill={C.ahsap} {...CIZ} />
      {/* takvim 1873 */}
      <g transform={`translate(150,330) rotate(-4) scale(${zipla(t, an(2, 1) - 0.1)})`}>
        <rect x={-110} y={-80} width={220} height={190} rx={10} fill={C.beyaz} {...CIZ} />
        <rect x={-110} y={-80} width={220} height={52} rx={10} fill={C.kirmizi} {...CIZ} />
        <text y={70} textAnchor="middle" fontFamily={INTER} fontWeight={900} fontSize={76} fill={C.murekkep}>1873</text>
      </g>
      {/* kumaş rafı */}
      <rect x={640} y={250} width={380} height={24} fill={C.ahsapKoyu} {...CIZ} />
      {[0, 1, 2, 3].map((i) => <rect key={i} x={660 + i * 90} y={150} width={70} height={100} rx={30} fill={[C.kot, '#8a6a43', '#c9a96e', C.kotKoyu][i]} {...CIZ} />)}
      {/* tezgâh ve pantolon */}
      <rect x={90} y={ZEMIN - 300} width={620} height={46} fill={C.ahsapKoyu} {...CIZ} />
      <rect x={120} y={ZEMIN - 254} width={36} height={254} fill={C.ahsapKoyu} {...CIZ} />
      <rect x={644} y={ZEMIN - 254} width={36} height={254} fill={C.ahsapKoyu} {...CIZ} />
      <g transform={`translate(400,${ZEMIN - 300}) rotate(-90)`}><Kot x={0} y={-100} s={0.95} yirtik={percin === 0} percin={Math.min(4, percin)} /></g>
      {vuruslar.map((v, i) => <Parilti key={i} x={[260, 330, 420][i]} y={ZEMIN - 370} u={(t - v) / 0.5} />)}
      <Kisi t={t} x={830} y={ZEMIN} s={1.12} ustTip="gomlek" ust="#f1e4c8" alt="#5b4a3a" sacTip="kisa" biyik yelek onluk={false}
        solKol={karis(10, -100, gir(t, b + 1.2, 0.6))} sagKol={8} yuz={percin >= 3 ? 'gulumse' : 'kararli'} bakis={-10}>
        {/* çekiç sol elde */}
      </Kisi>
      <g transform={`translate(${830 - 1.12 * 74},${ZEMIN - 1.12 * 525}) rotate(${-karis(10, -100, gir(t, b + 1.2, 0.6)) + cekic * 35})`}>
        <g transform={`translate(0,${1.12 * 212}) rotate(-90)`}>
          <rect x={-8} y={-10} width={16} height={130} rx={6} fill={C.ahsapKoyu} {...CIZ} strokeWidth={4} />
          <rect x={-36} y={110} width={72} height={36} rx={8} fill="#8d99a6" {...CIZ} strokeWidth={4} />
        </g>
      </g>
    </g>
  );
};

const Maden: React.FC<{t: number}> = ({t}) => {
  const salla = Math.sin((t - an(3, 0)) * 5.5);
  const efsane = gir(t, an(3, 4) - 0.1, 0.5);
  return (
    <g>
      <rect x={0} y={0} width={ODA} height={1920} fill="#4a3426" />
      <path d={`M 0 200 Q 540 60 ${ODA} 200 L ${ODA} ${ZEMIN} L 0 ${ZEMIN} Z`} fill="#6b4a33" {...CIZ} />
      {[180, 900].map((x) => <g key={x}><rect x={x - 26} y={240} width={52} height={ZEMIN - 240} fill={C.ahsap} {...CIZ} /></g>)}
      <rect x={130} y={230} width={820} height={52} fill={C.ahsap} {...CIZ} />
      <circle cx={540} cy={330} r={300} fill="url(#fener)" />
      <g transform="translate(540,300)"><path d="M 0 -50 L 0 0" {...CIZ} /><rect x={-30} y={0} width={60} height={80} rx={12} fill="#5b4a3a" {...CIZ} /><rect x={-18} y={14} width={36} height={48} rx={6} fill="#ffe28a" /></g>
      {[[200, 1100, 60], [820, 1180, 80], [700, 1240, 50]].map(([x, y, r], i) => <circle key={i} cx={x} cy={y} r={r} fill="#7d5a40" {...CIZ} />)}
      <rect x={0} y={ZEMIN} width={ODA} height={600} fill="#3a281d" {...CIZ} />
      <Kisi t={t} x={500} y={ZEMIN} s={1.15} ust="#7a4a26" ustTip="gomlek" kot percin={4} sapka="baret" sacTip="kisa"
        solKol={-20} sagKol={150 + salla * 35} yuz="kararli" egil={salla * 4} />
      <g transform={`translate(${500 + 1.15 * 74},${ZEMIN - 1.15 * 525}) rotate(${150 + salla * 35})`}>
        <g transform={`translate(0,${1.15 * 220}) rotate(180)`}>
          <rect x={-8} y={-160} width={16} height={240} rx={6} fill={C.ahsapKoyu} {...CIZ} strokeWidth={4} />
          <path d="M -90 -160 Q 0 -210 90 -160 L 80 -150 Q 0 -185 -80 -150 Z" fill="#8d99a6" {...CIZ} strokeWidth={4} />
        </g>
      </g>
      <Parilti x={470} y={ZEMIN - 200} u={efsane * 0.999} r={60} />
      <Parilti x={560} y={ZEMIN - 300} u={gir(t, an(3, 4) + 0.15, 0.5) * 0.999} r={40} />
    </g>
  );
};

const Gemi: React.FC<{t: number}> = ({t}) => {
  const ceket = gir(t, an(4, 6) - 0.2, 0.9); // "üniforması altına"
  const dalga = Math.sin(t * 2) * 10;
  return (
    <g>
      <rect x={0} y={0} width={ODA} height={1920} fill="url(#gokGun)" />
      <rect x={0} y={760} width={ODA} height={600} fill={C.deniz} />
      {[0, 1, 2].map((i) => <path key={i} d={`M -40 ${820 + i * 90 + dalga} Q 120 ${790 + i * 90} 270 ${820 + i * 90 + dalga} T 580 ${820 + i * 90 + dalga} T 890 ${820 + i * 90 + dalga} T 1200 ${820 + i * 90 + dalga}`} fill="none" stroke="#bfe6ff" strokeWidth={6} />)}
      <rect x={0} y={ZEMIN - 40} width={ODA} height={640} fill="#c58b55" {...CIZ} />
      {Array.from({length: 8}).map((_, i) => <path key={i} d={`M ${i * 140} ${ZEMIN - 40} L ${i * 140 - 60} 1920`} stroke="#a8743f" strokeWidth={6} />)}
      <rect x={880} y={180} width={30} height={ZEMIN - 220} fill={C.ahsapKoyu} {...CIZ} />
      <path d={`M 910 220 L 1060 320 L 910 420 Z`} fill={C.kirmizi} {...CIZ} />
      <g transform={`translate(170,${ZEMIN - 380})`}><circle r={80} fill="none" stroke={C.kirmizi} strokeWidth={34} /><circle r={80} fill="none" stroke={C.beyaz} strokeWidth={34} strokeDasharray="42 42" /><circle r={97} fill="none" {...CIZ} /><circle r={63} fill="none" {...CIZ} /></g>
      <Kisi t={t} x={540} y={ZEMIN - 40} s={1.15} ustTip="tisort" alt={C.lacivert} sapka="denizci" sacTip="kisa"
        solKol={karis(8, 40, ceket)} sagKol={karis(8, 40, ceket)} yuz="gulumse">
        <g opacity={ceket} transform={`translate(${karis(-260, 0, ceket)},0)`}>
          <rect x={-86} y={-562} width={172} height={274} rx={44} fill={C.lacivert} {...CIZ} />
          <path d="M -40 -560 L 0 -470 L 40 -560" fill={C.beyaz} {...CIZ} strokeWidth={4} />
          {[0, 1, 2].map((i) => <circle key={i} cx={0} cy={-440 + i * 50} r={7} fill={C.sari} />)}
        </g>
      </Kisi>
    </g>
  );
};

const Sokak1900: React.FC<{t: number}> = ({t}) => {
  const sok = gir(t, an(5, 3) - 0.2, 0.4);
  const soru = t >= an(6, 0) ? Math.sin((t - an(6, 0)) * 3.2) * 9 * Math.exp(-(t - an(6, 0)) * 0.6) : 0;
  return (
    <g>
      <rect x={0} y={0} width={ODA} height={1920} fill="#f0d9a8" />
      {[[0, 700, 360, '#b5654a'], [360, 640, 360, '#8a6a9c'], [720, 720, 360, '#5f8a6e']].map(([x, h, w, c], i) => (
        <g key={i}><rect x={x as number} y={ZEMIN - (h as number)} width={w as number} height={h as number} fill={c as string} {...CIZ} />
          <rect x={(x as number) + 60} y={ZEMIN - (h as number) + 80} width={240} height={140} rx={10} fill="#ffeec8" {...CIZ} strokeWidth={4} /></g>
      ))}
      <rect x={0} y={ZEMIN} width={ODA} height={600} fill="#9c8f80" {...CIZ} />
      {Array.from({length: 24}).map((_, i) => <ellipse key={i} cx={(i % 8) * 140 + (Math.floor(i / 8) % 2) * 70 + 40} cy={ZEMIN + 60 + Math.floor(i / 8) * 90} rx={56} ry={26} fill="#b3a798" stroke="#7e7264" strokeWidth={4} />)}
      <g><rect x={140} y={ZEMIN - 680} width={20} height={680} fill={C.murekkep} /><rect x={110} y={ZEMIN - 760} width={80} height={90} rx={12} fill="#ffe28a" {...CIZ} /></g>
      {/* vitrinde askıda tişört */}
      <rect x={430} y={ZEMIN - 620} width={240} height={320} rx={12} fill="#fff6dc" {...CIZ} />
      <AskiTisort x={550} y={ZEMIN - 560} s={0.7} aci={soru} />
      <Kisi t={t} x={260} y={ZEMIN} s={1.02} ustTip="ceket" ust="#3a3a48" alt="#3a3a48" sapka="melon" biyik sacTip="kisa" yuz={sok > 0.5 ? 'sasir' : 'duz'} bakis={14} egil={-sok * 5} />
      <Kisi t={t} x={850} y={ZEMIN} s={1.02} ustTip="ceket" ust="#5a3e2b" alt="#4a3a30" sapka="melon" sacTip="kisa" ten={C.ten2} yuz={sok > 0.5 ? 'sasir' : 'duz'} bakis={-14} egil={sok * 5}
        sagKol={karis(8, -150, sok)} />
    </g>
  );
};

const Sinema: React.FC<{t: number}> = ({t}) => {
  const isik = 0.55 + Math.sin(t * 9) * 0.05;
  const silu = gir(t, an(7, 2), 0.6);
  return (
    <g>
      <rect x={0} y={0} width={ODA} height={1920} fill="#1d2550" />
      {Array.from({length: 30}).map((_, i) => <circle key={i} cx={(i * 197) % ODA} cy={(i * 131) % 600 + 60} r={i % 3 === 0 ? 4 : 2.5} fill="#fff" opacity={0.5 + 0.5 * Math.sin(t * 2 + i)} />)}
      <path d={`M 540 ${ZEMIN - 60} L 170 300 L 910 300 Z`} fill="#fff8d0" opacity={0.12 * isik * 2} />
      <rect x={150} y={230} width={780} height={560} rx={8} fill="#f5efd8" {...CIZ} />
      <rect x={520} y={790} width={40} height={ZEMIN - 790} fill={C.murekkep} />
      {/* perdede genel bir "asi genç" silueti: gerçek kişi değil */}
      <g opacity={silu} transform="translate(540,760) scale(0.85)">
        <Kisi t={t} x={0} y={0} s={0.95} ustTip="tisort" kot ten="#3a3550" sac="#1a1726" alt="#2a4f8c" yuz="duz" solKol={-25} sagKol={20} egil={-4} />
      </g>
      <rect x={0} y={ZEMIN} width={ODA} height={600} fill="#2a2f3d" {...CIZ} />
      {[[250, '#e2483d'], [790, '#3fae9b']].map(([x, c], i) => (
        <g key={i} transform={`translate(${x},${ZEMIN - 20})`}>
          <path d="M -200 0 L -190 -110 Q -120 -200 0 -200 Q 120 -200 190 -110 L 200 0 Z" fill={c as string} {...CIZ} />
          <path d="M -120 -110 Q -80 -180 0 -180 Q 80 -180 120 -110 Z" fill="#9ad0ff" {...CIZ} strokeWidth={4} />
          <circle cx={-40} cy={-140} r={26} fill={C.sac} /><circle cx={40} cy={-140} r={26} fill={C.sac2} />
          <circle cx={-120} cy={0} r={40} fill={C.murekkep} /><circle cx={120} cy={0} r={40} fill={C.murekkep} />
        </g>
      ))}
    </g>
  );
};

const Okul: React.FC<{t: number}> = ({t}) => {
  const yasak = zipla(t, an(8, 2) - 0.15);
  const sonra = an(8, 4);
  const gencler = [[150, 0.82], [930, 0.82], [300, 0.9], [780, 0.9], [440, 0.98], [640, 0.98]];
  return (
    <g>
      <rect x={0} y={0} width={ODA} height={1920} fill="url(#gokGun)" />
      <rect x={90} y={360} width={900} height={ZEMIN - 360} fill="#d9785a" {...CIZ} />
      <path d="M 60 380 L 540 170 L 1020 380 Z" fill="#8c3b2b" {...CIZ} />
      {[0, 1, 2, 3].map((i) => <rect key={i} x={140 + i * 210} y={450} width={150} height={170} rx={10} fill="#ffeec8" {...CIZ} strokeWidth={4} />)}
      <rect x={400} y={ZEMIN - 380} width={280} height={380} rx={14} fill={C.ahsapKoyu} {...CIZ} />
      {/* kapıda yasak levhası: kot simgesi + çapraz */}
      <g transform={`translate(540,${ZEMIN - 560}) scale(${yasak})`}>
        <circle r={150} fill={C.beyaz} {...CIZ} />
        <g transform="translate(0,-96) scale(0.62)"><Kot x={0} y={0} renk="#4f86d6" percin={4} /></g>
        <circle r={132} fill="none" stroke={C.kirmizi} strokeWidth={24} />
        <path d="M -93 -93 L 93 93" stroke={C.kirmizi} strokeWidth={24} />
      </g>
      <rect x={0} y={ZEMIN} width={ODA} height={600} fill="#bcae96" {...CIZ} />
      {gencler.map(([x, s], i) => {
        const u = zipla(t, sonra + i * 0.28, 0.4);
        return u <= 0 ? null : (
          <g key={i} opacity={Math.min(1, u)}>
            <Kisi t={t} x={x} y={ZEMIN + 10 + i * 6} s={(s as number) * u} ustTip="tisort" kot ust={[C.beyaz, C.sari, C.kirmizi, C.beyaz, C.mor, C.yesil][i]}
              sacTip={i % 2 ? 'uzun' : 'kisa'} sac={i % 3 ? C.sac : C.sac2} ten={i % 2 ? C.ten2 : C.ten} yuz="gulumse" sagKol={i % 2 ? -40 : 8} />
          </g>
        );
      })}
    </g>
  );
};

// ---- kamera: [başlangıç, süre, oda, y merkezi, yakınlık]
type Ana = {t: number; d: number; x: number; y: number; z: number};
const kameraPlani = (): Ana[] => {
  const o = (i: number) => i * ODA + 540;
  return [
    {t: 0, d: 0.01, x: o(0), y: 960, z: 1},
    {t: an(1, 0) - 0.1, d: 0.9, x: o(0) + 60, y: ZEMIN - 380, z: 1.3},            // kota iner
    {t: an(2, 0) - 0.15, d: 0.6, x: o(0) - 20, y: ZEMIN - 300, z: 3.2},           // cebin içine girer
    {t: an(2, 0) + 0.45, d: 0.01, x: o(1), y: 1000, z: 1.35},                     // terzi dükkânı (kumaşın içinden)
    {t: an(2, 0) + 0.5, d: 1.0, x: o(1), y: 960, z: 1},
    {t: an(3, 0) - 0.2, d: 1.0, x: o(2), y: 960, z: 1},                          // maden
    {t: an(3, 4) - 0.2, d: 0.8, x: o(2) - 20, y: ZEMIN - 260, z: 1.35},           // "efsane": pantolona yakın
    {t: an(4, 0) - 0.2, d: 1.1, x: o(3), y: 960, z: 1},                          // gemi
    {t: an(4, 6) - 0.3, d: 1.0, x: o(3), y: ZEMIN - 520, z: 1.3},
    {t: an(5, 0) - 0.2, d: 1.0, x: o(4), y: 960, z: 1},                          // 1900 sokağı
    {t: an(6, 0) - 0.1, d: 1.4, x: o(4) + 10, y: ZEMIN - 470, z: 1.6},            // "Nasıl mı değişti?" askıya yaklaş, dur
    {t: an(7, 0) - 0.2, d: 1.1, x: o(5), y: 960, z: 1},                          // sinema
    {t: an(8, 0) - 0.2, d: 1.0, x: o(6), y: 960, z: 1},                          // okul
    {t: an(9, 0) - 0.4, d: 1.1, x: o(0), y: 960, z: 1},                          // ilk kareye dönüş
    {t: an(10, 0) - 0.1, d: 1.2, x: o(0) + 60, y: 900, z: 1.08},
  ];
};
const kamera = (t: number) => {
  const p = kameraPlani();
  let c = {x: p[0].x, y: p[0].y, z: p[0].z};
  for (const a of p) {
    if (t < a.t) break;
    const u = gir(t, a.t, a.d);
    c = {x: karis(c.x, a.x, u), y: karis(c.y, a.y, u), z: karis(c.z, a.z, u)};
  }
  return c;
};

// ---- altyazı: 3'er kelime, büyük harf (tr), söylenen kelime sarı
const Altyazi: React.FC<{t: number}> = ({t}) => {
  const aktif = K.filter((k) => k.s - 0.05 <= t && t <= SON).pop();
  if (!aktif || t > aktif.e + 0.6 && K.indexOf(aktif) === K.length - 1) return null;
  const satir = K.filter((k) => k.c === aktif.c);
  const i = satir.indexOf(aktif), g = Math.floor(i / 3);
  const grup = satir.slice(g * 3, g * 3 + 3);
  return (
    <div style={{position: 'absolute', left: 60, right: 60, top: 1395, textAlign: 'center', fontFamily: `${INTER}, sans-serif`, fontWeight: 900,
      fontSize: 74, lineHeight: 1.15, letterSpacing: 1}}>
      {grup.map((k, j) => (
        <span key={j} style={{color: k === aktif ? C.sari : '#fff', WebkitTextStroke: '10px #1b1420', paintOrder: 'stroke fill',
          textShadow: '0 6px 0 rgba(0,0,0,.35)'}}>{k.w.toLocaleUpperCase('tr-TR')}{' '}</span>
      ))}
    </div>
  );
};

const Video: React.FC = () => {
  const t = useCurrentFrame() / FPS;
  const c = kamera(t);
  // cebin içine girişte kumaş rengi perde
  const perde = interpolate(t, [an(2, 0) - 0.05, an(2, 0) + 0.3, an(2, 0) + 0.5, an(2, 0) + 0.9], [0, 1, 1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  return (
    <AbsoluteFill style={{background: '#1b1420'}}>
      <Audio src={staticFile('kombin/ses.mp3')} />
      <svg width={1080} height={1920} viewBox="0 0 1080 1920">
        <defs>
          <linearGradient id="gokGun" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#7cc4f0" /><stop offset="1" stopColor="#d8f0ff" /></linearGradient>
          <radialGradient id="fener"><stop offset="0" stopColor="#ffd77a" stopOpacity="0.55" /><stop offset="1" stopColor="#ffd77a" stopOpacity="0" /></radialGradient>
          <radialGradient id="vinyet" cx="0.5" cy="0.45" r="0.75"><stop offset="0.6" stopColor="#000" stopOpacity="0" /><stop offset="1" stopColor="#000" stopOpacity="0.35" /></radialGradient>
          <filter id="gren"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves={2} seed={Math.floor(t * 12) % 7} /><feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.05 0" /></filter>
        </defs>
        <g transform={`translate(540,960) scale(${c.z}) translate(${-c.x},${-c.y})`}>
          {[Bugun, Terzi, Maden, Gemi, Sokak1900, Sinema, Okul].map((Oda, i) => (
            Math.abs(c.x - (i * ODA + 540)) < ODA * 1.6 ? <g key={i} transform={`translate(${i * ODA},0)`}><Oda t={t} /></g> : null
          ))}
        </g>
        <rect width={1080} height={1920} fill={C.kotKoyu} opacity={perde} />
        <rect width={1080} height={1920} filter="url(#gren)" />
        <rect width={1080} height={1920} fill="url(#vinyet)" />
      </svg>
      <Altyazi t={t} />
      <div style={{position: 'absolute', bottom: 70, width: '100%', textAlign: 'center', fontFamily: INTER, fontWeight: 900, fontSize: 30,
        letterSpacing: 6, color: 'rgba(255,255,255,.8)', textShadow: '0 2px 6px rgba(0,0,0,.6)'}}>ANTİK STÜDYO</div>
    </AbsoluteFill>
  );
};

export const Root: React.FC = () => (
  <Composition id="Kombin" component={Video} durationInFrames={Math.ceil(SON * FPS)} fps={FPS} width={1080} height={1920} />
);
