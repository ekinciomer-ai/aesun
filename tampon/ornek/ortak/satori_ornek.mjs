import satori from 'satori'; import { Resvg } from '@resvg/resvg-js'; import fs from 'fs';
const C = process.env.CIKTI;
const font = fs.readFileSync('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf');
const h = (type, style, children) => ({ type, props: { style, children } });
const kart = (baslik, sayi, birim, alt, renk) => h('div', { width: 1080, height: 1080, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: 80, background: '#f4f4f2', fontFamily: 'D', color: '#16181b' }, [
  h('div', { display: 'flex', alignItems: 'center', gap: 20, fontSize: 40 }, [h('div', { width: 14, height: 60, background: renk }), baslik]),
  h('div', { display: 'flex', alignItems: 'flex-end', gap: 16 }, [h('div', { fontSize: 260, lineHeight: 1 }, sayi), h('div', { fontSize: 90, color: renk, marginBottom: 30 }, birim)]),
  h('div', { fontSize: 36, color: '#8b8f95' }, alt)]);
const isler = [['kart_ruzgar', kart('Dongfang 26 MW türbin', '153', 'm', 'Tek kanat uzunluğu · kaynak: offshoreWIND.biz', '#3d8fe0')],
               ['kart_hoover', kart('Hoover Barajı', '2.080', 'MW', '17 jeneratör · kaynak: EIA', '#1590b5')]];
const t0 = Date.now();
for (const [ad, el] of isler) {
  const svg = await satori(el, { width: 1080, height: 1080, fonts: [{ name: 'D', data: font, weight: 700 }] });
  fs.writeFileSync(`${C}/satori_${ad}.png`, new Resvg(svg).render().asPng());
}
console.log('2 kart', Date.now() - t0, 'ms');
