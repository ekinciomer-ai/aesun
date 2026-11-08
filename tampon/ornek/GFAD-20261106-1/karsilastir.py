# Doğruluk ölçümü: OCR çıktısını gerçek metinle karşılaştırır (karakter benzerliği + kritik alanlar)
import sys, re, difflib, json, unicodedata
def norm(s): return re.sub(r"\s+"," ",unicodedata.normalize("NFC",re.sub(r"<[^>]+>|[|*#`_]"," ",s))).strip()
dogru=norm(open(sys.argv[1]).read()); sonuc={}
kritik=["AE-2026-1107","07.11.2026","774.900,00","818.800,00","398.712,00","600.000,00","163.200,00","215.000,00",
 "2.970.612,00","594.122,40","3.564.734,40","18.450","21.552","96.000","Kazık","Konstrüksiyon","Teklif","Karapınar","Güneş","hakediş","Ömer Ekinci"]
for p in sys.argv[2:]:
    t=norm(open(p,errors="replace").read())
    oran=difflib.SequenceMatcher(None,dogru,t,autojunk=False).ratio()
    bulunan=[k for k in kritik if k.lower() in t.lower()]
    sonuc[p.split("/")[-1]]={"karakter_benzerligi_%":round(oran*100,1),"kritik_alan":f"{len(bulunan)}/{len(kritik)}",
        "eksik_kritik":[k for k in kritik if k not in bulunan]}
print(json.dumps(sonuc,ensure_ascii=False,indent=1))
