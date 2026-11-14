import json,subprocess,sys
K=json.load(open(sys.argv[1]));S={s['ad']:s for s in K['sahneler']}
def sure(f):return float(subprocess.check_output(['ffprobe','-v','error','-show_entries','format=duration','-of','csv=p=0',f]))
seg=[]
for ad,parca in [('kule',[('v1.mp4',1)]),('deneme',[('v2.mp4',1)]),('ucus',[('v3.mp4',1)]),('sultan',[('v4.mp4',.5),('v5.mp4',.5)]),('surgun',[('v6.mp4',.45),('v7.mp4',.55)]),('soru',[('v8.mp4',1)])]:
    d=S[ad]['son']-S[ad]['bas']
    for f,o in parca:seg.append((f,d*o))
inp=[];flt=[]
for i,(f,d) in enumerate(seg):
    inp+=['-i',f];k=d/sure(f)
    flt.append(f"[{i}:v]setpts={k:.4f}*PTS,fps=30,scale=1060:596:force_original_aspect_ratio=increase,crop=1060:596,trim=duration={d:.3f},setpts=PTS-STARTPTS[s{i}]")
flt.append(''.join(f'[s{i}]' for i in range(len(seg)))+f"concat=n={len(seg)}:v=1:a=0[kart]")
subprocess.run(['ffmpeg','-v','error','-y',*inp,'-filter_complex',';'.join(flt),'-map','[kart]','-c:v','libx264','-crf','16','-preset','medium','-pix_fmt','yuv420p','kart.mp4'],check=True)
subprocess.run(['ffmpeg','-v','error','-y','-i','sayfa.mp4','-i','kart.mp4','-loop','1','-i','maske.png','-filter_complex',
 "[2:v]format=gray[m];[1:v][m]alphamerge[k];[0:v][k]overlay=10:196:shortest=1[v]",'-map','[v]','-c:v','libx264','-crf','17','-preset','medium','-pix_fmt','yuv420p','goruntu.mp4'],check=True)
print('ok',sum(d for _,d in seg))
