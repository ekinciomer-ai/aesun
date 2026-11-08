"""Seslendirme parçalarından zaman çizelgesi + altyazı + tek anlatım izi üretir.
python3 kurgu.py <ses_kodu> <çıktı klasörü> <ad> <dil> <gecis flas|kara> <sahne listesi, virgüllü; bölünen sahne a+b> [bosluk] [bas] [kuyruk]
Sesler: sunucu/ses_kuyruk/cikti/<kod>__<parça>.mp3, metinler: sunucu/ses_kuyruk/tamam/<kod>.json"""
import json,subprocess,re,sys,os,tempfile
K=os.path.dirname(os.path.abspath(__file__))+"/../../sunucu/ses_kuyruk"
kod,out,ad,dil,gecis,sl=sys.argv[1:7];bosluk=float(sys.argv[7]) if len(sys.argv)>7 else .3;bas0=float(sys.argv[8]) if len(sys.argv)>8 else .4;kuyruk=float(sys.argv[9]) if len(sys.argv)>9 else 1.8
J=json.load(open(f"{K}/tamam/{kod}.json",encoding="utf-8"));sahne=[x.split("+") for x in sl.split(",")]
assert len(sahne)==len(J["parcalar"]),"sahne sayısı parça sayısına eşit olmalı"
tmp=tempfile.mkdtemp()
def kirp(src,dst):
    subprocess.run(["ffmpeg","-v","error","-y","-i",src,"-af","silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.05,areverse,silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.12,areverse","-ar","48000","-ac","1",dst],check=True)
    return float(subprocess.check_output(["ffprobe","-v","error","-show_entries","format=duration","-of","csv=p=0",dst]))
def parca(t,n=40):
    t=re.sub(r"\[[^\]]*\]\s*","",t).strip();out=[];cur=""
    for x in t.split():
        if len(cur)+len(x)+1>n and cur:out.append(cur);cur=x
        else:cur=(cur+" "+x).strip()
        if cur.endswith((".","!","?")) and len(cur)>18:out.append(cur);cur=""
    if cur:out.append(cur)
    return out
t=bas0;S=[];A=[];L=[]
for p,sh in zip(J["parcalar"],sahne):
    f=f"{tmp}/{p['ad']}.wav";d=kirp(f"{K}/cikti/{kod}__{p['ad']}.mp3",f);L.append((f,t));son=t+d+bosluk
    if len(sh)==2:S+=[{"ad":sh[0],"bas":t,"son":t+(son-t)*.45},{"ad":sh[1],"bas":t+(son-t)*.45,"son":son}]
    else:S.append({"ad":sh[0],"bas":t,"son":son})
    ch=parca(p["metin"]);tot=sum(len(c) for c in ch);u=t
    for c in ch:dd=d*len(c)/tot;A.append({"bas":round(u,3),"son":round(u+dd,3),"metin":c});u+=dd
    t=son
S[0]["bas"]=0;S[-1]["son"]=t+kuyruk
k={"sahneler":S,"altyazi":A,"gecis":gecis,"toplam":round(t+kuyruk,3),"dil":dil}
json.dump(k,open(f"{out}/kurgu_{ad}.json","w",encoding="utf-8"),ensure_ascii=False)
inp=[];flt=[]
for i,(f,tt) in enumerate(L):inp+=["-i",f];flt.append(f"[{i}]adelay={int(tt*1000)}|{int(tt*1000)}[a{i}]")
flt.append("".join(f"[a{i}]" for i in range(len(L)))+f"amix=inputs={len(L)}:normalize=0,apad,atrim=0:{k['toplam']}[o]")
subprocess.run(["ffmpeg","-v","error","-y",*inp,"-filter_complex",";".join(flt),"-map","[o]","-ar","48000","-c:a","flac",f"{out}/anlatim_{ad}.flac"],check=True)
print(ad,k["toplam"],len(A))
