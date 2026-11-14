# Telifsiz müzik: kodla sentez (Hicaz havası, 96 BPM). Kullanım: python muzik.py <sure_sn> <cikti.wav> <sahne_baslari_virgullu>
import sys, numpy as np, wave
SR=44100; T=float(sys.argv[1]); out=sys.argv[2]; bas=[float(x) for x in sys.argv[3].split(',')] if len(sys.argv)>3 else []
n=int(SR*T); L=np.zeros(n); R=np.zeros(n); t=np.arange(n)/SR
f=lambda m: 440*2**((m-69)/12)
# Hicaz (D): D Eb F# G A Bb C
olcek=[62,63,66,67,69,70,72,74]
# dron/pad: D + A, yavaş nefes
pad=0.12*(np.sin(2*np.pi*f(50)*t)+0.6*np.sin(2*np.pi*f(57)*t)+0.3*np.sin(2*np.pi*f(62)*t*1.002))*(0.75+0.25*np.sin(2*np.pi*t/8))
L+=pad; R+=pad
# telli (Karplus-Strong) arpej
rs=np.random.RandomState(3); beat=60/96
def tel(fr,sure,v):
    N=int(SR/fr); buf=rs.uniform(-1,1,N); m=int(SR*sure); o=np.zeros(m)
    for i in range(m): o[i]=buf[i%N]; buf[i%N]=0.996*0.5*(buf[i%N]+buf[(i+1)%N])
    return v*o
desen=[0,2,3,4,3,2,1,0, 4,5,6,7,6,4,3,2]
k=0; x=0.0
while x<T-0.5:
    m=olcek[desen[k%len(desen)]]; s=tel(f(m),beat*1.6,0.22 if k%4==0 else 0.14)
    i=int(x*SR); j=min(n,i+len(s)); pan=0.35+0.3*((k%3)/2)
    L[i:j]+=s[:j-i]*(1-pan); R[i:j]+=s[:j-i]*pan; x+=beat/2; k+=1
# darbuka: dum (alçak) / tek (tiz) — düm tek tek düm tek
def dum():
    m=int(0.25*SR); tt=np.arange(m)/SR; return 0.55*np.sin(2*np.pi*(90*np.exp(-tt*8)+55)*tt)*np.exp(-tt*14)
def tek():
    m=int(0.08*SR); tt=np.arange(m)/SR; return 0.22*rs.uniform(-1,1,m)*np.exp(-tt*55)
ritim=[(0,dum),(1,tek),(1.5,tek),(2,dum),(3,tek)]
x=0.0
while x<T-0.5:
    for o,fn in ritim:
        s=fn(); i=int((x+o*beat)*SR); j=min(n,i+len(s))
        if i<n: L[i:j]+=s[:j-i]; R[i:j]+=s[:j-i]
    x+=4*beat
# sahne geçişlerine 'whoosh'
for b in bas[1:]:
    m=int(0.5*SR); tt=np.arange(m)/SR; s=0.25*rs.uniform(-1,1,m)*np.sin(np.pi*tt/0.5)**2
    s=np.convolve(s,np.ones(12)/12,'same'); i=max(0,int((b-0.3)*SR)); j=min(n,i+m); L[i:j]+=s[:j-i]; R[i:j]+=s[:j-i]
# giriş/çıkış yumuşatma, normalize
fade=np.minimum(1,np.minimum(t/0.8,(T-t)/1.5)); L*=fade; R*=fade
mx=max(np.abs(L).max(),np.abs(R).max(),1e-9); L=L/mx*0.85; R=R/mx*0.85
st=(np.stack([L,R],1)*32767).astype(np.int16)
w=wave.open(out,'wb'); w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(st.tobytes()); w.close()
print('muzik tamam', T)
