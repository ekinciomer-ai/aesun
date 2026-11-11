"""Kanal üretimi %100 özgün, telifsiz atmosferik dönem/gerilim ses yatağı üretici.
Harici müzik dosyası veya üçüncü parti telif içermez; saf matematiksel armonik sentez (numpy + wave) ile üretilir.
Kullanım: python3 ambiyans_uret.py <cikti.wav> [sure_sn=65] [mod=gerilim|merak|epik]"""
import math, struct, sys, wave
import numpy as np

out = sys.argv[1]
sure = float(sys.argv[2]) if len(sys.argv) > 2 else 65.0
mod = sys.argv[3] if len(sys.argv) > 3 else "merak"
sr = 44100
n = int(sure * sr)
t = np.linspace(0.0, sure, n, endpoint=False, dtype=np.float64)

if mod == "epik":
    frekanslar = [(55.0, 0.42), (82.41, 0.30), (110.0, 0.24), (164.81, 0.12), (220.0, 0.06)]
elif mod == "gerilim":
    frekanslar = [(58.27, 0.44), (87.31, 0.28), (116.54, 0.22), (174.61, 0.10), (123.47, 0.05)]
else:  # merak (D dorian / sıcak belgesel dokusu)
    frekanslar = [(73.42, 0.42), (110.0, 0.30), (146.83, 0.22), (220.0, 0.11), (164.81, 0.06)]

sig = np.zeros(n, dtype=np.float64)
for i, (f, amp) in enumerate(frekanslar):
    lfo = 1.0 + 0.14 * np.sin(2.0 * math.pi * (0.07 + 0.03 * i) * t + i * 1.1)
    detune = 0.22 * np.sin(2.0 * math.pi * 0.04 * t + i)
    sig += amp * lfo * np.sin(2.0 * math.pi * (f + detune * 0.15) * t)

# Hafif kalp atışı / zaman nabzı (çok yumuşak alt bas darbesi, izleyiciyi akışta tutar)
nabiz_f = 0.85  # ~51 BPM sakin belgesel nabzı
faz = (t * nabiz_f) % 1.0
darbe = np.exp(-faz * 9.5) * np.sin(2.0 * math.pi * 52.0 * faz) * 0.22
sig += darbe

# Kesintisiz döngü (seamless loop) için baş/son 0.4 sn yumuşak zarf
zarf = np.ones(n, dtype=np.float64)
k = min(int(0.4 * sr), n // 6)
if k > 0:
    zarf[:k] = np.linspace(0.35, 1.0, k)
    zarf[-k:] = np.linspace(1.0, 0.35, k)
sig *= zarf

mx = float(np.max(np.abs(sig)) or 1.0)
pcm = np.clip(sig / mx * 0.75 * 32767.0, -32767, 32767).astype(np.int16)
with wave.open(out, "wb") as wf:
    wf.setnchannels(1)
    wf.setsampwidth(2)
    wf.setframerate(sr)
    wf.writeframes(pcm.tobytes())
print("ambiyans hazir:", out, round(sure, 1), "sn", mod)
