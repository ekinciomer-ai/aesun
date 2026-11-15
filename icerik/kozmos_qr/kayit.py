from playwright.sync_api import sync_playwright
import subprocess,base64
FPS=30;N=int(60.92*FPS)
ff=subprocess.Popen(['ffmpeg','-y','-loglevel','error','-f','image2pipe','-framerate',str(FPS),'-c:v','mjpeg','-i','-','-i','karisim.wav','-c:v','libx264','-preset','veryfast','-crf','20','-pix_fmt','yuv420p','-c:a','aac','-b:a','160k','-shortest','-movflags','+faststart','KozmosLab_BuMatematikNerede_05_QRKod.mp4'],stdin=subprocess.PIPE)
with sync_playwright() as p:
    b=p.chromium.launch(executable_path='/usr/bin/google-chrome')
    pg=b.new_page(viewport={'width':1080,'height':1920})
    pg.goto('file:///home/claude/qr/sahne.html?rec')
    for i in range(N):
        u=pg.evaluate(f"renderAt({i/FPS});document.getElementById('c').toDataURL('image/jpeg',0.92)")
        ff.stdin.write(base64.b64decode(u.split(',')[1]))
ff.stdin.close();ff.wait();print('ok')
