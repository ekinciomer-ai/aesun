# mix.py (Bölüm 10 Sezon Finali: CIPA — Acıyı Hiç Hissetmemek) — özgün marimba + piyano + hararet buharı, telif yok.
#   python3 -I mix.py <hikaye_klasörü>
import sys, json, subprocess, pathlib
import numpy as np

SR = 48000
story = pathlib.Path(sys.argv[1])
cues = json.load(open(story / 'audio' / 'cues.json', encoding='utf-8'))
DUR = cues['DUR']; N = int(DUR * SR)
rng = np.random.default_rng(100)

def load(p):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', str(p), '-ac', '1', '-ar', str(SR), '-f', 'f32le', '-'], capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.float32).copy()
def save(p, x):
    x = np.clip(x, -1, 1); st = np.stack([x, x], 1)
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'f32le', '-ar', str(SR), '-ac', '2', '-i', '-', str(p)], input=st.astype(np.float32).tobytes(), check=True)
def band(x, lo, hi):
    X = np.fft.rfft(x); f = np.fft.rfftfreq(len(x), 1 / SR)
    return np.fft.irfft(X / (1 + (lo / np.maximum(f, 1)) ** 4) / (1 + (f / hi) ** 4), len(x))
def env(n, a, d):
    t = np.arange(n) / SR; return np.minimum(1, t / max(a, 1e-4)) * np.exp(-t / max(d, 1e-4))
def put(buf, t, x, g=1.0):
    i = int(t * SR); j = min(len(buf), i + len(x))
    if 0 <= i < len(buf) and j > i: buf[i:j] += x[:j - i] * g
def noise(d): return rng.standard_normal(max(1, int(round(d * SR))))
T = lambda d: np.arange(int(d * SR)) / SR

# Parlak sıcak marimba (modern bilim / çocuk parkı hissi)
def marimba(f, d=.85):
    t = T(d)
    return (np.sin(2 * np.pi * f * t) + .24 * np.sin(2 * np.pi * f * 4.0 * t) * np.exp(-t * 14)) * env(len(t), .002, d * .24)

def piano(f, d=1.5):
    t = T(d)
    return (np.sin(2 * np.pi * f * t) + .40 * np.sin(4 * np.pi * f * t) * np.exp(-t * 4) + .16 * np.sin(6 * np.pi * f * t) * np.exp(-t * 7)) * env(len(t), .004, d * .36)

def bell(f, d=2.2):
    t = T(d)
    return sum(a * np.sin(2 * np.pi * f * m * t) * np.exp(-t * k) for m, a, k in [(1, 1, 1.8), (2, .35, 3.0), (3.01, .16, 4.8)]) * env(len(t), .005, 8)

def bass_note(f, d=.55):
    t = T(d); return (np.sin(2 * np.pi * f * t) + .24 * np.sin(4 * np.pi * f * t)) * env(len(t), .004, .16)

def pad(f, d, amp=.048):
    t = T(d); x = sum(((t * f * k) % 1 * 2 - 1) for k in (1, 1.003, .997, 2.002)); x = band(x, 65, 920) * amp
    return x * np.minimum(1, np.minimum(t / .7, (d - t) / .7))

NOTE = {
    'C2': 65.4, 'F2': 87.3, 'G2': 98.0, 'A2': 110.0, 'C3': 130.8, 'D3': 146.8, 'E3': 164.8,
    'F3': 174.6, 'G3': 196.0, 'A3': 220.0, 'B3': 246.9, 'C4': 261.6, 'D4': 293.7, 'E4': 329.6,
    'F4': 349.2, 'G4': 392.0, 'A4': 440.0, 'B4': 493.9, 'C5': 523.3, 'D5': 587.3, 'E5': 659.3, 'G5': 784.0,
}
W = sorted(c['t'] for c in cues['cues'] if c['type'] == 'whoosh')
tB, tC, tD = (W + [DUR * .46, DUR * .68, DUR * .82])[:3]
beat = 60 / 118
music = np.zeros(N)
A_mel = ['C4', 'E4', 'G4', None, 'A4', 'G4', 'E4', None, 'F4', 'E4', 'D4', None, 'C4', None, None, None]
B_mel = ['A4', 'C5', 'E5', 'D5', 'C5', 'B4', 'A4', 'G4', 'F4', 'A4', 'C5', 'B4', 'A4', None, 'E4', None]
C_mel = ['C5', None, 'B4', 'A4', 'G4', None, 'E4', None, 'F4', 'G4', 'A4', None, 'G4', None, None, None]
D_arp = ['C4', 'E4', 'G4', 'C5', 'G4', 'E4']
bass = {'A': ['C2', None, 'G2', None], 'B': ['A2', 'F2', 'C3', 'G2'], 'C': ['F2', None, 'G2', None], 'D': ['C2', None, 'G2', None]}

