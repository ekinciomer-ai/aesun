import React from 'react';
import {AbsoluteFill, Sequence, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';

const yazi = 'Poppins, Inter, sans-serif';
const Mesaj: React.FC<{kim: string; metin: string; sag?: boolean; top: number; bas: number}> = ({kim, metin, sag, top, bas}) => {
  const f = useCurrentFrame(); const {fps} = useVideoConfig();
  const s = spring({frame: f - bas, fps, config: {damping: 11, stiffness: 160}});
  return (
    <div style={{position: 'absolute', top, [sag ? 'right' : 'left']: 34, maxWidth: 620, padding: '22px 30px', borderRadius: 30,
      background: sag ? '#005c4b' : '#202c33', color: '#e9edef', font: `400 36px/1.3 ${yazi}`,
      opacity: Math.min(1, s * 1.5), transform: `translateY(${(1 - s) * 30}px) scale(${0.6 + 0.4 * s})`,
      transformOrigin: sag ? 'right top' : 'left top'}}>
      <b style={{display: 'block', font: `700 26px ${yazi}`, color: sag ? '#7fe3c4' : '#f5b041', marginBottom: 6}}>{kim}</b>{metin}
    </div>
  );
};

const Sahne: React.FC = () => {
  const f = useCurrentFrame(); const {fps} = useVideoConfig();
  const giris = spring({frame: f, fps, config: {damping: 16}});
  const sistem = interpolate(f, [177, 192], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  return (
    <AbsoluteFill style={{background: 'linear-gradient(180deg,#f3d9a4 0%,#d9a75e 55%,#8a5a2b 100%)'}}>
      <div style={{position: 'absolute', left: 640, top: 250 - f * 0.28, width: 300, height: 300, borderRadius: '50%',
        background: 'radial-gradient(circle,#fff3c4 0%,#ffd36b 45%,rgba(255,200,90,0) 70%)'}} />
      <div style={{position: 'absolute', bottom: 0, left: -120, borderLeft: '360px solid transparent', borderRight: '360px solid transparent', borderBottom: '520px solid #b07a3c'}} />
      <div style={{position: 'absolute', bottom: 0, left: 520, borderLeft: '252px solid transparent', borderRight: '252px solid transparent', borderBottom: '364px solid #9c6a31'}} />
      <div style={{position: 'absolute', left: 110, top: 300, width: 860, height: 1240, borderRadius: 56, background: '#0f1a17', overflow: 'hidden',
        boxShadow: '0 40px 90px rgba(0,0,0,.45)', opacity: giris, transform: `translateY(${(1 - giris) * 260}px)`}}>
        <div style={{height: 150, background: '#1f2c33', display: 'flex', alignItems: 'center', padding: '0 40px', gap: 26}}>
          <div style={{width: 86, height: 86, borderRadius: '50%', background: '#e2b04a', display: 'flex', alignItems: 'center', justifyContent: 'center', font: `900 44px ${yazi}`, color: '#5a3510'}}>F</div>
          <div><b style={{display: 'block', color: '#fff', font: `700 40px ${yazi}`}}>Firavun &amp; Ekibi</b>
            <span style={{color: '#9fb3ad', font: `400 27px ${yazi}`}}>Firavun, Hemiunu, 2.300.000 işçi</span></div>
        </div>
        <div style={{position: 'absolute', top: 150, left: 0, right: 0, bottom: 0, background: '#0b141a'}}>
          <Mesaj kim="Mimar Hemiunu" metin="Efendim, piramit bitti." top={60} bas={24} />
          <Mesaj kim="Firavun" metin="Ucu neden sivri?" sag top={270} bas={63} />
          <Mesaj kim="Mimar Hemiunu" metin="Taş bitti efendim." top={440} bas={102} />
          <Mesaj kim="Firavun" metin={'Tamam. Tasarım bu olsun, herkese "bilerek yaptık" deyin.'} sag top={650} bas={138} />
          <div style={{position: 'absolute', left: 110, top: 930, width: 640, textAlign: 'center', padding: '16px 24px', borderRadius: 20,
            background: '#182229', color: '#d9c08a', font: `400 28px ${yazi}`, opacity: sistem, transform: `translateY(${(1 - sistem) * 20}px)`}}>
            Firavun grubun adını "Piramit Projesi" yaptı</div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

const Kapak: React.FC = () => {
  const f = useCurrentFrame(); const {fps} = useVideoConfig();
  const s = spring({frame: f, fps, config: {damping: 14}});
  const c = interpolate(f, [12, 27], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const a = interpolate(f, [20, 35], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  return (
    <AbsoluteFill style={{background: '#120b05', alignItems: 'center', justifyContent: 'center'}}>
      <h1 style={{margin: 0, color: '#ffcf66', font: `900 120px/1 ${yazi}`, letterSpacing: 6, opacity: s, transform: `scale(${1.4 - 0.4 * s})`}}>ANTİK STÜDYO</h1>
      <div style={{width: 420, height: 8, background: '#ffcf66', marginTop: 36, borderRadius: 4, transform: `scaleX(${c})`}} />
      <p style={{margin: '30px 0 0', color: '#f3e3c2', font: `400 44px ${yazi}`, opacity: a, transform: `translateY(${(1 - a) * 20}px)`}}>Tarih, bugünün diliyle.</p>
    </AbsoluteFill>
  );
};

export const Antik: React.FC = () => (
  <AbsoluteFill>
    <Sequence durationInFrames={210}><Sahne /></Sequence>
    <Sequence from={210} durationInFrames={60}><Kapak /></Sequence>
  </AbsoluteFill>
);
