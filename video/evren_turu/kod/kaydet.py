import subprocess, sys
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    b=p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox'])
    pg=b.new_page(viewport={'width':1080,'height':1920}); errs=[]
    pg.on('console',lambda m: errs.append(m.text) if m.type=='error' else None); pg.on('pageerror',lambda e: errs.append(str(e)))
    pg.goto('file:///home/claude/cizgi/k5.html'); pg.evaluate('HAZIR'); el=pg.query_selector('#c')
    T=pg.evaluate('TOTAL'); print('T',T)
    if 'kare' in sys.argv:
        for i,t in enumerate([3,10.5,12.5,18,26,31]):
            pg.evaluate(f'renderAt({t})'); el.screenshot(path=f'f{i}.png')
    else:
        f=subprocess.Popen(['ffmpeg','-loglevel','error','-y','-f','image2pipe','-framerate','24','-c:v','mjpeg','-i','-','-c:v','libx264','-preset','veryfast','-crf','21','-pix_fmt','yuv420p','-movflags','+faststart','gun01_kurgu.mp4'],stdin=subprocess.PIPE)
        for i in range(int(T*24)):
            pg.evaluate(f'renderAt({i/24})'); f.stdin.write(el.screenshot(type='jpeg',quality=88))
        f.stdin.close(); f.wait()
    print('errs',errs); b.close()
