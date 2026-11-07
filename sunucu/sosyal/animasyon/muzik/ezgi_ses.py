# Ezgi ve Dede: telifsiz neşeli mandolin-akordeon müziği + efekt sesleri (vak, tak, deklanşör, pıt, höpürtü, vın).
# Hepsi kodla üretilir. Olay anları public/ezgi_dede/olaylar.json'dan.
import json, numpy as np, scipy.io.wavfile as w
SR = 44100; O = json.load(open("public/ezgi_dede/olaylar.json")); SON = O["son"]; o = O["o"]
N = int(SON * SR); muz = np.zeros(N); efk = np.zeros(N); rng = np.random.default_rng(7)
def ekle(dst, x, t):
    i = int(t * SR); j = min(N, i + len(x))
    if 0 <= i < N: dst[i:j] += x[:j - i]
def hz(m): return 440 * 2 ** ((m - 69) / 12)
def mandolin(f, uz, gur):
    n = int(uz * SR); tt = np.arange(n) / SR
    trem = 0.6 + 0.4 * (np.sin(2 * np.pi * 14 * tt) > 0)          # hızlı tremolo tırnak
    s = (np.sin(2*np.pi*f*tt) + 0.5*np.sin(4*np.pi*f*tt) + 0.25*np.sin(6*np.pi*f*tt)) * trem * np.exp(-tt * 2.2)
    return s * gur
def akordeon(f, uz, gur):
    n = int(uz * SR); tt = np.arange(n) / SR
    s = sum(np.sign(np.sin(2*np.pi*f*d*tt)) * 0.3 + np.sin(2*np.pi*f*d*tt) * 0.7 for d in (1, 1.004))
    zarf = np.minimum(1, tt / 0.05) * np.minimum(1, (uz - tt) / 0.08)
    return s * zarf * gur * 0.5
BPM = 116; v = 60 / BPM
akor = [(60, 64, 67), (65, 69, 72), (67, 71, 74), (60, 64, 67), (57, 60, 64), (65, 69, 72), (67, 71, 74), (60, 64, 67)]
ezgi = [72, 74, 76, 72, 77, 76, 74, 72, 74, 76, 79, 77, 76, 74, 72, 71, 72, 74, 72, 69, 71, 72, 74, 72, 76, 77, 79, 76, 74, 72, 71, 72]
t = 0.0; i = 0
while t < SON - 1:
    a = akor[(i // 4) % len(akor)]
    ekle(muz, akordeon(hz(a[0] - 12), v * 0.9, 0.18), t)
    if i % 2: ekle(muz, sum(akordeon(hz(m), v * 0.45, 0.06) for m in a), t)
    ekle(muz, mandolin(hz(ezgi[i % len(ezgi)]), v * 0.95, 0.16), t)
    t += v; i += 1
# gün batımında yumuşasın
tt = np.arange(N) / SR
sb = [x for x in O["sahneler"] if x["ad"] == "gunbatimi"][0]
muz *= np.interp(tt, [0, sb["bas"] - 0.5, sb["bas"] + 0.5, sb["son"], sb["son"] + 0.5, SON], [1, 1, 0.45, 0.45, 1, 1])
fd = int(1.2 * SR); muz[-fd:] *= np.linspace(1, 0, fd); muz[:int(0.3*SR)] *= np.linspace(0, 1, int(0.3*SR))
# --- efektler
def vak(f=520, uz=0.16, gur=0.5):
    n = int(uz * SR); x = np.arange(n) / SR
    fr = f * (1 + 0.4 * np.exp(-x * 30)); faz = np.cumsum(fr) / SR * 2 * np.pi
    s = np.sign(np.sin(faz)) * 0.5 + np.sin(faz * 2) * 0.3 + rng.normal(0, 0.15, n)
    return s * np.sin(np.pi * x / uz) * gur
def tak():
    n = int(0.25 * SR); x = np.arange(n) / SR
    return (np.sin(2 * np.pi * 120 * x) * np.exp(-x * 30) + rng.normal(0, 1, n) * np.exp(-x * 80) * 0.5) * 0.9
def deklansor():
    n = int(0.12 * SR); x = np.arange(n) / SR
    return rng.normal(0, 1, n) * (np.exp(-x * 90) + 0.6 * np.exp(-np.maximum(0, x - 0.06) * 90) * (x > 0.06)) * 0.5
def pit(f=900):
    n = int(0.12 * SR); x = np.arange(n) / SR
    return np.sin(2 * np.pi * (f + 900 * x / 0.12) * x) * np.exp(-x * 25) * 0.45
def hopurtu():
    n = int(0.6 * SR); x = np.arange(n) / SR
    return rng.normal(0, 1, n) * (0.5 + 0.5 * np.sin(2 * np.pi * 9 * x)) * np.sin(np.pi * x / 0.6) * 0.18
def vin(uz=0.4):
    n = int(uz * SR); x = np.arange(n) / SR
    return rng.normal(0, 1, n) * np.sin(np.pi * x / uz) * 0.25 * np.interp(x, [0, uz], [0.3, 1])
def ding():
    n = int(0.8 * SR); x = np.arange(n) / SR
    return (np.sin(2 * np.pi * 1568 * x) + 0.5 * np.sin(2 * np.pi * 2349 * x)) * np.exp(-x * 5) * 0.25
for k in range(6): ekle(efk, vak(480 + 60 * k), o["kac"] + k * 0.09)
ekle(efk, tak(), o["tak"])
for k in range(6): ekle(efk, vak(560 + 40 * (k % 3), 0.1, 0.3), o["dizil"] + 0.25 + k * 0.1)
ekle(efk, vak(380, 0.25, 0.6), o["selam"])
for x in o["esya"]: ekle(efk, pit(), x)
ekle(efk, ding(), o["avm"])
ekle(efk, hopurtu(), o["yudum"]); ekle(efk, hopurtu(), o["ezgiYudum"]); ekle(efk, hopurtu(), o["dedeYudum"])
for x in o["flas"]: ekle(efk, deklansor(), x)
ekle(efk, vin(), o["kap"]); ekle(efk, vak(450, 0.2, 0.5), o["kap"] + 0.1)
ekle(efk, pit(700), o["yedek"]); ekle(efk, pit(800), o["pecete"])
ekle(efk, ding(), o["goz"])
kar = muz * 0.55 + efk
kar = kar / max(1e-6, np.max(np.abs(kar))) * 0.8
w.write("public/ezgi_dede/muzik.wav", SR, (muz / max(1e-6, np.max(np.abs(muz))) * 0.7 * 32767).astype(np.int16))
w.write("public/ezgi_dede/efekt.wav", SR, (efk / max(1e-6, np.max(np.abs(efk))) * 0.8 * 32767).astype(np.int16))
print("tamam", round(SON, 1))
