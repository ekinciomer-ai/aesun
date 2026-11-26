# Kara Kutu · Mit — bölüm üretici (sürüm 2). renderMit10 bloğunu şablon alır.
# Kullanım: python3 mk_ep2.py <bolumler.json>   (her bölüm için: tl/mit<N>_tl.json + window.renderMit<N>)
# bolumler.json: [{N, kod (TTS), sc, upd, tiL, hookNo, hookMain, pollQ, opts, sonuc, dogru, ders1, ders2,
#                  camKaza, camRest, camKarar, exp, black, tagsK, tagsS, clues:[[anahtar,metin]], reasons:[[anahtar,metin]],
#                  hukumKey, src}]
import json, os, re, subprocess, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import mk_tl
AESUN = os.environ.get('AESUN', '/home/claude/aesun')
mk_tl.DISP.update({'yüzde yüzü': "%100'ü", 'yüzde yüz': '%100', 'Dört bin üç yüz seksen sekiz lira': '4.388 TL',
  'dört bin lira': '4.000 TL', 'iki yıl': '2 yıl', 'iki ay': '2 ay', 'yirmi gün': '20 gün', 'bir yıl': '1 yıl',
  'On beş bin üç yüz seksen lirayı': "15.380 TL'yi", 'İki yolcu': '2 yolcu', 'İki araç': '2 araç',
  'altmış sekiz bin yedi yüz yetmiş bir lira': '68.771 TL', 'elli beş bin on yedi lira': '55.017 TL', 'yüzde yirmi': '%20',
  'Altı bin beş yüz lira': '6.500 TL', 'altı yıldan': '6 yıldan', 'sekiz yıla': '8 yıla', 'sekiz yıl': '8 yıl', 'Yirmi bin yirmi liralık': "20.020 TL'lik"})
mk_tl.DISP.update({'otuz bir bin altı yüz yirmi iki lira': '31.622 TL', 'yirmi bin lira': '20.000 TL', 'Yüzde yirmi': '%20',
  'yüzde yetmiş beş': '%75', 'yüzde yirmi beş': '%25', 'altı bin altı yüz yetmiş beş lira': '6.675 TL',
  'seksen iki bin sekiz yüz on sekiz lira': '82.818 TL', 'yüzde on beş': '%15'})
mk_tl.DISP.update({'yüzde sekiz': '%8', 'iki virgül bir promil': '2,1 promil', 'kırk dört bin üç yüz yirmi altı lira': '44.326 TL'})
# uzun ifadeler önce değişsin ('yüzde yirmi beş' → '%20 beş' olmasın)
_d = dict(sorted(mk_tl.DISP.items(), key=lambda kv: -len(kv[0]))); mk_tl.DISP.clear(); mk_tl.DISP.update(_d)

def trim(N, kod):
  os.makedirs(f'vm{N}', exist_ok=True)
  for i in range(1, 8):
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', f'{AESUN}/sunucu/tts_kuyruk/cikti/{kod}__V{i}.mp3', '-af',
      'silenceremove=start_periods=1:start_threshold=-45dB,areverse,silenceremove=start_periods=1:start_threshold=-45dB,areverse',
      '-ar', '44100', '-ac', '1', f'vm{N}/V{i}.wav'], check=True)

def frac(txt, key):
  i = txt.find(key); assert i >= 0, (key, txt); return i / len(txt)

def timeline(e):
  N, kod = e['N'], e['kod']; trim(N, kod)
  P = json.load(open(f'{AESUN}/sunucu/tts_kuyruk/tamam/{kod}.json'))['parcalar'] if os.path.exists(f'{AESUN}/sunucu/tts_kuyruk/tamam/{kod}.json') else json.load(open(f'{AESUN}/sunucu/tts_kuyruk/{kod}.json'))['parcalar']
  M = [p['metin'] for p in P]; D = [mk_tl.dur(f'vm{N}/V{i}.wav') for i in range(1, 8)]
  tiL = e['tiL']
  def mapf(S, D, T):
    imp = S[2] + D[2] * frac(M[2], e['impKey'])
    T['_imp'] = imp
    rwTo = tiL - 2.6
    return {'map': [[T['kaza'], tiL - 4.2], [S[2], tiL - 2.0], [imp, tiL], [T['poll'], tiL + 1.4]], 'rwTo': rwTo,
            'slowRate': (tiL - .2 - rwTo) / (T['karar'] - T['slow'])}
  clues = [[D[4] * frac(M[4], k), x] for k, x in e['clues']]
  reasons = [[D[5] * frac(M[5], k), x] for k, x in e['reasons']] + [D[5] * frac(M[5], e['hukumKey']), 1.7]
  T0 = {}
  # build() doğrudan tamam/ klasöründen okur
  return mk_tl.build(kod, f'vm{N}', f'tl/mit{N}_tl.json', mapf, clues, reasons, nextfrac=.45)

