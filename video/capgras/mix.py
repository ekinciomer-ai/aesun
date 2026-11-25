# mix.py (Bölüm 9: Capgras Sendromu — 1923 Paris) — özgün Paris vals-akordeon + piyano + telefon zili, telif yok.
#   python3 -I mix.py <hikaye_klasörü>
import sys, json, subprocess, pathlib
import numpy as np

SR = 48000
story = pathlib.Path(sys.argv[1])
cues = json.load(open(story / 'audio' / 'cues.json', encoding='utf-8'))
DUR = cues['DUR']; N = int(DUR * SR)
rng = np.random.default_rng(99)

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

# 1923 Paris akordeon (musette — hafif çift sesli sıcak kamış!)
def musette(f, d=.95):
    t = T(d)
    x = sum(
        (np.sin(2 * np.pi * f * det * t) + .38 * np.sin(4 * np.pi * f * det * t) + .18 * np.sin(6 * np.pi * f * det * t))
        for det in (0.997, 1.003)
    ) * .5
    x = band(x, 180, 2600)
    return x * np.minimum(1, np.minimum(t / .045, (d - t) / .14))

def piano(f, d=1.2):
    t = T(d)
    return (np.sin(2 * np.pi * f * t) + .38 * np.sin(4 * np.pi * f * t) * np.exp(-t * 4.5)) * env(len(t), .004, d * .32)

def bass_waltz(f, d=.5):
    t = T(d); return (np.sin(2 * np.pi * f * t) + .25 * np.sin(4 * np.pi * f * t)) * env(len(t), .004, .16)

def pad(f, d, amp=.042):
    t = T(d); x = sum(((t * f * k) % 1 * 2 - 1) for k in (1, 1.003, .997, 2.002)); x = band(x, 65, 850) * amp
    return x * np.minimum(1, np.minimum(t / .7, (d - t) / .7))

NOTE = {
    'A2': 110.0, 'C3': 130.8, 'D3': 146.8, 'E3': 164.8, 'F3': 174.6, 'G3': 196.0, 'G#3': 207.7,
    'A3': 220.0, 'B3': 246.9, 'C4': 261.6, 'D4': 293.7, 'E4': 329.6, 'F4': 349.2, 'G4': 392.0,
    'G#4': 415.3, 'A4': 440.0, 'B4': 493.9, 'C5': 523.3, 'D5': 587.3, 'E5': 659.3,
}
W = sorted(c['t'] for c in cues['cues'] if c['type'] == 'whoosh')
tB, tC, tD = (W + [DUR * .45, DUR * .68, DUR * .82])[:3]
beat = 60 / 120  # 3/4 Paris valsi!
music = np.zeros(N)
A_mel = ['E4', 'A4', 'C5', 'B4', 'A4', 'G#4', 'A4', None, 'E4', 'F4', 'E4', 'D4']
B_mel = ['A4', 'C5', 'E5', 'D5', 'C5', 'B4', 'C5', 'A4', 'G#4', 'E4', 'A4', None]
C_mel = ['E5', None, 'D5', 'C5', 'B4', 'A4', 'G#4', 'B4', 'A4', None, 'E4', None]
waltz_bass = ['A2', 'E3', 'E3', 'D3', 'A3', 'A3', 'E3', 'G#3', 'G#3', 'A2', 'E3', 'E3']

i = 0; t = 0.0
while t < DUR - .25:
    sec = 'A' if t < tB else 'B' if t < tC else 'C' if t < tD else 'D'
    step = i % 12
    if sec in ('A', 'C'):
        n = (A_mel if sec == 'A' else C_mel)[step]
        if n: put(music, t, musette(NOTE[n], .65), .20)
    elif sec == 'B':
        n = B_mel[step]
        if n: put(music, t, piano(NOTE[n], .85), .23)
    else:
        n = A_mel[step]
        if n: put(music, t, musette(NOTE[n], .85), .18)
    b = waltz_bass[step]
    put(music, t, bass_waltz(NOTE[b], .45), .44 if step % 3 == 0 else .22)
    t += beat; i += 1

put(music, 0, pad(NOTE['A3'], max(.5, tB + .3), .042))
put(music, tB, pad(NOTE['E3'], max(.5, tD - tB + .3), .042))
put(music, tD, pad(NOTE['A3'], max(.5, DUR - tD), .050))

sfx = np.zeros(N)
for c in cues['cues']:
    t0, ty, d = c['t'], c['type'], c.get('dur', 1.0)
    if ty == 'whoosh':
        x = noise(.42); tt = np.arange(len(x)) / SR; put(sfx, t0, band(x, 300, 3400) * np.sin(np.pi * tt / .42) ** 2, .35)
    elif ty == 'ghost':
        tt = T(.65); ph = 2 * np.pi * np.cumsum(np.linspace(680, 420, len(tt))) / SR
        put(sfx, t0, np.sin(ph) * np.sin(np.pi * tt / .65) ** 2, .26)
    elif ty == 'snap':
        # Elektrik kablosu kopma kıvılcımı!
        tt = T(.38); put(sfx, t0, band(noise(.38), 1800, 8200) * env(len(tt), .002, .055) * .65 + np.sin(2 * np.pi * 160 * tt) * env(len(tt), .002, .08) * .45, .48)
    elif ty == 'boom':
        nb = int(.95 * SR); tt = np.arange(nb) / SR
        put(sfx, t0, np.sin(2 * np.pi * (50 + 30 * np.exp(-tt * 8)) * tt) * env(nb, .003, .28) + band(noise(.95), 60, 420) * env(nb, .002, .1) * .4, .50)
    elif ty == 'ring':
        # 1920'ler klasik çift çanlı mekanik telefon zili!
        for rt in (0.0, 0.72):
            if rt < d:
                tt = T(.48)
                bell_sig = (np.sin(2 * np.pi * 1420 * tt) + .6 * np.sin(2 * np.pi * 2180 * tt)) * (.5 + .5 * np.sin(2 * np.pi * 22 * tt))
                put(sfx, t0 + rt, bell_sig * np.sin(np.pi * tt / .48) ** 2, .28)
    elif ty == 'warm':
        tt = T(1.6); put(sfx, t0, sum(np.sin(2 * np.pi * f * tt) * env(len(tt), .02 + i * .07, .75) for i, f in enumerate([440.0, 523.3, 659.3, 880.0])) / 4, .22)
    elif ty == 'paris_eve':
        x = band(noise(d), 220, 950); tt = np.arange(len(x)) / SR
        put(sfx, t0, x * np.minimum(1, np.minimum(tt / .6, (d - tt) / .6)), .045)

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
