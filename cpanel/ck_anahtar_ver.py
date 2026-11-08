"""CutkodA veri servisi için n8n yazma anahtarı üretir.
Anahtar hiçbir yere yazdırılmaz: düz hali yalnız n8n kimlik bilgisine (Header Auth) gider,
sunucuya yalnız SHA-256 özeti gider (bu betiğin çıktısındaki ozet.txt, SSH ile taşınır)."""
import hashlib, json, os, secrets, sys, urllib.request

KOK = os.environ.get("N8N_URL", "https://xbay.app.n8n.cloud").rstrip("/") + "/api/v1"
ANAHTAR = os.environ["N8N_ANAHTAR"]
AD = "CutkodA API (X-AE-Anahtar)"

def istek(metot, yol, veri=None):
    r = urllib.request.Request(KOK + yol, method=metot, data=None if veri is None else json.dumps(veri).encode(),
                               headers={"X-N8N-API-KEY": ANAHTAR, "Accept": "application/json",
                                        "Content-Type": "application/json", "User-Agent": "aesun-n8n"})
    with urllib.request.urlopen(r, timeout=30) as y:
        b = y.read()
        return json.loads(b) if b else {}

t = secrets.token_hex(32)
oz = hashlib.sha256(t.encode()).hexdigest()
c = istek("POST", "/credentials", {"name": AD, "type": "httpHeaderAuth", "data": {"name": "X-AE-Anahtar", "value": t}})
del t
open("ozet.txt", "w").write(json.dumps({"n8n": oz}))
print(f"::notice::n8n kimlik bilgisi oluşturuldu: {AD} (id {c.get('id')})")
