import numpy as np, wave, subprocess, json
from scipy.signal import butter, lfilter
SR=44100; TL=json.load(open('tl.json')); V=TL['vo']
base=np.frombuffer(subprocess.check_output(['ffmpeg','-v','error','-i','/home/claude/sv/mix.wav','-f','s16le','-ac','1','-ar',str(SR),'-']),np.int16)/32768.
N=len(base); o=np.zeros(N); rng=np.random.default_rng(9)
def add(t,x,g=1):
    i=int(t*SR); x=x[:max(0,N-i)]; o[i:i+len(x)]+=x*g
def bp(x,lo,hi): b,a=butter(2,[lo/(SR/2),hi/(SR/2)],'band'); return lfilter(b,a,x)
def swipe(d=.35): n=int(d*SR); return bp(rng.standard_normal(n),600,6000)*np.sin(np.linspace(0,np.pi,n))**2*.3
def ping(f=1320): n=int(.35*SR); t=np.arange(n)/SR; return (np.sin(2*np.pi*f*t)+.5*np.sin(2*np.pi*f*1.5*t))*np.exp(-t*9)*.3
def pop(): n=int(.08*SR); t=np.arange(n)/SR; return np.sin(2*np.pi*(900-3000*t)*t)*np.exp(-t*40)*.35
def stamp(): n=int(.35*SR); t=np.arange(n)/SR; return np.sin(2*np.pi*70*t)*np.exp(-t*14)*1.1+bp(rng.standard_normal(n),200,2500)*np.exp(-t*30)*.7
def tick(f=1800): n=int(.03*SR); t=np.arange(n)/SR; return np.sin(2*np.pi*f*t)*np.exp(-t*160)*.3
st=lambda k:V[k][0]
for t in [st('V2'),st('V3'),st('V3')+8.9,st('V4'),st('V5'),st('V7')]: add(t-.25,swipe())
add(2.0,ping()); add(st('V3')+8.9+.3,ping(990))
for i in range(5): add(st('V2')+.4+i*1.15,pop())
for i,tt in enumerate([st('V5')+1.0,st('V5')+3.6,V['V6'][0]+.2]): add(tt,pop())
add(V['V6'][0]+.5,stamp())
for a,n in [(st('V3')+.6,15),(st('V3')+2.0,3),(st('V3')+3.0,3)]:
    for k in range(n): add(a+k*(1.0/n),tick(1500+k*30))
mix=base+o*.7; mix=mix/max(1,np.abs(mix).max()/.95)
with wave.open('mix2.wav','wb') as w: w.setnchannels(1);w.setsampwidth(2);w.setframerate(SR);w.writeframes((mix*32767).astype(np.int16).tobytes())
subprocess.run(['ffmpeg','-v','error','-y','-i','mix2.wav','-af','alimiter=limit=0.9','-ar','44100','-ac','2','mix_final.wav'],check=True); print('ok')
