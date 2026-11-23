"""Kara Kutu: yeni konu için rastgele format seçer (önceki konunun formatı hariç).
python3 format_sec.py  ->  F13 | F5 | KK2D | F9"""
import random,os
D=os.path.dirname(os.path.abspath(__file__));S=f"{D}/format_son.txt"
FORMATLAR={"F13":"sinema.html","F5":"diorama.html","KK2D":"kk3d.html","F9":"eskiz.html"}
son=open(S).read().strip() if os.path.exists(S) else ""
sec=random.SystemRandom().choice([f for f in FORMATLAR if f!=son])
open(S,"w").write(sec);print(sec,FORMATLAR[sec])
