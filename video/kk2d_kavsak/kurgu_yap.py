"""Kara Kutu 2D: seslendirme parçalarından zaman çizelgesi (kurgu_<dil>.json) + anlatım izi + müzik/efekt izi üretir.
python3 kurgu_yap.py <dil> <mp3 klasörü>   (mp3: KK2D_KAVSAK_<DİL>__V1..V7.mp3)"""
import json,subprocess,sys,os,re,tempfile
import numpy as np
dil,src=sys.argv[1],sys.argv[2];HIZ=os.environ.get('KK_HIZ','1.32');D=os.path.dirname(os.path.abspath(__file__));OUT=f"{D}/{os.environ.get('KK_CIKTI',dil)}";os.makedirs(OUT,exist_ok=True)
kod=f"{os.environ.get('KK_KOD','KK2D_KAVSAK')}_{dil.upper()}";J=json.load(open(f"{D}/../../sunucu/tts_kuyruk/tamam/{kod}.json",encoding="utf-8")) if os.path.exists(f"{D}/../../sunucu/tts_kuyruk/tamam/{kod}.json") else json.load(open(f"{D}/../../sunucu/tts_kuyruk/{kod}.json",encoding="utf-8"))
MET={p["ad"]:p["metin"] for p in J["parcalar"]}
SR=48000;tmp=tempfile.mkdtemp()
def kirp(a,b):
    subprocess.run(["ffmpeg","-v","error","-y","-i",a,"-af","silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.05,silenceremove=stop_periods=-1:stop_duration=0.3:stop_threshold=-42dB:stop_silence=0.15,areverse,silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.1,areverse,atempo="+HIZ,"-ar",str(SR),"-ac","1",b],check=True)
    return float(subprocess.check_output(["ffprobe","-v","error","-show_entries","format=duration","-of","csv=p=0",b]))
def oran(metin,parca):   # parçanın metindeki başlangıç oranı (karakter)
    i=metin.lower().find(parca.lower());return max(0,i)/len(metin)
ANAH={"tr":{"carp":"Çarpış","tali":"Ama","onay":"Yargıtay","ip":["Birinci","İkinci","Üçüncü"]},
      "en":{"carp":"They collide","tali":"But the rider","onay":"Turkey's Supreme","ip":["Clue one","Clue two","Clue three"]},
      "es":{"carp":"Chocan","tali":"Pero el motorista","onay":"El Tribunal","ip":["Pista uno","Pista dos","Pista tres"]}}[dil]
if os.environ.get("KK_ANAH"): ANAH.update(json.loads(os.environ["KK_ANAH"]))
t=0.35;P={};L=[];A=[];BOS=0.15
for v in ["V1","V2","V3","V4","V5","V6","V7"]:
    w=f"{tmp}/{v}.wav";d=kirp(f"{src}/{kod}__{v}.mp3",w);L.append((w,t));P[v]=[round(t,3),round(t+d,3)]
    # altyazı: noktalama ve ~42 karakterle böl, süre karakter oranıyla
    m=MET[v];par=[];cur=""
    for k in m.split():
        if len(cur)+len(k)+1>42 and cur: par.append(cur);cur=k
        else: cur=(cur+" "+k).strip()
        if re.search(r"[.!?:]$",cur) and len(cur)>16: par.append(cur);cur=""
    if cur: par.append(cur)
    tot=sum(len(c) for c in par);u=t
    for c in par:
        dd=d*len(c)/tot;A.append({"bas":round(u,3),"son":round(u+dd,3),"metin":c});u+=dd
    t=t+d+BOS
    if v=="V4": P["V4"][1]=round(t+2.6,3);sayac=[round(t+0.05,3),round(t+2.55,3)];t+=2.65   # oylama geri sayımı
for v in ["V1","V2","V3","V4","V5","V6"]: P[v][1]=P[["V2","V3","V4","V5","V6","V7"][["V1","V2","V3","V4","V5","V6"].index(v)]][0]
toplam=round(P["V7"][1]+1.2,3);P["V7"][1]=toplam
dur=lambda v:(L[["V1","V2","V3","V4","V5","V6","V7"].index(v)][1],kirp(f"{src}/{kod}__{v}.mp3",f"{tmp}/x.wav"))
def zaman(v,parca):b,d=dur(v);return round(b+d*oran(MET[v],parca),3)
K={"toplam":toplam,"dil":dil,"parca":P,"sayac":sayac,"altyazi":A,
   "carp":zaman("V3",ANAH["carp"])+0.15,"tali":zaman("V6",ANAH["tali"]),"onayT":zaman("V6",ANAH["onay"]),"ip":[zaman("V5",x) for x in ANAH["ip"]]}
json.dump(K,open(f"{OUT}/kurgu_{dil}.json","w",encoding="utf-8"),ensure_ascii=False)
# anlatım izi
inp=[];flt=[]
for i,(f,tt) in enumerate(L): inp+=["-i",f];flt.append(f"[{i}]adelay={int(tt*1000)}|{int(tt*1000)}[a{i}]")
flt.append("".join(f"[a{i}]" for i in range(len(L)))+f"amix=inputs={len(L)}:normalize=0,apad,atrim=0:{toplam}[o]")
subprocess.run(["ffmpeg","-v","error","-y",*inp,"-filter_complex",";".join(flt),"-map","[o]","-ar",str(SR),"-ac","2",f"{OUT}/anlatim.wav"],check=True)
# ---- müzik altlığı + efektler (numpy sentez, telifsiz) ----
N=int(toplam*SR);tt=np.arange(N)/SR;rng=np.random.default_rng(7)
def lp(x,fc):
    a=1-np.exp(-2*np.pi*fc/SR);y=np.empty_like(x);s=0.0
    for i in range(len(x)): s+=a*(x[i]-s);y[i]=s
    return y
