import numpy as np, wave
SR=44100; DUR=85.0; N=int(SR*DUR)
rng=np.random.default_rng(7)
L=np.zeros(N); R=np.zeros(N)
t=np.arange(N)/SR

def add(sig, at, gain=1.0, pan=0.0):
    i=int(at*SR); n=min(len(sig), N-i)
    if n<=0: return
    l=np.cos((pan+1)*np.pi/4); r=np.sin((pan+1)*np.pi/4)
    L[i:i+n]+=sig[:n]*gain*l*1.41; R[i:i+n]+=sig[:n]*gain*r*1.41

def lp(x, a):  # one-pole lowpass, a in (0,1)
    y=np.empty_like(x); s=0.0
    for k in range(len(x)):
        s+=a*(x[k]-s); y[k]=s
    return y
def lp_fast(x, cutoff):
    # FFT brickwall-ish smooth lowpass
    X=np.fft.rfft(x); f=np.fft.rfftfreq(len(x),1/SR)
    X*=1/(1+(f/cutoff)**4); return np.fft.irfft(X,len(x))
def bp_fast(x, lo, hi):
    X=np.fft.rfft(x); f=np.fft.rfftfreq(len(x),1/SR)
    X*=(1/(1+(lo/np.maximum(f,1))**4))*(1/(1+(f/hi)**4)); return np.fft.irfft(X,len(x))
def env(n, a, d):
    e=np.ones(n); ka=int(a*SR);
    if ka>0: e[:ka]=np.linspace(0,1,ka)
    e*=np.exp(-np.arange(n)/SR/d) if d else 1
    return e

# ---- music bed: dark drone + pulse ----
drone=(np.sin(2*np.pi*55*t)*.5+np.sin(2*np.pi*82.4*t)*.25+np.sin(2*np.pi*110.3*t)*.12)
drone*=0.6+0.4*np.sin(2*np.pi*0.07*t)
pad=lp_fast(rng.standard_normal(N),400)*.6
bed=(drone*.12+pad*.05)
# pulse heartbeat 84 bpm during cases
beat=60/84
kick=np.sin(2*np.pi*np.cumsum(np.linspace(90,40,int(.25*SR)))/SR)*np.exp(-np.arange(int(.25*SR))/SR/.07)
mask=np.zeros(N)
for a,b in [(6,30),(30,55),(55,77)]:
    mask[int(a*SR):int(b*SR)]=1
for k in np.arange(0.5,DUR,beat):
    if mask[int(k*SR)]: add(kick,k,.22); add(kick*.5,k+.22,.14)
# swell into outro
bed*=np.clip(1-0*t,0,1)
L+=bed; R+=bed

# ---- ambiences ----
city=lp_fast(rng.standard_normal(N),700)*.05
cm=np.zeros(N); cm[int(0*SR):int(30*SR)]=1; cm[int(77*SR):]=1
rain=bp_fast(rng.standard_normal(N),1500,9000)*.06
rm=np.zeros(N); rm[int(30*SR):int(55*SR)]=1
wind=lp_fast(rng.standard_normal(N),300)*.09*(0.6+0.4*np.sin(2*np.pi*.15*t))
wm=np.zeros(N); wm[int(55*SR):int(77*SR)]=1
def smoothmask(m):
    k=int(.4*SR); ker=np.ones(k)/k; return np.convolve(m,ker,'same')
amb=city*smoothmask(cm)+rain*smoothmask(rm)+wind*smoothmask(wm)
L+=amb; R+=amb*0.95
# engine hum approaching (case1/2/3)
def engine(dur, f0, f1, g):
    n=int(dur*SR); f=np.linspace(f0,f1,n); ph=2*np.pi*np.cumsum(f)/SR
    s=(np.sin(ph)+.5*np.sin(2*ph)+.3*np.sin(3*ph))*np.linspace(0,1,n)**1.5
    s+=lp_fast(rng.standard_normal(n),400)*.4*np.linspace(0,1,n)
    return s*g
add(engine(8.5,70,95,.12),7.2,1,.3)
add(engine(7.2,60,85,.12),31.4,1,-.3)
add(engine(6,80,90,.08),56,1,.2)

