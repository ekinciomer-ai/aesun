# Gerçek klipleri sahne zamanlarına göre keser, 1080x1920 30 fps taban video yapar, sonra kareleri çıkarır.
import json, subprocess, os, math
z=json.load(open('zaman.json')); K=json.load(open('kesim.json'))['sahneler']; FPS=30
os.makedirs('parca',exist_ok=True); liste=[]; n=0
def sure(f): return float(subprocess.check_output(['ffprobe','-v','error','-show_entries','format=duration','-of','csv=p=0',f]).decode())
for si,s in enumerate(z['sahneler']):
    for c in K[si]:
        bas=round((s['bas']+c['bas']*s['sure'])*FPS); son=round((s['bas']+c['son']*s['sure'])*FPS); kare=son-bas
        if kare<=0: continue
        d=kare/FPS; src=f"klip/{c['klip']}.mp4"; L=sure(src); k0=min(c['kaynak'],max(0,L-0.5))
        hiz=1.0
        if L-k0<d: hiz=max((L-k0)/d,1/1.6); k0=max(0,L-d*hiz)   # kısa klip: en çok 1,6 kat yavaşlat
        z0,z1=c['zoom']; zexp=f"({z0}+({z1}-{z0})*n/{max(kare-1,1)})"
        renk="eq=contrast=1.08:saturation=1.18:brightness=0.01,vignette=PI/5"
        if c['mod']=='kirp':
            cx=c['cx']
            vf=(f"setpts=(PTS-STARTPTS)/{hiz},fps={FPS},scale=-2:1920,"
                f"crop=1080:1920:'max(0,min(iw-1080,iw*{cx}-540))':0,"
                f"scale=w='trunc(1080*{zexp}/2)*2':h='trunc(1920*{zexp}/2)*2':eval=frame:flags=bicubic,"
                f"crop=1080:1920:'(iw-1080)/2':'(ih-1920)/2',{renk},setsar=1")
            filt=["-vf",vf]
        else:
            fc=(f"[0:v]setpts=(PTS-STARTPTS)/{hiz},fps={FPS},split[a][b];"
                f"[a]scale=-2:1920,crop=1080:1920,boxblur=30:2,eq=brightness=-0.18:saturation=0.9[bg];"
                f"[b]scale=1080:-2,{renk}[fg];[bg][fg]overlay=0:(H-h)/2-80,setsar=1[v]")
            filt=["-filter_complex",fc,"-map","[v]"]
        out=f"parca/{n:02d}.mp4"
        subprocess.check_call(['ffmpeg','-v','error','-y','-ss',str(k0),'-i',src]+filt+['-frames:v',str(kare),'-an','-c:v','libx264','-preset','veryfast','-crf','16','-pix_fmt','yuv420p',out])
        liste.append(out); n+=1; print('parça',out,c['klip'],kare,'kare',f'hız {hiz:.2f}')
open('parca/liste.txt','w').write(''.join(f"file '{os.path.basename(p)}'\n" for p in liste))
subprocess.check_call(['ffmpeg','-v','error','-y','-f','concat','-safe','0','-i','parca/liste.txt','-c','copy','taban.mp4'])
os.makedirs('kare',exist_ok=True); [os.remove('kare/'+f) for f in os.listdir('kare')]
subprocess.check_call(['ffmpeg','-v','error','-y','-i','taban.mp4','-q:v','3','kare/%05d.jpg'])
print('taban tamam', len(os.listdir('kare')),'kare')
