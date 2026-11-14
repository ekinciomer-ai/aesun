# Anlatım parçalarını sahne başlarına yerleştirip tek iz yapar. Kullanım: python karistir.py zaman.json anlatim.wav
import json, subprocess, sys
z = json.load(open(sys.argv[1])); a = ["ffmpeg", "-v", "error", "-y"]; f = []
for i, s in enumerate(z["sahneler"]):
    a += ["-i", "ses/" + s["ses"]]; ms = int(s["ses_bas"] * 1000)
    f.append(f"[{i}:a]aresample=44100,adelay={ms}|{ms},apad[a{i}]")
n = len(z["sahneler"]); top = z["toplam"]
f.append("".join(f"[a{i}]" for i in range(n)) + f"amix=inputs={n}:normalize=0,atrim=0:{top}[v]")
subprocess.check_call(a + ["-filter_complex", ";".join(f), "-map", "[v]", "-ac", "2", sys.argv[2]])
print("anlatım tamam")