# ---- ticking before impacts ----
tick=np.sin(2*np.pi*2400*np.arange(int(.02*SR))/SR)*np.exp(-np.arange(int(.02*SR))/SR/.004)
for a,b in [(12.4,15.6),(36.2,38.5),(60.0,62.2)]:
    for k in np.arange(a,b,.5): add(tick,k,.25)

# ---- crash ----
def crash(intensity=1.0, glass=True, dur=2.5):
    n=int(dur*SR); tt=np.arange(n)/SR
    thump=np.sin(2*np.pi*np.cumsum(np.linspace(110,30,n))/SR)*np.exp(-tt/.18)
    nz=rng.standard_normal(n); burst=lp_fast(nz,3500)*np.exp(-tt/.25)
    metal=sum(np.sin(2*np.pi*f*tt+rng.random()*6)*np.exp(-tt/(.2+rng.random()*.5)) for f in [317,523,811,1187,1543,2210])*.25
    s=thump*1.2+burst*.9+metal*.6
    if glass:
        for k in range(60):
            at=rng.random()**2*1.6; f=3000+rng.random()*5000; m=int(.08*SR)
            ping=np.sin(2*np.pi*f*np.arange(m)/SR)*np.exp(-np.arange(m)/SR/.015)
            i=int(at*SR);
            if i+m<n: s[i:i+m]+=ping*.18*rng.random()
    return s*intensity
add(crash(1.0),15.7,.9)
add(crash(.6,glass=False,dur=1.2),38.6,.55)
add(crash(.75,glass=True,dur=2.0),62.3,.8)
# whiteout/heartbeat sting after case2 impact
sting=np.sin(2*np.pi*55*np.arange(int(3*SR))/SR)*np.exp(-np.arange(int(3*SR))/SR/1.2)
add(sting,38.6,.35)
# tire screech case3 brake (car) at 60.0 and moto 61.6
def screech(dur):
    n=int(dur*SR); tt=np.arange(n)/SR
    f=2300+250*np.sin(2*np.pi*7*tt)+rng.standard_normal(n).cumsum()*.0
    s=np.sin(2*np.pi*np.cumsum(f)/SR)*.4+bp_fast(rng.standard_normal(n),1800,4200)*.8
    e=np.minimum(1,tt/.08)*np.exp(-tt/dur*1.2)
    return s*e
add(screech(1.8),60.0,.25,.2)
add(screech(.9),61.5,.22,-.2)

# ---- whoosh for titles/transitions ----
def whoosh(d=.7):
    n=int(d*SR); x=rng.standard_normal(n); out=np.zeros(n)
    seg=int(SR*.02)
    for i in range(0,n,seg):
        c=300+4000*np.sin(np.pi*i/n)
        out[i:i+seg]=bp_fast(x[i:i+seg] if len(x[i:i+seg])>32 else np.zeros(len(x[i:i+seg])),c*.5,c*1.5) if len(x[i:i+seg])>32 else 0
    return out*np.sin(np.pi*np.arange(n)/n)**2
W=whoosh()
for a in [5.8,29.8,54.8,76.8]: add(W,a,.5)
# ---- stamp / gavel ----
def gavel():
    n=int(.9*SR); tt=np.arange(n)/SR
    return (np.sin(2*np.pi*np.cumsum(np.linspace(180,70,n))/SR)*np.exp(-tt/.09)*1.3+lp_fast(rng.standard_normal(n),2500)*np.exp(-tt/.03)+np.sin(2*np.pi*620*tt)*np.exp(-tt/.12)*.3)
G=gavel()
for a in [26.6,49.4,73.4]: add(G,a,.7)
# ---- UI ticks ----
def blip(f=1300):
    n=int(.08*SR); tt=np.arange(n)/SR; return np.sin(2*np.pi*f*tt)*np.exp(-tt/.02)
for a in [20.6,21.75,22.9,24.05,25.2,44,46.6,66,68.6,71.2,77.5,78.3,79.1]: add(blip(),a,.18)
# outro fade
fade=np.ones(N); fade[int(83.5*SR):]=np.linspace(1,0,N-int(83.5*SR))
L*=fade; R*=fade
# normalize / limit
m=max(np.abs(L).max(),np.abs(R).max()); L=np.tanh(L/m*1.6)*.85; R=np.tanh(R/m*1.6)*.85
st=np.stack([L,R],1); st=(st*32767).astype(np.int16)
with wave.open('sfx.wav','wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(st.tobytes())
print('ok')
