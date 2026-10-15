#!/usr/bin/env python3
"""Railway yönetimi (GitHub Actions üzerinden). İşlem: durum | duzelt
duzelt: epias-ptf servislerine watch path + kuyruktaki dağıtımları iptal + son commit'i yeniden dağıt.
Silme yapmaz."""
import json, os, sys, urllib.request
TOK = os.environ.get("RAILWAY_TOKEN", "").strip()
ISLEM = (sys.argv[1] if len(sys.argv) > 1 else "durum")
if not TOK:
    print("::error::RAILWAY_TOKEN sırrı yok"); sys.exit(1)
def gql(q, v=None):
    r = urllib.request.Request("https://backboard.railway.com/graphql/v2", data=json.dumps({"query": q, "variables": v or {}}).encode(),
                               headers={"Authorization": "Bearer " + TOK, "Content-Type": "application/json", "User-Agent": "aesun"})
    with urllib.request.urlopen(r, timeout=60) as x:
        j = json.loads(x.read())
    if j.get("errors"):
        raise RuntimeError(json.dumps(j["errors"])[:300])
    return j["data"]
not_ = lambda m: print("::notice::" + m.replace("\n", " ")[:900])
d = gql("""{ projects { edges { node { id name environments { edges { node { id name } } }
  services { edges { node { id name serviceInstances { edges { node { environmentId source { repo } domains { serviceDomains { domain } }
  latestDeployment { id status createdAt } } } } } } } } } } }""")
WATCH = ["/ofis_panel.py", "/requirements.txt", "/Procfile", "/railway.json"]
for pe in d["projects"]["edges"]:
    p = pe["node"]
    for se in p["services"]["edges"]:
        s = se["node"]
        for ie in s["serviceInstances"]["edges"]:
            i = ie["node"]; env = i["environmentId"]
            dom = ",".join(x["domain"] for x in ((i.get("domains") or {}).get("serviceDomains") or []))
            ld = i.get("latestDeployment") or {}
            try:
                deps = gql("""query($p:String!,$s:String!,$e:String!){ deployments(first:30, input:{projectId:$p, serviceId:$s, environmentId:$e}) { edges { node { id status createdAt } } } }""",
                       {"p": p["id"], "s": s["id"], "e": env})["deployments"]["edges"]
            except Exception as e:
                not_(f"{p['name']}/{s['name']}: dağıtım listesi alınamadı: {e}"); deps = []
            sayim = {}
            for de in deps:
                sayim[de["node"]["status"]] = sayim.get(de["node"]["status"], 0) + 1
            not_(f"proje={p['name']} servis={s['name']} repo={(i.get('source') or {}).get('repo')} alan={dom or '-'} son={ld.get('status')} {str(ld.get('createdAt'))[:16]} dağıtımlar={sayim}")
            if ISLEM == "duzelt" and (i.get("source") or {}).get("repo"):
                iptal0, hata0 = 0, ""
                for de in deps:
                    if de["node"]["status"] in ("QUEUED", "WAITING", "INITIALIZING", "BUILDING"):
                        try:
                            gql("mutation($id:String!){ deploymentCancel(id:$id) }", {"id": de["node"]["id"]}); iptal0 += 1
                        except Exception as e:
                            hata0 = str(e)[:160]
                not_(f"{p['name']}/{s['name']}: kuyruktan {iptal0} dağıtım iptal edildi" + (f" (hata: {hata0})" if hata0 else ""))
            if ISLEM == "duzelt" and (i.get("source") or {}).get("repo", "").lower().endswith("epias-ptf"):
                try:
                    gql("""mutation($s:String!,$e:String!,$w:[String!]){ serviceInstanceUpdate(serviceId:$s, environmentId:$e, input:{watchPatterns:$w}) }""",
                        {"s": s["id"], "e": env, "w": WATCH})
                    not_(f"{p['name']}/{s['name']}: watch paths ayarlandı")
                except Exception as e:
                    not_(f"watch paths hatası: {e}")
                iptal = 0
                for de in deps:
                    if de["node"]["status"] in ("QUEUED", "WAITING", "INITIALIZING", "BUILDING"):
                        try:
                            gql("mutation($id:String!){ deploymentCancel(id:$id) }", {"id": de["node"]["id"]}); iptal += 1
                        except Exception as e:
                            pass
                if p["name"] != (os.environ.get("HEDEF_PROJE") or "striking-flexibility"):
                    continue
                try:
                    gql("""mutation($s:String!,$e:String!){ serviceInstanceDeploy(serviceId:$s, environmentId:$e, latestCommit:true) }""", {"s": s["id"], "e": env})
                    not_(f"{p['name']}/{s['name']}: {iptal} bekleyen iptal edildi, yeniden dağıtım başlatıldı")
                except Exception as e:
                    not_(f"yeniden dağıtım hatası: {e}")
