#!/bin/bash
# Kullanım: ./bitir.sh <N> <TTS_KOD> <HAVUZ_KOD>
#   N         : sahne fonksiyonu numarası (window.renderMit<N>, tl/mit<N>_tl.json, vm<N>/V1..V7.wav)
#   TTS_KOD   : sunucu/tts_kuyruk/cikti içindeki ses kodu (ör. KK_MIT_10)
#   HAVUZ_KOD : Yükleme Yöneticisi kodu (ör. KK_MIT_10_KONU)
# Yapar: sesleri kırpar, efekt + miks, 2 paralel render, 540p önizleme mp4, 1080p yayın kopyası (havuz/gelen).
set -e
N=$1; TK=$2; HK=$3; AESUN=${AESUN:-/home/claude/aesun}; cd "$(dirname "$0")"
pgrep -f "http.server 8765" >/dev/null || (nohup python3 -m http.server 8765 >/tmp/http.log 2>&1 &) ; sleep 1
mkdir -p vm$N; for i in 1 2 3 4 5 6 7; do ffmpeg -y -loglevel error -i $AESUN/sunucu/tts_kuyruk/cikti/${TK}__V$i.mp3 -af "silenceremove=start_periods=1:start_threshold=-45dB,areverse,silenceremove=start_periods=1:start_threshold=-45dB,areverse" -ar 44100 -ac 1 vm$N/V$i.wav; done
END=$(python3 -c "import json;print(round(json.load(open('tl/mit${N}_tl.json'))['end'],2))")
python3 - $N $END <<'PY'
import re,sys
n,dur=sys.argv[1],float(sys.argv[2]);s=open('audio_sablon.py').read()
s=s.replace("mit10_tl.json",f"tl/mit{n}_tl.json").replace("sfx_mit10.wav",f"sfx_mit{n}.wav")
s=re.sub(r"DUR=[0-9.]+",f"DUR={dur}",s);s=re.sub(r"fade\[int\([0-9.]+\*SR\):\]=np.linspace\(1,0,N-int\([0-9.]+\*SR\)\)",f"fade[int({dur-1.2}*SR):]=np.linspace(1,0,N-int({dur-1.2}*SR))",s)
open(f'audio_mit{n}.py','w').write(s)
PY
python3 audio_mit$N.py >/dev/null
python3 - $N <<'PY'
import json,sys,subprocess
n=sys.argv[1];T=json.load(open(f'tl/mit{n}_tl.json'));S=T['_starts'];E=T['end'];ins=[];f=''
for i in range(7): ins+=['-i',f'vm{n}/V{i+1}.wav'];ms=int(S[i]*1000);f+=f'[{i}:a]adelay={ms}|{ms}[v{i}];'
f+=''.join(f'[v{i}]' for i in range(7))+f'amix=inputs=7:normalize=0,apad=whole_dur={E},atrim=0:{E}[vo]'
subprocess.run(['ffmpeg','-y','-loglevel','error',*ins,'-filter_complex',f,'-map','[vo]','-ar','44100',f'vm{n}/voice.wav'],check=True)
fc=f"[0:a]loudnorm=I=-16:TP=-1.5:LRA=11,apad=whole_dur={E},atrim=0:{E},asplit=2[v][sc];[1:a]volume=0.6[b];[b][sc]sidechaincompress=threshold=0.03:ratio=6:attack=20:release=400[bd];[v][bd]amix=inputs=2:normalize=0:duration=longest,alimiter=limit=0.95,atrim=0:{E}[out]"
subprocess.run(['ffmpeg','-y','-loglevel','error','-i',f'vm{n}/voice.wav','-i',f'sfx_mit{n}.wav','-filter_complex',fc,'-map','[out]','-ar','44100',f'vm{n}/mix.wav'],check=True)
PY
H=$(python3 -c "print(round($END/2,1))"); mkdir -p fm$N
RF=renderMit$N node render.mjs 540 960 24 0 $H fm$N > lr${N}_a.txt 2>&1 & RF=renderMit$N node render.mjs 540 960 24 $H $(python3 -c "print($END+0.05)") fm$N > lr${N}_b.txt 2>&1 & wait
ffmpeg -y -loglevel error -framerate 24 -i fm$N/f_%05d.jpg -i vm$N/mix.wav -c:v libx264 -preset veryfast -crf 20 -pix_fmt yuv420p -c:a aac -b:a 160k -shortest -movflags +faststart onizleme_$HK.mp4
ffmpeg -y -loglevel error -ss 0.35 -i onizleme_$HK.mp4 -vf "scale=1080:1920:flags=lanczos,eq=saturation=1.3:contrast=1.04,unsharp=5:5:0.6" -c:v libx264 -preset slow -crf 24 -maxrate 6M -bufsize 12M -pix_fmt yuv420p -c:a aac -b:a 192k -movflags +faststart $AESUN/sunucu/havuz/gelen/$HK.mp4
ls -la $AESUN/sunucu/havuz/gelen/$HK.mp4; echo BITTI $HK
