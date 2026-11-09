import re
B=["","bir","iki","üç","dört","beş","altı","yedi","sekiz","dokuz"];O=["","on","yirmi","otuz","kırk","elli","altmış","yetmiş","seksen","doksan"]
def yaz(n):
    if n==0: return "sıfır"
    s=[]
    if n>=1000: s.append(("" if n//1000==1 else yaz(n//1000)+" ")+"bin"); n%=1000
    if n>=100: s.append(("" if n//100==1 else B[n//100]+" ")+"yüz"); n%=100
    if n>=10: s.append(O[n//10]); n%=10
    if n: s.append(B[n])
    return " ".join(x for x in s if x)
def seslendir(t):
    return re.sub(r"\b(\d{1,4})\b", lambda m: yaz(int(m.group(1))), t)