def lpf(x,fc):  # hızlı alçak geçiren (FFT)
    X=np.fft.rfft(x);f=np.fft.rfftfreq(len(x),1/SR);X*=1/(1+(f/fc)**4);return np.fft.irfft(X,len(x))
BED=np.zeros(N);SFX=np.zeros(N)
def koy(buf,s,at,g=1.0):
    i=int(at*SR);j=min(N,i+len(s))
    if i<N and j>i: buf[i:j]+=s[:j-i]*g
# gerilim altlığı: D minör drone + 96 BPM nabız; oylamada nabız, kararda açılış
drone=(np.sin(2*np.pi*73.4*tt)*.5+np.sin(2*np.pi*110*tt)*.3+np.sin(2*np.pi*146.8*tt)*.15)*(0.7+0.3*np.sin(2*np.pi*0.11*tt))
BED+=drone*0.16+lpf(rng.standard_normal(N),500)*0.025
beat=60/96;kn=int(.28*SR);ka=np.arange(kn)/SR
kick=np.sin(2*np.pi*np.cumsum(np.linspace(95,42,kn))/SR)*np.exp(-ka/.08)
for k in np.arange(P["V2"][0],P["V7"][1]-1.5,beat):
    g=0.55 if P["V4"][0]<=k<P["V5"][0] else 0.35
    koy(BED,kick,k,g)
# ders bölümünde açılan akor (D majör)
a0=P["V7"][0];m=(tt>=a0)
for f in (146.8,185.0,220.0,293.7): BED+=m*np.sin(2*np.pi*f*tt)*0.05*np.clip((tt-a0)/1.5,0,1)
def motor(d,f0,f1,g):
    n=int(d*SR);f=np.linspace(f0,f1,n);ph=2*np.pi*np.cumsum(f)/SR;s=(np.sin(ph)+.5*np.sin(2*ph)+.3*np.sin(3*ph))
    return lpf(s,900)*np.linspace(.4,1,n)*g
def carpisma():
    n=int(1.8*SR);a=np.arange(n)/SR
    s=np.sin(2*np.pi*np.cumsum(np.linspace(120,30,n))/SR)*np.exp(-a/.2)*1.2+lpf(rng.standard_normal(n),3500)*np.exp(-a/.25)*.9
    s+=sum(np.sin(2*np.pi*f*a+rng.random()*6)*np.exp(-a/(.2+rng.random()*.5)) for f in (317,523,811,1187,1543))*.2
    return s
def blip(f=1250,d=.14):a=np.arange(int(d*SR))/SR;return np.sin(2*np.pi*f*a)*np.exp(-a/.04)
def tokmak():a=np.arange(int(.5*SR))/SR;return (np.sin(2*np.pi*np.cumsum(np.linspace(220,90,len(a)))/SR)*np.exp(-a/.06)+lpf(rng.standard_normal(len(a)),2000)*np.exp(-a/.03))
def geri():
    n=int(1.2*SR);a=np.arange(n)/SR;f=np.linspace(1800,200,n);return np.sin(2*np.pi*np.cumsum(f)/SR)*0.3*np.exp(-a/.9)+lpf(rng.standard_normal(n),3000)*0.15*(1-a/1.2)
koy(SFX,motor(P["V3"][0]-P["V2"][0]+1,55,75,.10),P["V2"][0])
koy(SFX,motor(P["V3"][0]-P["V2"][0]+1,140,190,.05),P["V2"][0]+0.5)
koy(SFX,motor(K["carp"]-P["V3"][0],75,95,.14),P["V3"][0])
koy(SFX,carpisma(),K["carp"],0.9)
koy(SFX,blip(880,.3),P["V1"][0],0.5)
for i in range(3): koy(SFX,blip(1000),sayac[0]+i,0.6)
koy(SFX,blip(1500,.25),sayac[1],0.7)
koy(SFX,geri(),P["V5"][0],0.8)
for x in K["ip"]: koy(SFX,blip(1300),x,0.6)
koy(SFX,tokmak(),P["V6"][0]+0.25,0.9);koy(SFX,tokmak(),P["V6"][0]+0.55,0.8)
koy(SFX,tokmak(),K["onayT"],0.7)
koy(SFX,blip(1760,.4),K["onayT"]+0.6,0.4)
def yaz(x,ad):
    x=np.clip(x/max(1e-9,np.abs(x).max())*0.9,-1,1);pcm=(np.stack([x,x],1)*32767).astype(np.int16)
    import wave;w=wave.open(f"{OUT}/{ad}","wb");w.setnchannels(2);w.setsampwidth(2);w.setframerate(SR);w.writeframes(pcm.tobytes());w.close()
yaz(BED,"muzik.wav");yaz(SFX,"efekt.wav")
print(dil,toplam,"sn",len(A),"altyazı")
