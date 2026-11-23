import numpy as np, wave, subprocess
from scipy.signal import butter, lfilter
SR=44100
base=np.frombuffer(subprocess.check_output(['ffmpeg','-v','error','-i','mix.wav','-f','s16le','-ac','1','-ar',str(SR),'-']),np.int16)/32768.
N=len(base); o=np.zeros(N); rng=np.random.default_rng(5)
def add(t,x,g=1):
    i=int(t*SR); x=x[:max(0,N-i)]; o[i:i+len(x)]+=x*g
def bp(x,lo,hi): b,a=butter(2,[lo/(SR/2),hi/(SR/2)],'band'); return lfilter(b,a,x)
def env(n,a,r): e=np.ones(n); na,nr=int(a*SR),int(r*SR); e[:na]=np.linspace(0,1,na); e[-nr:]*=np.linspace(1,0,nr); return e
def whoosh(d=.45):
    n=int(d*SR); t=np.arange(n)/SR; f=300+900*t/d; return np.sin(2*np.pi*np.cumsum(f)/SR)*np.sin(np.linspace(0,np.pi,n))**2*.18
def stamp():
    n=int(.35*SR); t=np.arange(n)/SR; return np.sin(2*np.pi*70*t)*np.exp(-t*14)*1.2
def tick(f=1800): n=int(.03*SR); t=np.arange(n)/SR; return np.sin(2*np.pi*f*t)*np.exp(-t*160)*.35
def key(): n=int(.03*SR); t=np.arange(n)/SR; return np.sin(2*np.pi*2400*t)*np.exp(-t*150)*.25
for w in [8.9,17.76,32.75,48.66,57.66,69.68]: add(w-.1,whoosh())
for t in [14.2,23.7,62.0]: add(t,stamp(),.9)
for a,b,n in [(18.4,20.3,15),(20.5,21.6,3),(21.9,23.0,3),(51.6,53.8,22)]:
    for k in range(n): add(a+(b-a)*(1-(1-(k+1)/n)**(1/3)),tick(1600+k*20))
for i,L in enumerate([57,44,49]):
    a=58.4+i*3.1
    for k in range(L): add(a+2.4*k/L+rng.random()*.01,key(),.6)
add(29.6,whoosh(.6),.5); add(66.4,whoosh(.6),.5)
mix=base+o*0.6; mix=mix/max(1,np.abs(mix).max()/.95)
with wave.open('mix2.wav','wb') as w: w.setnchannels(1);w.setsampwidth(2);w.setframerate(SR);w.writeframes((mix*32767).astype(np.int16).tobytes())
subprocess.run(['ffmpeg','-v','error','-y','-i','mix2.wav','-af','alimiter=limit=0.9','-ar','44100','-ac','2','mix_final.wav'],check=True)
print('ok')
