"""Kara Kutu: sahne dosyasını kare kare kaydeder ve anlatım + altlık (ducking) + efektle karıştırır.
python3 kaydet.py <dil> [genislik=1080] [sahne=sahne.html] [ad=kk2d_kavsak]  →  <dil>/<ad>_<dil>.mp4"""
import asyncio,json,subprocess,sys,os
from playwright.async_api import async_playwright
dil=sys.argv[1];Wd=int(sys.argv[2]) if len(sys.argv)>2 else 1080;Hd=Wd*16//9
SAHNE=sys.argv[3] if len(sys.argv)>3 else 'sahne.html';AD=sys.argv[4] if len(sys.argv)>4 else 'kk2d_kavsak';OLCEK=1080/Wd
D=os.path.dirname(os.path.abspath(__file__));O=f"{D}/{os.environ.get('KK_CIKTI',dil)}";K=json.load(open(f"{O}/kurgu_{dil}.json",encoding="utf-8"));FPS=30
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(args=['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']);pg=await b.new_page(viewport={'width':Wd,'height':Hd});pg.on('pageerror',lambda e:print('HATA',e))
        await pg.goto((os.environ.get('KK_URL') or f'file://{D}')+f'/{SAHNE}?kayit=1');await pg.wait_for_function('window.HAZIR');await pg.evaluate("k=>kurgu(k)",K)
        n=int(K["toplam"]*FPS)
        ff=subprocess.Popen(["ffmpeg","-v","error","-y","-f","image2pipe","-framerate",str(FPS),"-c:v","mjpeg","-i","-","-c:v","libx264","-preset","veryfast","-crf","18","-pix_fmt","yuv420p",f"{O}/sessiz_{AD}.mp4"],stdin=subprocess.PIPE)
        for i in range(n):
            await pg.evaluate(f"kare({i/FPS})");ff.stdin.write(await pg.screenshot(type='jpeg',quality=94))
            if i%300==0: print(f"{dil} {i}/{n}",flush=True)
        ff.stdin.close();ff.wait();await b.close()
asyncio.run(main())
T=K["toplam"]
subprocess.run(["ffmpeg","-v","error","-y","-i",f"{O}/sessiz_{AD}.mp4","-i",f"{O}/anlatim.wav","-i",f"{O}/muzik.wav","-i",f"{O}/efekt.wav","-filter_complex",
 "[1:a]aformat=sample_rates=48000:channel_layouts=stereo,highpass=f=70,acompressor=threshold=-20dB:ratio=3:attack=5:release=120,asplit[n1][n2];"
 f"[2:a]volume=0.32,afade=t=in:d=0.5,afade=t=out:st={T-1.5}:d=1.5[m];[m][n1]sidechaincompress=threshold=0.03:ratio=8:attack=15:release=350[md];"
 "[3:a]volume=0.55[e];[md][e][n2]amix=inputs=3:normalize=0,loudnorm=I=-14:TP=-1.5:LRA=9[a]",
 "-map","0:v","-map","[a]","-vf","scale=1080:1920:flags=lanczos","-c:v","libx264","-preset","slow","-crf","22","-maxrate","6M","-bufsize","12M","-c:a","aac","-b:a","192k","-ar","48000","-shortest","-movflags","+faststart",f"{O}/{AD}_{dil}.mp4"],check=True)
print("bitti",f"{O}/{AD}_{dil}.mp4")
