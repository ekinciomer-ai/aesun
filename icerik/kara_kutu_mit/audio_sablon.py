import numpy as np, wave, json, subprocess
exec(open('audio.py').read().split("# ---- music bed")[0].replace("DUR=64.46","DUR=64.46"))
TL=json.load(open('mit10_tl.json'))
# bed
drone=(np.sin(2*np.pi*55*t)*.5+np.sin(2*np.pi*82.4*t)*.25+np.sin(2*np.pi*110.3*t)*.12)*(0.6+0.4*np.sin(2*np.pi*0.07*t))
bed=drone*.11+lp_fast(rng.standard_normal(N),400)*.03
# silence-ish bed during poll freeze -> tension pulse instead
L+=bed;R+=bed
beat=60/90
kick=np.sin(2*np.pi*np.cumsum(np.linspace(90,40,int(.25*SR)))/SR)*np.exp(-np.arange(int(.25*SR))/SR/.07)
for k in np.arange(0.4,66,beat):
    if TL['poll']<=k<TL['rew']: continue
    add(kick,k,.18)
wind=lp_fast(rng.standard_normal(N),300)*.03
L+=wind;R+=wind
def engine(dur,f0,f1,g):
    n=int(dur*SR);f=np.linspace(f0,f1,n);ph=2*np.pi*np.cumsum(f)/SR
    s=(np.sin(ph)+.5*np.sin(2*ph)+.3*np.sin(3*ph))*np.linspace(.3,1,n)
    return s*g
add(engine(9.6,70,90,.07),TL['kaza'],1,.2)
def crash(intensity=1.0,dur=2.0):
    n=int(dur*SR);tt=np.arange(n)/SR
    thump=np.sin(2*np.pi*np.cumsum(np.linspace(110,30,n))/SR)*np.exp(-tt/.18)
    burst=lp_fast(rng.standard_normal(n),3500)*np.exp(-tt/.25)
    metal=sum(np.sin(2*np.pi*f*tt+rng.random()*6)*np.exp(-tt/(.2+rng.random()*.5)) for f in [317,523,811,1187,1543])*.25
    s=thump*1.2+burst*.9+metal*.6
    for k in range(40):
        at=rng.random()**2*1.4;f=3000+rng.random()*5000;m=int(.08*SR)
        ping=np.sin(2*np.pi*f*np.arange(m)/SR)*np.exp(-np.arange(m)/SR/.015);i=int(at*SR)
        if i+m<n:s[i:i+m]+=ping*.15*rng.random()
    return s*intensity
def screech(dur):
    n=int(dur*SR);tt=np.arange(n)/SR
    s=np.sin(2*np.pi*np.cumsum(2300+250*np.sin(2*np.pi*7*tt))/SR)*.4+bp_fast(rng.standard_normal(n),1800,4200)*.8
    return s*np.minimum(1,tt/.08)*np.exp(-tt/dur*1.2)
# real times from render probe
add(crash(.7),TL['_imp'],.7)
n=int(3*SR);sting=np.sin(2*np.pi*55*np.arange(n)/SR)*np.exp(-np.arange(n)/SR/1.2);add(sting,TL['_imp'],.35)

# tutanak + clues ticks
add(gavel()*.4 if False else np.zeros(10),0,0)
# city ambience
city=lp_fast(rng.standard_normal(N),700)*.05;L+=city;R+=city

# freeze: tape stop + clock ticks + countdown beeps
n=int(.5*SR);tt=np.arange(n)/SR;stop=np.sin(2*np.pi*np.cumsum(np.linspace(300,30,n))/SR)*np.exp(-tt/.25);add(stop,TL['poll'],.4)
tick=np.sin(2*np.pi*2400*np.arange(int(.02*SR))/SR)*np.exp(-np.arange(int(.02*SR))/SR/.004)
for k in np.arange(TL['poll']+.3,TL['cd0'],.5): add(tick,k,.25)
def beep(f,d=.12):
    n=int(d*SR);tt=np.arange(n)/SR;return np.sin(2*np.pi*f*tt)*np.minimum(1,tt/.005)*np.exp(-tt/.06)
for i in range(5): add(beep(880),TL['cd0']+i,.35)
add(beep(1320,.4),TL['cd0']+5,.4)
# rewind: fast warble noise sweep
n=int(TL['rewDur']*SR);tt=np.arange(n)/SR
rw=bp_fast(rng.standard_normal(n),800,6000)*(.5+.5*np.sin(2*np.pi*14*tt))+np.sin(2*np.pi*np.cumsum(np.linspace(600,2400,n))/SR)*.3
add(rw*np.clip(np.sin(np.pi*tt/tt[-1]),0,1)**.5,TL['rew'],.35)
# slow-mo whoosh down
n=int(1.0*SR);tt=np.arange(n)/SR;add(lp_fast(rng.standard_normal(n),1500)*np.sin(np.pi*tt/tt[-1]),TL['slow']-.3,.4)
def blip(f=1300):
    n=int(.08*SR);tt=np.arange(n)/SR;return np.sin(2*np.pi*f*tt)*np.exp(-tt/.02)
# verdict stamps
def gavel():
    n=int(.9*SR);tt=np.arange(n)/SR
    return np.sin(2*np.pi*np.cumsum(np.linspace(180,70,n))/SR)*np.exp(-tt/.09)*1.3+lp_fast(rng.standard_normal(n),2500)*np.exp(-tt/.03)+np.sin(2*np.pi*620*tt)*np.exp(-tt/.12)*.3
for s in TL['reasons']: add(blip(1300) if 'blip' in dir() else gavel()*.3,s[0],.3)
add(gavel(),TL['hukum'],.6);add(gavel(),TL['onay'],.8)
# hook: impact hit + stamp
add(gavel(),.6,.5);add(gavel(),4.0,.7)
for c in TL['clues']: add(blip(1700),c[0],.3)

# reveal ding for ders
add(beep(1046,.5)+beep(1568,.5)*.6,TL['ders'],.35)
fade=np.ones(N);fade[int(63.25999999999999*SR):]=np.linspace(1,0,N-int(63.25999999999999*SR));L*=fade;R*=fade
m=max(np.abs(L).max(),np.abs(R).max());L=np.tanh(L/m*1.6)*.85;R=np.tanh(R/m*1.6)*.85
st=(np.stack([L,R],1)*32767).astype(np.int16)
with wave.open('sfx_mit10.wav','wb') as w: w.setnchannels(2);w.setsampwidth(2);w.setframerate(SR);w.writeframes(st.tobytes())
print('ok')
