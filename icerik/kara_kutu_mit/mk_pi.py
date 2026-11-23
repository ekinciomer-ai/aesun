# Kara Kutu · "Patron mu Haklı, İşçi mi?" bölüm üretici: mk_ep2 şablonunu kullanır, seri etiketlerini değiştirir.
# Kullanım: python3 mk_is.py bolumler_isNN.json [--tl]
import json, sys
import mk_ep2, mk_tl
mk_tl.DISP = {'yüzde yirmi dokuz': '%29', 'yüzde seksen': '%80', 'yüzde yirmi': '%20',
  'sekiz yüz kırk bin lirayı aşan': '840.314 TL', 'yüz bin lira': '100.000 TL', 'yaklaşık üç metreden': '~3 metreden', **mk_tl.DISP}
E = json.load(open(sys.argv[1])); s = open('scene.html').read()
for e in E:
  import os
  if '--tl' in sys.argv or not os.path.exists(f"tl/mit{e['N']}_tl.json"): mk_ep2.timeline(e)
  s = mk_ep2.render_fn(s, e); N = e['N']
  a = s.index(f"const T{N}=await"); z = s.index("tags.innerHTML=tg;return true};", a) + len("tags.innerHTML=tg;return true};")
  b = s[a:z]
  for o, n in [('MİT Mİ GERÇEK Mİ?', 'PATRON MU HAKLI? · İŞ HUKUKU'), ("['MİT',0]", "['İDDİA',0]"), ('MİT ÇÖKTÜ', 'İDDİA ÇÖKTÜ'),
               ('Kişi, plaka ve yer bilgisi', 'Kişi, şirket ve yer bilgisi')]:
    b = b.replace(o, n)
  s = s[:a] + b + s[z:]
open('scene.html', 'w').write(s); print('tamam', [e['N'] for e in E])
