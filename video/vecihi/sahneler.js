// Vecihi Hürkuş · sahne tarifleri. Koordinatlar tuvale oranla (0–1). f = öğenin sahne süresinin hangi oranında belirdiği.
// Öğe türleri: foto, etiket, el (kırmızı el yazısı), kutu, daire, damga, dev, sayac, cizgi, alinti, ucak. Ayrıntı: sahne.html.
const QUOTE="Vecihi, biz sana bu lisansı veremeyiz. Uçağına güveniyorsan atla, uç, bizi de kurtar.";
window.SAHNELER_169={
kanca:{yil:2026,bolum:'28 EYLÜL 2026',ogeler:[
 {k:'foto',img:'hurkus_ucak_1',x:.62,y:.38,w:.52,renk:1,r:2},
 {k:'kesit',img:'hurkus_ucak_1',f:.22,dx:.1,dy:-.1,s:1.2,dr:-4},
 {k:'etiket',metin:'28.09.2026 · TESLİM',x:.2,y:.11,f:.03},
 {k:'el',metin:'HÜRKUŞ-II',x:.22,y:.34,boy:.75,r:-5,f:.1},
 {k:'foto',img:'portre',x:.2,y:.6,w:.16,sepia:1,cer:1,bant:1,r:-4,f:.42},
 {k:'damga',metin:'İZİNSİZ UÇUŞ',x:.6,y:.68,f:.52,r:-9},
 {k:'etiket',metin:'VECİHİ HÜRKUŞ · 1896–1969',x:.62,y:.84,f:.8,koyu:1}]},
pilot:{yil:1896,arka:'gazete_1930c',bolum:'1896 · İSTANBUL',ogeler:[
 {k:'foto',img:'deniz_mektebi',x:.42,y:.42,w:.4,r:-2},
 {k:'el',metin:'1896',x:.8,y:.2,boy:1.1,f:.02},
 {k:'etiket',metin:'İSTANBUL',x:.8,y:.36,f:.1},
 {k:'foto',img:'portre_ww1',x:.14,y:.62,w:.11,cer:1,r:6,f:.28,sepia:1},
 {k:'etiket',metin:'YEŞİLKÖY TAYYARE MEKTEBİ · 1916',x:.42,y:.8,f:.6},
 {k:'el',metin:'ilk uçuş',x:.8,y:.62,boy:.6,f:.7,r:-6}]},
cephe:{yil:1917,arka:'kafkas_cephe_2',bolum:'1917 · KAFKAS CEPHESİ',ogeler:[
 {k:'foto',img:'kafkas_cephe_1',x:.36,y:.44,w:.52,r:1},
 {k:'kesit',img:'rus_ucak_2',f:.42,dx:-.3,dy:-.22,s:1.7,dr:-3},
 {k:'etiket',metin:'KAFKAS CEPHESİ · 1917',x:.27,y:.1,f:.04},
 {k:'foto',img:'rus_ucak_2',x:.76,y:.52,w:.3,cer:1,r:5,f:.25},
 {k:'daire',x:.76,y:.52,rx:.13,ry:.08,f:.45},
 {k:'el',metin:'1917',x:.8,y:.18,f:.08},
 {k:'el',metin:'cephede ilk!',x:.76,y:.78,boy:.5,f:.7,r:-3}]},
kacis:{yil:1917,bolum:'ESARET',ogeler:[
 {k:'foto',img:'rus_ucak_1',x:.46,y:.44,w:.6,h:.5,odak:[.5,.85]},
 {k:'el',metin:'uçağını yaktı',x:.27,y:.12,boy:.55,f:.3,r:-3},
 {k:'damga',metin:'ESİR',x:.74,y:.66,f:.62,boy:1.1}]},
nargin:{yil:1918,bolum:'HAZAR DENİZİ',ogeler:[
 {k:'foto',img:'hazar_harita_1',x:.2,y:.46,w:.2,r:-2,renk:1},
 {k:'daire',x:.18,y:.43,rx:.03,f:.15},
 {k:'foto',img:'nargin_2',x:.64,y:.4,w:.48,renk:1,r:2,f:.25},
 {k:'etiket',metin:'NARGİN ADASI',x:.64,y:.73,f:.4},
 {k:'cizgi',noktalar:[[.66,.36],[.6,.46],[.5,.5]],f:.6,sure:1.6},
 {k:'el',metin:'yüzerek kaçtı!',x:.62,y:.12,boy:.6,f:.62,r:-3}]},
kurtulus:{yil:1922,arka:'gazete_1931',bolum:'KURTULUŞ SAVAŞI',ogeler:[
 {k:'foto',img:'kurtulus',x:.28,y:.46,w:.2,sepia:1,cer:1,bant:1,r:-3},
 {k:'kesit',img:'istiklal_madalya_2',f:.55,dx:.02,dy:-.12,s:1.35,dr:8},
 {k:'etiket',metin:'KURTULUŞ SAVAŞI',x:.55,y:.1,f:.04},
 {k:'foto',img:'istiklal_madalya_2',x:.74,y:.44,w:.18,renk:1,r:4,f:.45},
 {k:'dev',metin:'3 TAKDİRNAME',x:.52,y:.8,boy:.55,f:.3}]},
cizim:{yil:1923,arka:'gazete_1930a',bolum:'1923 · İZMİR',ogeler:[
 {k:'foto',img:'izmir_1920_1',x:.3,y:.42,w:.4,r:-2},
 {k:'el',metin:'Neden biz yapmıyoruz?',x:.62,y:.14,boy:.5,f:.02,r:-3},
 {k:'foto',img:'k6_yapim',x:.76,y:.5,w:.16,cer:1,r:5,f:.5},
 {k:'etiket',metin:'14.06.1923 · ÇİZİMLER HAZIR',x:.36,y:.8,f:.38}]},
heyet:{yil:1924,arka:'gazete_1930c',bolum:'VECİHİ K-VI',ogeler:[
 {k:'foto',img:'k6',x:.44,y:.42,w:.58,sepia:1,r:-1},
 {k:'kesit',img:'k6',f:.3,dx:.05,dy:-.16,s:1.15,dr:-3},
 {k:'el',metin:'VECİHİ K-VI',x:.8,y:.14,boy:.6,f:.05},
 {k:'kutu',x:.2,y:.18,w:.48,h:.5,f:.22},
 {k:'damga',metin:'ONAY YOK',x:.8,y:.66,f:.62}]},
lisans:{yil:1925,bolum:'TEKNİK HEYET',ogeler:[
 {k:'foto',img:'k6',x:.5,y:.45,w:.75,r:0},
 {k:'alinti',metin:QUOTE,x:.5,y:.4,w:.62,f:.02}]},
ucus:{yil:1925,bolum:'28 OCAK 1925',ogeler:[
 {k:'foto',img:'k6',x:.5,y:.5,w:.5,h:.5,odak:[.35,.5],sepia:1,r:-1,zoom:.12},
 {k:'kesit',img:'k6',f:.08,dx:.42,dy:-.42,s:.7,dr:-14,sure:3.6,renk_t:0},
 {k:'el',metin:'28.01.1925 · 15.00',x:.3,y:.12,boy:.45,f:.02},
 {k:'sayac',bas:0,son:15,son_ek:' DAKİKA',x:.75,y:.8,boy:.55,f:.42}]},
ceza:{yil:1925,bolum:'İZİNSİZ UÇUŞ',ogeler:[
 {k:'foto',img:'k6',x:.45,y:.45,w:.5},
 {k:'damga',metin:'CEZA',x:.55,y:.46,boy:1.4,f:.2},
 {k:'el',metin:'uçağı da geri verilmedi',x:.7,y:.84,boy:.42,f:.6,r:-2}]},
kereste:{yil:1930,arka:'gazete_1931',bolum:'1930 · KADIKÖY',ogeler:[
 {k:'foto',img:'gazete_1930a',x:.17,y:.46,w:.19,r:-4},
 {k:'foto',img:'xiv_foto',x:.55,y:.42,w:.4,sepia:1,cer:1,r:2,f:.18},
 {k:'etiket',metin:'KADIKÖY · KERESTECİ DÜKKÂNI',x:.55,y:.1,f:.04},
 {k:'el',metin:'3 ayda!',x:.87,y:.66,boy:.6,f:.48,r:-6},
 {k:'etiket',metin:'VECİHİ XIV · İLK SİVİL UÇAK',x:.56,y:.8,f:.7,koyu:1}]},
prag:{yil:1931,arka:'gazete_1930a',bolum:'1931 · PRAG',ogeler:[
 {k:'foto',img:'dergi_1930',x:.32,y:.32,w:.44,r:-2},
 {k:'foto',img:'gazete_1931',x:.72,y:.46,w:.34,r:3,f:.3},
 {k:'etiket',metin:'SÖKÜLDÜ → ÇEKOSLOVAKYA',x:.3,y:.6,f:.12},
 {k:'ucak',x0:.08,y0:.8,x1:.92,y1:.72,yay:.05,f:.6,sure:3.2,boy:.55},
 {k:'el',metin:'onay orada!',x:.32,y:.72,boy:.45,f:.42,r:-4}]},
okul:{yil:1932,arka:'bedriye',bolum:'1932',ogeler:[
 {k:'foto',img:'kadikoy_istasyon',x:.3,y:.36,w:.42,r:-2},
 {k:'etiket',metin:'İLK SİVİL UÇUŞ OKULU · 1932',x:.32,y:.68,f:.1},
 {k:'foto',img:'bedriye',x:.74,y:.44,w:.2,cer:1,r:4,f:.45,sepia:1},
 {k:'el',metin:'Bedriye Gökmen',x:.74,y:.84,boy:.42,f:.62,r:-3}]},
havayolu:{yil:1954,bolum:'1954',ogeler:[
 {k:'foto',img:'dc3_1950_2',x:.48,y:.42,w:.56},
 {k:'kesit',img:'dc3_1950_2',f:.15,dx:.18,dy:-.3,s:1.8,dr:-6},
 {k:'etiket',metin:'HÜRKUŞ HAVA YOLLARI · 1954',x:.48,y:.8,f:.15,koyu:1}]},
son:{yil:1960,arka:'gazete_1930a',bolum:'ENGELLER',ogeler:[
 {k:'foto',img:'portre',x:.5,y:.44,w:.2,sepia:1,cer:1,r:-2},
 {k:'damga',metin:'İZİN YOK',x:.78,y:.28,f:.06,r:12,boy:.8},
 {k:'damga',metin:'ENGEL',x:.22,y:.6,f:.25,r:-8,boy:.8},
 {k:'el',metin:'anılarını yazdı',x:.78,y:.7,boy:.5,f:.6,r:-4}]},
olum:{yil:1969,arka:'gazete_1931',bolum:'16 TEMMUZ 1969',ogeler:[
 {k:'foto',img:'portre',x:.27,y:.48,w:.19,cer:1,r:-3},
 {k:'el',metin:'16.07.1969',x:.27,y:.12,boy:.55,f:.04},
 {k:'foto',img:'apollo11',x:.68,y:.42,w:.24,renk:1,r:3,f:.35},
 {k:'etiket',metin:'AYNI GÜN: APOLLO 11',x:.68,y:.84,f:.55}]},
bugun:{yil:2026,bolum:'BUGÜN',ogeler:[
 {k:'foto',img:'hurkus_ucak_2',x:.4,y:.4,w:.56,renk:1},
 {k:'kesit',img:'hurkus_ucak_2',f:.25,dx:-.04,dy:-.18,s:1.2,dr:-3},
 {k:'foto',img:'portre',x:.83,y:.3,w:.13,sepia:1,cer:1,bant:1,r:6,f:.2},
 {k:'sayac',bas:0,son:55,son_ek:' UÇAK',alt:"2028'E KADAR",x:.76,y:.72,boy:.6,f:.32},
 {k:'el',metin:'izinsiz uçan adam',x:.3,y:.8,boy:.48,f:.68,r:-3}]},
cta:{yil:2026,arka:'gazete_1930c',bolum:'ANTİK STÜDYO',ogeler:[
 {k:'foto',img:'portre',x:.5,y:.44,w:.2,sepia:1,cer:1,r:-2},
 {k:'el',metin:'Sence neden?',x:.5,y:.12,boy:.6,f:.08},
 {k:'etiket',metin:'YORUMLARA YAZ',x:.5,y:.82,f:.35,koyu:1}]}
,
sh1_1:{yil:1925,bolum:'İLK TÜRK UÇAĞI',ogeler:[
 {k:'foto',img:'portre',x:.3,y:.45,w:.24,sepia:1,cer:1,r:-3,bant:1},
 {k:'foto',img:'k6',x:.7,y:.4,w:.42,sepia:1,r:2,f:.15},
 {k:'kesit',img:'k6',f:.4,dx:-.02,dy:-.2,s:1.2,dr:-4},
 {k:'damga',metin:'CEZA',x:.66,y:.74,boy:1,f:.62}]},
sh1_2:{yil:1925,bolum:'İZMİR · 1925',ogeler:[
 {k:'foto',img:'izmir_1920_1',x:.3,y:.4,w:.42,r:-2},
 {k:'foto',img:'k6',x:.66,y:.52,w:.5,sepia:1,r:1,f:.12},
 {k:'kesit',img:'k6',f:.35,dx:-.05,dy:-.1,s:1.15,dr:-3},
 {k:'el',metin:'1925',x:.82,y:.14,boy:1,f:.05},
 {k:'etiket',metin:'VECİHİ K-VI',x:.22,y:.78,f:.5}]},
sh1_3:{yil:1925,bolum:'TEKNİK HEYET',ogeler:[
 {k:'foto',img:'k6',x:.5,y:.45,w:.75},
 {k:'alinti',metin:QUOTE,x:.5,y:.4,w:.66,f:.03}]},
sh1_4:{yil:1925,bolum:'28 OCAK 1925',ogeler:[
 {k:'foto',img:'k6',x:.5,y:.52,w:.52,h:.5,odak:[.35,.5],sepia:1,r:-1,zoom:.12},
 {k:'kesit',img:'k6',f:.05,dx:.42,dy:-.42,s:.7,dr:-14,sure:3.4,renk_t:0},
 {k:'sayac',bas:0,son:15,son_ek:' DAKİKA',x:.5,y:.88,boy:.6,f:.25},
 {k:'damga',metin:'İZİNSİZ',x:.8,y:.3,f:.62,boy:.9}]},
sh1_5:{yil:2026,bolum:'BUGÜN',ogeler:[
 {k:'foto',img:'hurkus_ucak_1',x:.55,y:.45,w:.6,renk:1},
 {k:'kesit',img:'hurkus_ucak_1',f:.2,dx:-.08,dy:-.18,s:1.25,dr:-4},
 {k:'el',metin:'HÜRKUŞ',x:.2,y:.2,boy:.9,f:.4},
 {k:'etiket',metin:'TAM HİKÂYE KANALDA',x:.5,y:.88,f:.72,koyu:1}]},
sh2_1:{yil:1917,bolum:'KAFKAS CEPHESİ',ogeler:[
 {k:'foto',img:'kafkas_cephe_2',x:.36,y:.46,w:.56},
 {k:'foto',img:'rus_ucak_2',x:.76,y:.56,w:.34,cer:1,r:4,f:.2},
 {k:'kesit',img:'rus_ucak_2',f:.4,dx:-.3,dy:-.22,s:1.7,dr:-3},
 {k:'el',metin:'1917',x:.82,y:.15,boy:1,f:.05}]},
sh2_2:{yil:1917,bolum:'ESARET',ogeler:[
 {k:'foto',img:'rus_ucak_1',x:.46,y:.44,w:.6,h:.5,odak:[.5,.85]},
 {k:'el',metin:'uçağını yaktı',x:.27,y:.12,boy:.55,f:.3,r:-3},
 {k:'damga',metin:'ESİR',x:.76,y:.68,f:.6,boy:1.1}]},
sh2_3:{yil:1918,bolum:'NARGİN ADASI',ogeler:[
 {k:'foto',img:'hazar_harita_1',x:.2,y:.46,w:.2,r:-2,renk:1},
 {k:'daire',x:.18,y:.43,rx:.03,f:.15},
 {k:'foto',img:'nargin_2',x:.64,y:.4,w:.48,renk:1,r:2,f:.2},
 {k:'cizgi',noktalar:[[.66,.36],[.6,.46],[.5,.5]],f:.55,sure:1.6},
 {k:'el',metin:'yüzerek kaçtı!',x:.62,y:.12,boy:.6,f:.6,r:-3}]},
sh2_4:{yil:1925,bolum:'VECİHİ HÜRKUŞ',ogeler:[
 {k:'foto',img:'k6',x:.6,y:.42,w:.5,sepia:1,r:1},
 {k:'kesit',img:'k6',f:.3,dx:.02,dy:-.18,s:1.15,dr:-3},
 {k:'foto',img:'portre',x:.18,y:.5,w:.22,sepia:1,cer:1,r:-3,f:.15,bant:1},
 {k:'etiket',metin:'TAM HİKÂYE KANALDA',x:.6,y:.88,f:.72,koyu:1}]}
};
window.KESITLER=['k6','rus_ucak_2','hurkus_ucak_1','hurkus_ucak_2','dc3_1950_2','istiklal_madalya_2'];