i = 0; t = 0.0
while t < DUR - .25:
    sec = 'A' if t < tB else 'B' if t < tC else 'C' if t < tD else 'D'
    step = i % 16
    if sec == 'A':
        n = A_mel[step]; n and put(music, t, marimba(NOTE[n], .9), .24)
    elif sec == 'B':
        n = B_mel[step]; n and put(music, t, piano(NOTE[n], .95), .23)
    elif sec == 'C':
        n = C_mel[step]; n and put(music, t, piano(NOTE[n], 1.3), .24)
    else:
        if i % 2 == 0: put(music, t, piano(NOTE[D_arp[(i // 2) % 6]], 1.8), .24)
    b = bass[sec][(i // 4) % 4] if i % 4 == 0 else None
    if b: put(music, t, bass_note(NOTE[b], .55), .48)
    t += beat / 2; i += 1

put(music, 0, pad(NOTE['C3'], max(.5, tB + .3), .045))
put(music, tB, pad(NOTE['A2'], max(.5, tD - tB + .3), .045))
put(music, tD, pad(NOTE['C3'], max(.5, DUR - tD), .058))
# Sezon finali sıcak majör akor parıltısı!
for f in ('C4', 'E4', 'G4', 'C5'): put(music, max(0, DUR - 1.8), bell(NOTE[f], 1.8), .19)

sfx = np.zeros(N)
for c in cues['cues']:
    t0, ty, d = c['t'], c['type'], c.get('dur', 1.0)
    if ty == 'whoosh':
        x = noise(.42); tt = np.arange(len(x)) / SR; put(sfx, t0, band(x, 300, 3400) * np.sin(np.pi * tt / .42) ** 2, .35)
    elif ty == 'thud':
        nb = int(.35 * SR); tt = np.arange(nb) / SR
        put(sfx, t0, np.sin(2 * np.pi * (85 * np.exp(-tt * 7)) * tt) * env(nb, .003, .12), .42)
    elif ty == 'barrier':
        nb = int(.75 * SR); tt = np.arange(nb) / SR
        put(sfx, t0, np.sin(2 * np.pi * (55 + 35 * np.exp(-tt * 9)) * tt) * env(nb, .002, .22) + band(noise(.75), 900, 4200) * env(nb, .002, .08) * .45, .52)
    elif ty == 'steam':
        # Hararet yapan araba motoru + radyatör buharı tıslaması!
        x = band(noise(d), 2200, 8800); tt = np.arange(len(x)) / SR
        eng = np.sin(2 * np.pi * 115 * tt) * .18 + np.sin(2 * np.pi * 230 * tt) * .08
        put(sfx, t0, (x * .24 + eng) * np.minimum(1, np.minimum(tt / .3, (d - tt) / .3)), .28)
    elif ty == 'clock':
        bt = t0
        while bt < t0 + d - .25:
            tt = T(.05); put(sfx, bt, band(noise(.05), 1800, 5200) * env(len(tt), .001, .012), .28)
            bt += .45
    elif ty == 'shimmer':
        tt = T(2.2); put(sfx, t0, sum(np.sin(2 * np.pi * f * tt) * env(len(tt), .01 + i * .06, .95) for i, f in enumerate([523.3, 659.3, 784.0, 1046.5])) / 4, .22)

voice = load(story / 'voice' / 'voice.wav'); voice = np.pad(voice, (0, max(0, N - len(voice))))[:N]
win = int(.05 * SR); ve = np.sqrt(np.convolve(voice ** 2, np.ones(win) / win, mode='same'))
active = np.convolve((ve > .02).astype(float), np.ones(int(.22 * SR)) / int(.22 * SR), mode='same')
duck = 1 - .45 * np.clip(active, 0, 1)
def rms(x): return np.sqrt(np.mean(x[np.abs(x) > 1e-5] ** 2)) if np.any(np.abs(x) > 1e-5) else 1
vr = rms(voice)
music *= (vr / rms(music)) * 10 ** (-17 / 20)
sfx *= (vr / max(rms(sfx), 1e-6)) * 10 ** (-16 / 20)
mix = voice + music * duck + sfx
fl = int(.35 * SR); mix[-fl:] *= np.linspace(1, 0, fl)
out = story / 'audio'
save(out / 'music.wav', music * duck); save(out / 'sfx.wav', sfx)
save(out / 'premix.wav', mix / max(1e-6, np.abs(mix).max()) * .7)
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', str(out / 'premix.wav'), '-af', 'loudnorm=I=-14:TP=-2.8:LRA=11,aresample=48000', str(out / 'mix.wav')], check=True)
print('OK mix.wav', round(DUR, 2), 's')
