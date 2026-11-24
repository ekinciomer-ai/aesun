import json
import math
import subprocess as sp
import sys
import wave
from array import array
from pathlib import Path

video, code, folder, out = sys.argv[1:]
folder, out = Path(folder), Path(out)
slots = [0, 4, 8, 12, 17, 22, 27, 31, 38]
rate = 44100
score = [50, 57, 62, 65, 53, 60, 65, 69, 48, 55, 60, 64, 55, 62, 67, 70]
cues = [0.7, 1.6, 4.8, 9.1, 13.3, 15, 22.2, 28.75, 32.1, 35.2]
notes = [(i * .46, 440 * 2 ** ((score[i % len(score)] - 69) / 12), .034) for i in range(83)]
notes.extend((t, f, .07) for t, f in zip(cues, [520, 300, 620, 420, 220, 160, 490, 120, 830, 1040]))
track = array('h', [0]) * (rate * 38)
for onset, frequency, volume in notes:
    start = round(onset * rate)
    for i in range(min(rate, len(track) - start)):
        t = i / rate
        phase = math.tau * frequency * t
        envelope = (1 - math.exp(-t * 190)) * math.exp(-t * 10)
        sample = volume * envelope * (math.sin(phase) + .25 * math.sin(phase * 2))
        track[start + i] += round(32767 * sample * min(1, (len(track)-start-i) / (rate*.6)))
music = out.with_suffix('.wav')
with wave.open(str(music), 'wb') as wav:
    wav.setparams((1, 2, rate, 0, 'NONE', 'not compressed'))
    wav.writeframes(track.tobytes())
args = ['ffmpeg', '-v', 'error', '-y', '-i', video, '-i', str(music)]
filters = ['[1:a]aresample=44100[m]']
labels = ['[m]']
for i in range(8):
    path = folder / f'{code}__P{i+1:02d}.mp3'
    duration = float(sp.check_output(['ffprobe','-v','error','-show_entries','format=duration','-of','csv=p=0',str(path)]))
    speed = max(1, duration / (slots[i+1]-slots[i]-.25))
    args.extend(['-i', str(path)])
    filters.append(f'[{i+2}:a]aresample=44100,atempo={speed:.5f},adelay={slots[i]*1000}:all=1[v{i}]')
    labels.append(f'[v{i}]')
filters.append(''.join(labels) + 'amix=inputs=9:normalize=0:duration=first,loudnorm=I=-14:TP=-2.8:LRA=11[a]')
sp.run(args + ['-filter_complex',';'.join(filters),'-map','0:v:0','-map','[a]',
               '-vf','scale=1080:1920:flags=lanczos','-c:v','libx264','-preset','fast','-crf','19',
               '-pix_fmt','yuv420p','-c:a','aac','-b:a','192k','-movflags','+faststart',str(out)],check=True)
music.unlink()
