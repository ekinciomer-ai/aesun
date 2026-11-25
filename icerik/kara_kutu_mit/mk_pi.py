# Kara Kutu · "Patron mu Haklı, İşçi mi?" bölüm üretici: mk_ep2 şablonunu kullanır, seri etiketlerini değiştirir.
# Kullanım: python3 mk_is.py bolumler_isNN.json [--tl]
import json, sys
import mk_ep2, mk_tl
# HIZLI KURGU (Ömer 23.11): ses %12 hızlı, cümle içi uzun duraksamalar kırpılır, parçalar arası boşluklar kısa, geri sayım 3 sn
SESFILTRE='silenceremove=start_periods=1:start_threshold=-45dB,silenceremove=stop_periods=-1:stop_duration=0.22:stop_threshold=-42dB,areverse,silenceremove=start_periods=1:start_threshold=-45dB,areverse,atempo=1.12'
import os, subprocess
def trim(N, kod):
  os.makedirs(f'vm{N}', exist_ok=True)
  for i in range(1, 8):
    subprocess.run(['ffmpeg','-y','-loglevel','error','-i',f"{mk_ep2.AESUN}/sunucu/tts_kuyruk/cikti/{kod}__V{i}.mp3",'-af',SESFILTRE,'-ar','44100','-ac','1',f'vm{N}/V{i}.wav'],check=True)
mk_ep2.trim=trim
def build(kod,vdir,out,mapf,clues,reasons,nextfrac=.45,extra={}):
  P=json.load(open(f"{mk_ep2.AESUN}/sunucu/tts_kuyruk/tamam/{kod}.json"))['parcalar']
  D=[mk_tl.dur(f'{vdir}/V{i}.wav') for i in range(1,8)];S=[0]*7
  S[0]=.25;kaza=S[0]+D[0]+.15;S[1]=kaza+.05;S[2]=S[1]+D[1]+.08;poll=S[2]+D[2]+.1;S[3]=poll+.1;cd0=S[3]+D[3]*.55
  rew=max(S[3]+D[3]+.15,cd0+3.1);rd=.8;slow=rew+rd;S[4]=slow+.05;karar=S[4]+D[4]+.15;S[5]=karar+.05;ders=S[5]+D[5]+.15;S[6]=ders+.05;end=S[6]+D[6]+.8
  T={"kaza":kaza,"poll":poll,"cd0":cd0,"rew":rew,"rewDur":rd,"slow":slow,"karar":karar,"ders":ders,"next":S[6]+D[6]*nextfrac,"end":end,"suc":999,"cut":999}
  T.update(mapf(S,D,T))
  T["clues"]=[[S[4]+o,x] for o,x in clues];T["reasons"]=[[S[5]+o,x] for o,x in reasons[:-2]]
  T["hukum"]=S[5]+reasons[-2];T["onay"]=S[5]+D[5]-reasons[-1]
  T["caps"]=mk_tl.caps_for([p['metin'] for p in P],S,D);T["_starts"]=S;T.update(extra)
  json.dump(T,open(out,'w'),ensure_ascii=False);return T
mk_tl.build=build
mk_tl.DISP.update({'Sekiz bin dokuz yüz kırk üç lira':'8.943 TL','Yedi yılda':'7 yılda','Yedi yılı':'7 yılı','Yedi yüz kırk dört':'744','yüz otuz altısını':"136'sını",'Yüz otuz altı':'136','On yedi':'17','Üç kadın':'3 kadın','dört yılı':'4 yılı','Beş yıl':'5 yıl'})
mk_tl.DISP = {'yüzde yirmi dokuz': '%29', 'yüzde seksen': '%80', 'yüzde yirmi': '%20',
  'sekiz yüz kırk bin lirayı aşan': '840.314 TL', 'yüz bin lira': '100.000 TL', 'yaklaşık üç metreden': '~3 metreden', **mk_tl.DISP}
mk_tl.DISP.update({'bir virgül yirmi dokuz katı':'1,29 katı','haftada beş buçuk saat':'haftada 5,5 saat','bir yıl içinde':'1 yıl içinde','elli bin lira':'50.000 TL','iki yüz yirmi bin lira':'220.000 TL','yüz kırk bir bin lira':'141.593 TL','on iki yıldır':'12 yıldır','Sekiz aylık':'8 aylık','Sekiz ay':'8 ay','sekiz ay':'8 ay','altı buçuk yıl':'6,5 yıl','On gün':'10 gün','dört ay':'4 ay','üç yıldır':'3 yıldır','iki yıl':'2 yıl','Kod yirmi dokuz':'Kod 29','kod yirmi dokuz':'kod 29','kod sıfır dört':'kod 04','dört gün':'4 gün','bir yıllık':'1 yıllık','iki aylık':'2 aylık','İki ay':'2 ay','dokuz yıldır':'9 yıldır','Otuza yakın':'30’a yakın'})
E = json.load(open(sys.argv[1])); s = open('scene.html').read()
for e in E:
  import os
  if '--tl' in sys.argv or not os.path.exists(f"tl/mit{e['N']}_tl.json"): mk_ep2.timeline(e)
  s = mk_ep2.render_fn(s, e); N = e['N']
  a = s.index(f"const T{N}=await"); z = s.index("tags.innerHTML=tg;return true};", a) + len("tags.innerHTML=tg;return true};")
  b = s[a:z]
  for o, n in [('MİT Mİ GERÇEK Mİ?', 'PATRON MU HAKLI? · İŞ HUKUKU'), ("['MİT',0]", "['İDDİA',0]"), ('MİT ÇÖKTÜ', 'İDDİA ÇÖKTÜ'),
               ('Kişi, plaka ve yer bilgisi', 'Kişi, şirket ve yer bilgisi'), ('Math.ceil(5-(t-cd))','Math.ceil(3-(t-cd))'), ('(t-cd)/5,0,1)','(t-cd)/3,0,1)')]:
    b = b.replace(o, n)
  s = s[:a] + b + s[z:]
open('scene.html', 'w').write(s); print('tamam', [e['N'] for e in E])
