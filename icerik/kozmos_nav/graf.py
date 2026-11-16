import json,math,heapq,os
d=json.load(open('osm.json'))
S,Wb,N,E=39.9135,32.8300,39.9325,32.8600
mx=lambda lon:60+(lon-Wb)/(E-Wb)*960
kx=960/((E-Wb)*111320*math.cos(math.radians(39.92)))
my=lambda lat:530+(N-lat)*111320*kx
roads=[x for x in d if x[0] not in('park','tomb','monument','memorial','attraction')]
parks=[x for x in d if x[0] in('park','tomb','monument','memorial')]
idx={};pts=[];adj={};edges={}
def nid(p):
    k=(p[0],p[1])
    if k not in idx: idx[k]=len(pts);pts.append(k)
    return idx[k]
for t,nm,g in roads:
    for a,b in zip(g,g[1:]):
        u,v=nid(a),nid(b)
        if u==v: continue
        L=math.hypot((a[0]-b[0])*111320,(a[1]-b[1])*111320*0.766);w=L/(5000/60)
        adj.setdefault(u,[]).append((v,w));adj.setdefault(v,[]).append((u,w));edges[(min(u,v),max(u,v))]=(w,t)
P=[(round(mx(lo),1),round(my(la),1)) for la,lo in pts]
def near(lat,lon,pool):return min(pool,key=lambda i:(pts[i][0]-lat)**2+((pts[i][1]-lon)*0.766)**2)
s0=near(39.9206,32.8538,adj)
comp={s0};st=[s0]
while st:
    u=st.pop()
    for v,_ in adj[u]:
        if v not in comp: comp.add(v);st.append(v)
tomb=[x for x in d if x[0]=='tomb'][0];tc=(sum(p[0] for p in tomb[2])/len(tomb[2]),sum(p[1] for p in tomb[2])/len(tomb[2]))
g0=near(*tc,comp);print('goal',pts[g0],'tomb',tc,'uzaklık m',round(math.hypot((pts[g0][0]-tc[0])*111320,(pts[g0][1]-tc[1])*85300)))
def run(h=lambda v:0,ban=None):
    dist={s0:0};prev={};done=set();order=[];pq=[(h(s0),0,s0)]
    while pq:
        f,dd,u=heapq.heappop(pq)
        if u in done: continue
        done.add(u);order.append(u)
        if u==g0:break
        for v,w in adj[u]:
            if ban and (min(u,v),max(u,v)) in ban: w*=12
            nd=dd+w
            if nd<dist.get(v,1e18): dist[v]=nd;prev[v]=u;heapq.heappush(pq,(nd+h(v),nd,v))
    path=[g0]
    while path[-1]!=s0: path.append(prev[path[-1]])
    return order,dist,path[::-1]
gl=pts[g0];hh=lambda v:math.hypot((pts[v][0]-gl[0])*111320,(pts[v][1]-gl[1])*85300)/(5000/60)
o1,d1,p1=run();o2,d2,p2=run(hh)
print('dijkstra',len(o1),'A*',len(o2),'dk',round(d1[g0],1),'path',len(p1),'toplam düğüm',len(comp))
cand=[(min(a,b),max(a,b)) for a,b in zip(p1,p1[1:])]
c2=[e for e in cand if edges[e][1] in('primary','secondary','trunk','tertiary')] or cand
n=len(cand);ban=set(cand[n//3:n//3+max(4,n//5)]);o3,d3,p3=run(ban=ban);print('trafik',round(d3[g0],1),len(p3),len(set(p3)&set(p1)))
names=[];seen=set()
for t,nm,g in roads:
    if nm in('Atatürk Bulvarı','Gazi Mustafa Kemal Bulvarı','Anıt Caddesi','Ziya Gökalp Caddesi','Akdeniz Caddesi','Necatibey Caddesi') and len(g)>4 and nm not in seen:
        seen.add(nm);m=g[len(g)//2];names.append([nm,round(mx(m[1]),1),round(my(m[0]),1)])
PK=[[t,[[round(mx(p[1]),1),round(my(p[0]),1)] for p in g]] for t,nm,g in parks]
RD=[[t,[[round(mx(p[1]),1),round(my(p[0]),1)] for p in g]] for t,nm,g in roads]
T=[round(mx(tc[1]),1),round(my(tc[0]),1)]
out=dict(P=P,RD=RD,PK=PK,s0=s0,g0=g0,o1=o1,o2=o2,p1=p1,p2=p2,p3=p3,dk1=round(d1[g0]),dk3=round(d3[g0]),ban=[list(e) for e in ban],names=names,TB=T)
json.dump(out,open('graf.json','w'),separators=(',',':'));print(os.path.getsize('graf.json'),names)
