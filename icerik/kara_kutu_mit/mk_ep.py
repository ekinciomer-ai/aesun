def mk(s,N,scIdx,updName,hookNo,hookMain,hookSub,pollQ,opts,verdHd,sonuc,dogru,dersHtml,camKaza,camRest,camKarar,chips,blackTxt,tagsK,tagsS,src='Yargıtay',stamp=None):
  i=s.index("const T5=await");j=s.index("tags.innerHTML=tg;return true};",i)+len("tags.innerHTML=tg;return true};")
  b=s[i:j]
  for a,c in [('T5',f'T{N}'),('lt5',f'lt{N}'),('pbar5',f'pbar{N}'),('hook5',f'hook{N}'),('poll5',f'poll{N}'),('rew5',f'rew{N}'),('verdict5',f'verdict{N}'),('ders5',f'ders{N}'),('cap5',f'cap{N}'),('LAMPS5',f'LAMPS{N}'),('ARR5',f'ARR{N}'),('renderMit5',f'renderMit{N}'),('mit5_tl.json',f'mit{N}_tl.json')]:
    b=b.replace(a,c)
  def rep(o,n):
    nonlocal b
    assert o in b,(N,o[:70]); b=b.replace(o,n)
  rep('MİT #4',hookNo)
  rep('“KEMER<br>TAKMAMAK<br><span style="color:#ffb15c;font-size:1.4em">SADECE</span><br>TRAFİK CEZASIDIR”',hookMain)
  rep('Peki kaza olunca<br><span style="color:#ff453a">ne olur?</span>',hookSub)
  rep("[['A','Hiç alamadı'],['B','Tamamını aldı, kusur sürücüde'],['C','Aldı ama bir kısmı kesildi']]",opts)
  rep('KEMERSİZ YOLCU TAZMİNAT ALDI MI?',pollQ)
  rep('HEYETİN GEREKÇESİ',verdHd)
  k0=b.index(f" if(t>=T{N}.suc){{");k1=b.index(f" if(t>=T{N}.hukum){{");b=b[:k0]+b[k1:]
  rep('SONUÇ: TAZMİNAT %20 AZALDI',sonuc);rep('Doğru şık: C',dogru)
  k0=b.index(f"function ders{N}");k1=b.index(f"function cap{N}")
  b=b[:k0]+f"function ders{N}(t){{const a=T{N}.ders;if(t<a)return '';const o=fadeIn(t,a);const n=fadeIn(t,T{N}.next);\n return `"+dersHtml+"`}\n"+b[k1:]
  rep("const sc=S[0];",f"const sc=S[{scIdx}];")
  rep("const st=sc.upd(lt);",f"const st=sc.{updName}(lt);")
  rep("const bl=(Math.floor(t*2)%2)===0;LAMPS"+N+".forEach(m=>{const hx=m.emissive.getHex();m.emissiveIntensity=(hx===0xffaa00&&bl)?6:0});ARR"+N+".forEach(m=>m.opacity=0);","")
  rep("if(!LAMPS"+N+"){","if(false){")
  k0=b.index(f" if(t<T{N}.kaza){{const u=t/T{N}.kaza;");k1=b.index(" camera.position.copy(P);",k0)
  b=b[:k0]+" "+camKaza+"\n else{"+camRest+f"if(t>=T{N}.karar){{"+camKarar+"}}\n"+b[k1:]
  o=f"if(t>=T{N}.kaza&&t<T{N}.poll)h+=`<div style=\"position:absolute;right:6%;top:15%;font-weight:900;font-size:calc(var(--W)*0.03);background:rgba(0,0,0,.6);border:1px solid #fff;padding:.2em .6em;border-radius:6px\">TEMSİLİ CANLANDIRMA</div>`;"
  rep(o,o+chips)
  rep("YOLCU ARAÇTAN<br><span style=\"color:#ff453a\">DIŞARI FIRLADI</span>",blackTxt)
  rep("tg+=tag3(st.B,1.9,'YOLCU BU ARAÇTA','#ffd60a','#111');tg+=tag3(st.A,1.9,'KARŞI ARAÇ · %75 KUSURLU','#ff453a')",tagsK)
  rep("tg+=tag3(st.B,1.9,'KEMER?','#ffd60a','#111')",tagsS)
  if src!='Yargıtay': rep('Kaynak: Yargıtay kararı',f'Kaynak: {src} kararı')
  if stamp:
    k0=b.index(f"function verdict{N}");k1=b.index(f"function ders{N}");seg=b[k0:k1].replace("'YARGITAY<br>ONADI'",stamp);b=b[:k0]+seg+b[k1:]
  return s[:j]+"\n\n"+b+s[j:]
