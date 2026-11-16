import numpy as np,wave
sr=44100;D=55.93;t=np.arange(int(sr*D))/sr;out=np.zeros_like(t)
n=lambda m:440*2**((m-69)/12)
ch=[[53,57,60],[50,53,57],[55,58,62],[52,55,59]]
for i in range(31):
    c=ch[i%4];s=i*2;idx=(t>=s)&(t<s+2.3);tt=t[idx]-s;env=np.minimum(1,tt/.5)*np.exp(-tt*.5)
    for m in c:out[idx]+=.05*env*np.sin(2*np.pi*n(m-12)*tt)
    out[idx]+=.05*env*np.sin(2*np.pi*n(c[0]-24)*tt)
    for k in range(8):
        a=s+k*.25;j=(t>=a)&(t<a+.35);u=t[j]-a;out[j]+=.022*np.exp(-u*10)*np.sin(2*np.pi*n(c[k%3]+24)*u)
for a in [6.2, 12.1, 17.2, 30.0, 38.3, 51.1]:
    j=(t>=a)&(t<a+.5);u=t[j]-a;out[j]+=.08*np.exp(-u*8)*np.sin(2*np.pi*(1100-500*u)*u)
out*=np.minimum(1,np.minimum(t/0.6,(D-t)/2));out=out/np.abs(out).max()*.5
w=wave.open('muzik.wav','w');w.setnchannels(1);w.setsampwidth(2);w.setframerate(sr);w.writeframes((out*32767).astype(np.int16).tobytes());w.close()
