import sys
from PIL import Image, ImageDraw, ImageFont
tutamac=sys.argv[1] if len(sys.argv)>1 else '@estudioantiguo'
im=Image.open('yt_KAPAK_UCFLJUlhUSgjcLbp9ad_t9PQ.jpg').convert('RGB'); d=ImageDraw.Draw(im)
d.rectangle([925,522,1995,906],fill=(12,18,28))
C='font_in/package/files/cinzel-latin-900-normal.woff'; M='font_in2/package/files/montserrat-latin-800-normal.woff'
ALTIN=(246,206,120); KREM=(255,248,232); KIRMIZI=(178,30,30)
cx=1440
def sig(t,f,maks):
    s=f.size
    while d.textlength(t,font=f)>maks and s>10: s-=2; f=ImageFont.truetype(f.path,s)
    return f
f=sig('ACTUALIDAD  •  GEOPOLÍTICA  •  HISTORIA REAL',ImageFont.truetype(M,32),880)
d.text((cx,560),'ACTUALIDAD  •  GEOPOLÍTICA  •  HISTORIA REAL',font=f,fill=ALTIN,anchor='mm')
f=sig('ESTUDIO ANTIGUO',ImageFont.truetype(C,118),900)
d.text((cx+5,662),'ESTUDIO ANTIGUO',font=f,fill=(0,0,0),anchor='mm')
d.text((cx,656),'ESTUDIO ANTIGUO',font=f,fill=KREM,anchor='mm',stroke_width=3,stroke_fill=(10,10,10))
t='CAMBIAN LAS HERRAMIENTAS, LA PUERTA ES LA MISMA'
f=sig(t,ImageFont.truetype(M,36),820)
w=d.textlength(t,font=f)+80
d.rounded_rectangle([cx-w/2,742,cx+w/2,808],radius=12,fill=KIRMIZI,outline=ALTIN,width=3)
d.text((cx,776),t,font=f,fill=(255,255,255),anchor='mm')
t=f'{tutamac}   •   EPISODIOS SEMANALES   •   SHORTS DIARIOS A LAS 19:00'
f=sig(t,ImageFont.truetype(M,30),900)
d.text((cx,872),t,font=f,fill=ALTIN,anchor='mm')
im.save('es_kapak.jpg',quality=92); im.crop((560,500,1960,940)).resize((1050,330)).save('es_kapak_bant.png')
