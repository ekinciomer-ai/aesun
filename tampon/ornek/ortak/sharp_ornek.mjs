import sharp from 'sharp';
const G = process.env.GIRDI, C = process.env.CIKTI, src = `${G}/astronot.jpg`;
const w = 360;
const islem = {
  '1_orijinal': s => s,
  '2_gri': s => s.grayscale(),
  '3_bulanik': s => s.blur(6),
  '4_keskin_kontrast': s => s.sharpen({ sigma: 2 }).linear(1.4, -40),
  '5_sepya_ton': s => s.tint({ r: 160, g: 120, b: 80 }),
  '6_negatif': s => s.negate({ alpha: false }),
};
const parcalar = [];
for (const [ad, f] of Object.entries(islem)) {
  const b = await f(sharp(src).resize(w, w, { fit: 'cover' })).jpeg({ quality: 85 }).toBuffer();
  parcalar.push(b);
}
const tuval = sharp({ create: { width: w * 3, height: w * 2, channels: 3, background: '#fff' } })
  .composite(parcalar.map((b, i) => ({ input: b, left: (i % 3) * w, top: Math.floor(i / 3) * w })));
await tuval.jpeg({ quality: 85 }).toFile(`${C}/sharp_6_islem.jpg`);
const t0 = Date.now();
for (let i = 0; i < 50; i++) await sharp(src).resize(1080).webp({ quality: 80 }).toBuffer();
console.log('50 görsel 1080px webp:', Date.now() - t0, 'ms');
