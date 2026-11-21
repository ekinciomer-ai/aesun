"""Efekt + müzik (numpy sentez, telifsiz) ve seslendirme miksi -> mix.wav"""
import json, os, subprocess, numpy as np, wave
SR = 44100
TL = json.load(open('tl.json')); D, S = TL['D'], TL['seg']
KS = ['hook','olay','olay2','poll','rew','karar','ders','end','fin']
T = S['fin']; N = int(T * SR) + SR
rng = np.random.default_rng(3)
def warp(v):
    for i in range(1, len(KS)):
        a, b = KS[i-1], KS[i]
        if v < S[b] or i == len(KS)-1:
            k = min(max((v - S[a]) / (S[b] - S[a]), 0), 1.5); return D[a] + k * (D[b] - D[a])
def pw(arr, x):
    if x <= arr[0][0]: return arr[0][1]
    for i in range(1, len(arr)):
        if x <= arr[i][0]:
            a, b = arr[i-1], arr[i]; return a[1] + (b[1]-a[1]) * (x-a[0]) / ((b[0]-a[0]) or 1e-6)
    return arr[-1][1]
def world(u):
    if u < D['poll']: return pw(TL['map'], u)
    if u < D['rew']: return 7.9
    if u < D['karar']: return pw(TL['rew'], u)
    if u < D['ders']: return 30
    return 1.8 + (u - D['ders']) * .75
ts = np.arange(0, T, 0.01); us = np.array([warp(t) for t in ts]); ws = np.array([world(u) for u in us])
def when_world(w0, umin=0, umax=D['poll']):
    for t, u, w in zip(ts, us, ws):
        if umin <= u < umax and w >= w0: return t
def when_u(u0):
    for t, u in zip(ts, us):
        if u >= u0: return t
out = np.zeros(N); bed = np.zeros(N)
def add(buf, t, x, g=1.0):
    i = int(t * SR); x = x[:max(0, len(buf) - i)]; buf[i:i+len(x)] += x * g
def env(n, a=.005, r=.2):
    e = np.ones(n); na, nr = int(a*SR), int(r*SR); e[:na] = np.linspace(0, 1, na); e[-nr:] *= np.linspace(1, 0, nr); return e
from scipy.signal import lfilter
def lp(x, c):
    a = np.exp(-2*np.pi*c/SR); return lfilter([1-a], [1, -a], x)
# --- kalabalık ambiyansı (her sahne için seviye eğrisi)
noise = rng.standard_normal(N)
crowd = lp(noise, 1400) - lp(noise, 250)
lvl = np.zeros(len(ts))
for k, (t, u, w) in enumerate(zip(ts, us, ws)):
    if u < D['poll']:
        base = .18 if not (u >= 24) else .0
        roar = .55 * (1 if 3.6 <= w < 9 else max(0, 1 - (w - 9) / 3) if w >= 9 else 0)
        boo = .25 if 19.5 <= w < 25 and u < 24 else 0
        lvl[k] = base + roar + boo
    elif u < D['rew']: lvl[k] = .06
    elif u < D['karar']: lvl[k] = .12
    elif u < D['ders']: lvl[k] = 0
    else: lvl[k] = .2 + .5 * (1 if 3.6 <= ws[k] < 9 else 0)
L = np.interp(np.arange(N) / SR, ts, lp(np.r_[lvl, np.zeros(0)], 3) if False else np.convolve(lvl, np.ones(30)/30, 'same'))
out += crowd * L * 1.6
# rüzgâr (boş stat)
wind = lp(rng.standard_normal(N), 300) * 2.5
wl = np.interp(np.arange(N)/SR, ts, np.convolve([(1 if (24 <= u < D['poll'] or D['karar'] <= u < D['ders']) else 0) for u in us], np.ones(50)/50, 'same'))
out += wind * wl * .5
# --- efektler
def thump(f=80, d=.25, g=1):
    n = int(d*SR); t = np.arange(n)/SR; return np.sin(2*np.pi*f*t*np.exp(-t*8)) * np.exp(-t*18) * g
def click(f=3000, d=.06):
    n = int(d*SR); t = np.arange(n)/SR; return (np.sin(2*np.pi*f*t) + rng.standard_normal(n)*.5) * np.exp(-t*70)