def render_fn(s, e):
  N = e['N']; i = s.index("const T10=await"); j = s.index("tags.innerHTML=tg;return true};", i) + len("tags.innerHTML=tg;return true};")
  b = s[i:j]
  for a in ['renderMit10', 'mit10_tl.json', 'LAMPS10', 'ARR10', 'pbar10', 'hook10', 'poll10', 'rew10', 'verdict10', 'ders10', 'cap10', 'lt10', 'T10']:
    b = b.replace(a, a.replace('10', str(N)))
  def rep(o, n):
    nonlocal b
    assert o in b, (N, o[:80]); b = b.replace(o, n)
  rep('MİT #9', e['hookNo'])
  rep('“YOLA İNEK<br>ÇIKTI, KAZA<br><span style="color:#ffb15c;font-size:1.25em">KADER</span><br>KİMSE ÖDEMEZ”', e['hookMain'])
  rep("[['A','Kimse, kaza kader'],['B','Sürücü kendi ödedi'],['C','Hayvanın sahibi']]", json.dumps(e['opts'], ensure_ascii=False).replace('"', "'"))
  rep('HASARI KİM ÖDEDİ?', e['pollQ'])
  rep('SONUÇ: HAYVAN SAHİBİ ÖDEYECEK', e['sonuc']); rep('Doğru şık: C', e['dogru'])
  rep('Sahibi olan hayvanın yola çıkması <b style="color:#ffb15c">kader değil.</b>', e['ders1'])
  rep('🐄 Hayvanını gözetmeyen,<br><b style="color:#34c759">zararı öder.</b>', e['ders2'])
  rep(f"const sc=S[8];const lt=lt{N}(t);const st=sc.upd(lt);", f"const sc=S[{e['sc']}];const lt=lt{N}(t);const st=sc.{e['upd']}(lt);")
  k0 = b.index(' let P,L,f=46;'); k1 = b.index(' camera.position.copy(P);', k0)
  b = b[:k0] + f" let P,L,f=46;\n if(t<T{N}.kaza){{{e['camKaza']}}}\n else{{{e['camRest']}if(t>=T{N}.karar){{{e['camKarar']}}}}}\n" + b[k1:]
  rep('renderer.toneMappingExposure=1.0;', f"renderer.toneMappingExposure={e.get('exp', 1.0)};")
  rep('ARAÇTA<br><span style="color:#ff453a">13.000 TL HASAR</span>', e['black'])
  rep(f"tg+=tag3(st.car,1.9,'SÜRÜCÜ','#ffd60a','#111');if(st.cow.visible)tg+=tag3(st.cow,2.2,'SAHİPLİ HAYVAN','#ff453a')", e['tagsK'])
  rep(f"if(st.cow.visible)tg+=tag3(st.cow,2.2,'SAHİBİ KİM?','#ffd60a','#111')", e['tagsS'])
  if e.get('src', 'Yargıtay') != 'Yargıtay':
    rep('Kaynak: Yargıtay kararı', f"Kaynak: {e['src']} kararı")
    rep("'YARGITAY<br>ONADI'", f"'{e['src'].upper().replace('I', 'I')}<br>ONADI'")
  # aynı numaralı eski blok varsa değiştir, yoksa renderMit10'un önüne ekle
  if f"const T{N}=await" in s:
    a = s.index(f"const T{N}=await"); z = s.index("tags.innerHTML=tg;return true};", a) + len("tags.innerHTML=tg;return true};")
    return s[:a] + b + s[z:]
  return s[:i] + b + "\n\n" + s[i:]

if __name__ == '__main__':
  E = json.load(open(sys.argv[1])); s = open('scene.html').read()
  for e in E:
    if '--tl' in sys.argv or not os.path.exists(f"tl/mit{e['N']}_tl.json"): timeline(e)
    s = render_fn(s, e)
  open('scene.html', 'w').write(s); print('tamam', [e['N'] for e in E])
