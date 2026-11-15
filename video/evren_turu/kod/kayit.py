# Kullanım: python3 kayit.py sahne.html cikti.mp4   |   python3 kayit.py sahne.html kare 0.5 1.5 2.5
import subprocess, sys, os
from playwright.sync_api import sync_playwright
html=os.path.abspath(sys.argv[1])
with sync_playwright() as p:
    b=p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox','--allow-file-access-from-files'])
    pg=b.new_page(viewport={'width':1080,'height':1920}); errs=[]
    pg.on('console',lambda m: errs.append(m.text) if m.type=='error' else None); pg.on('pageerror',lambda e: errs.append(str(e)))
    pg.goto('file://'+html); pg.evaluate('HAZIR'); el=pg.query_selector('#c'); T=pg.evaluate('TOTAL')
    if sys.argv[2]=='kare':
        for t in sys.argv[3:]:
            pg.evaluate(f'renderAt({t})'); el.screenshot(path=f'/tmp/kare_{t}.png')
    else:
        f=subprocess.Popen(['ffmpeg','-loglevel','error','-y','-f','image2pipe','-framerate','30','-c:v','mjpeg','-i','-','-c:v','libx264','-preset','veryfast','-crf','20','-pix_fmt','yuv420p','-movflags','+faststart',sys.argv[2]],stdin=subprocess.PIPE)
        for i in range(int(T*30)):
            pg.evaluate(f'renderAt({i/30})'); f.stdin.write(el.screenshot(type='jpeg',quality=90))
        f.stdin.close(); f.wait()
    print('T',T,'errs',errs); b.close()