def whistle(d=.45):
    n = int(d*SR); t = np.arange(n)/SR; f = 2900 + 60*np.sin(2*np.pi*28*t); return np.sin(2*np.pi*np.cumsum(f)/SR) * env(n, .01, .05) * .35
t_kick = when_world(3.15); t_net = when_world(3.6)
if t_kick: add(out, t_kick, thump(120, .15, .9))
if t_net: add(out, t_net, lp(rng.standard_normal(int(.4*SR)), 2500) * env(int(.4*SR), .01, .3) * 3)
t_wh = when_world(19.0)
if t_wh:
    for i, d in enumerate([.3, .3, .9]): add(out, t_wh + i*.45, whistle(d))
for i in range(21):
    t = when_world(20.6 + i*.22 + rng.random()*.5)
    if t: add(out, t, click(rng.choice([1800, 2600, 4200])), .35)
# geri sarma
t_rw = when_u(D['rew'])
n = int((when_u(36.5) - t_rw) * SR); tt = np.arange(n)/SR; f = 900 * np.exp(-tt*1.2) + 120
add(out, t_rw, np.sin(2*np.pi*np.cumsum(f)/SR) * .15 * env(n, .02, .1) + lp(rng.standard_normal(n), 3000) * env(n, .02, .1) * 1.2)
for c in TL['clues']:
    n = int(.18*SR); tt = np.arange(n)/SR; add(out, c[0], (np.sin(2*np.pi*1320*tt) + .5*np.sin(2*np.pi*1980*tt)) * np.exp(-tt*18) * .35)
for i in range(5):  # geri sayım tıkları
    add(out, TL['cd0'] + i, click(1000, .05), .5)
t_st = when_u(D['karar'] + 7.8)
add(out, t_st, thump(60, .5, 1.4)); add(out, t_st, lp(rng.standard_normal(int(.2*SR)), 1200) * env(int(.2*SR), .002, .15) * 4)
# --- müzik altlığı: gerilim pedi (Am - F - Dm - E)
chords = [[110, 130.8, 164.8], [87.3, 110, 130.8], [73.4, 87.3, 110], [82.4, 103.8, 123.5]]
t = np.arange(N)/SR; pad = np.zeros(N)
for i in range(int(T/4)+1):
    ch = chords[i % 4]; a, b = int(i*4*SR), int((i+1)*4*SR); b = min(b, N); n = b - a
    if n <= 0: break
    tt = np.arange(n)/SR; seg = sum(np.sin(2*np.pi*f*tt) + .3*np.sin(2*np.pi*2*f*tt + .3) for f in ch)
    pad[a:b] += seg * env(n, .6, .8) * .06
pulse = np.sin(2*np.pi*55*t) * (np.mod(t, .5) < .12) * np.exp(-np.mod(t, .5)*14) * .25
bed = pad + pulse * ((t > S['olay2']) & (t < S['karar'])) * 1.0
# --- seslendirme
vo = np.zeros(N)
for ad, (st, du, real) in TL['vo'].items():
    f = f'ses/{ad}.wav'
    if not os.path.exists(f): continue
    x = np.frombuffer(subprocess.check_output(['ffmpeg', '-v', 'error', '-i', f, '-f', 's16le', '-ac', '1', '-ar', str(SR), '-']), np.int16) / 32768.
    add(vo, st, x * 1.0)
venv = np.convolve(np.abs(vo) > .02, np.ones(int(.25*SR))/(.25*SR), 'same') > .05
duck = 1 - .55 * np.convolve(venv.astype(float), np.ones(int(.15*SR))/(.15*SR), 'same')
mix = vo * 1.0 + (out * .55 + bed) * duck
mix = mix / max(1e-6, np.abs(mix).max()) * .89
with wave.open('mix_raw.wav', 'wb') as w:
    w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes((mix * 32767).astype(np.int16).tobytes())
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', 'mix_raw.wav', '-af', 'loudnorm=I=-16:TP=-1.5:LRA=11,alimiter=limit=0.95', '-ar', '44100', '-ac', '2', 'mix.wav'], check=True)
print('mix ok', T)
