import json, sys
d = json.load(open(sys.argv[1]))
sat = []
for f in d["faturalar"]:
    k = "; ".join(f"{(x['a'] or '')[:28]}={x['m']}{(x['b'] or '')[:3]}/{x['t']}" for x in (f.get("kalemler") or []))
    sat.append(f"#{f['id']} {f['tesisat']} {f['tarih']} {f['tur']} {(f['tedarikci'] or '')[:14]} top={f['toplam']} öd={f['odenecek']} [{k}]")
blok, cur = [], ""
for s in sat:
    if len(cur) + len(s) > 3800:
        blok.append(cur); cur = ""
    cur += s + " || "
blok.append(cur)
for b in blok[:10]:
    print("::notice::" + b)
print("::notice::diger örnek: " + json.dumps([f.get("diger") for f in d["faturalar"] if f.get("diger")][:3], ensure_ascii=False)[:1500])
