# "Tabloya Sorduk" fon müziği: hafif, şakacı pizzicato vals (3/4), telifsiz, kodla üretilir.
import numpy as np, scipy.io.wavfile as w, sys
SR = 44100; SURE = float(sys.argv[1]) if len(sys.argv) > 1 else 60; BPM = 132
vurus = 60 / BPM; t_top = int(SURE * SR); out = np.zeros(t_top)
def nota(f, bas, uz, gur, tini=6.0):
    n = int(uz * SR); t = np.arange(n) / SR
    s = (np.sin(2*np.pi*f*t) + 0.35*np.sin(4*np.pi*f*t) + 0.12*np.sin(6*np.pi*f*t)) * np.exp(-t*tini) * gur
    i = int(bas * SR); j = min(i + n, t_top)
    if i < t_top: out[i:j] += s[:j-i]
def hz(m): return 440 * 2 ** ((m - 69) / 12)
# akorlar (kök, üçlü, beşli) — F majör çevresi
akor = [(53, 57, 60), (48, 52, 55), (50, 53, 57), (46, 50, 53), (53, 57, 60), (48, 52, 55), (46, 50, 53), (48, 52, 55)]
ezgi = [72, 69, 72, 74, 72, 69, 67, 65, 67, 69, 65, 64, 65, 67, 69, 72, 70, 69, 67, 65, 64, 65, 67, 65]
olcu = 3 * vurus; k = 0; t = 0.0
while t < SURE:
    a = akor[k % len(akor)]
    nota(hz(a[0] - 12), t, 0.6, 0.30, 5)                     # bas (1. vuruş)
    for v in (1, 2):                                          # "um-pa-pa"
        for m in a: nota(hz(m), t + v * vurus, 0.25, 0.07, 14)
    for v in range(3):                                        # ezgi pizzicato
        m = ezgi[(k * 3 + v) % len(ezgi)]
        if (k * 3 + v) % 7 != 6: nota(hz(m), t + v * vurus, 0.35, 0.12, 9)
    t += olcu; k += 1
# yumuşak giriş/çıkış, normalize
fade = int(1.5 * SR); out[:fade] *= np.linspace(0, 1, fade); out[-fade:] *= np.linspace(1, 0, fade)
out = out / np.max(np.abs(out)) * 0.6
w.write(sys.argv[2] if len(sys.argv) > 2 else "public/tablo_sor/muzik.wav", SR, (out * 32767).astype(np.int16))
