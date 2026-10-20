"""Şefin GitHub kolu (aesun-isler içinde çalışır; sırlar bellekte): son 24 saatte başarısız olan GitHub işlerini ele alır.

  - aynı iş akışı sonradan BAŞARILI çalıştıysa: hata geçmişte kalmış → "kapanan" (denetçi artık saymaz)
  - güvenli (tekrar çalıştırılması zararsız: yayın, özet, salt okuma tanı) ve sonradan başarılı çalışmamışsa: bir kez yeniden çalıştırır
  - diğerleri (sunucu işlemi, silme, mesaj gönderen, Railway vb.): kendiliğinden tekrar ÇALIŞTIRMAZ → "acik"
Çıktı stdout'a JSON.
"""
import json, sys, time, datetime as dt
import requests
import zamanlayici as z

DEPOLAR = ["ekinciomer-ai/aesun", "ekinciomer-ai/epias-ptf"]
GUVENLI = {"cpanel_yukle.yml", "izleme_ozet.yml", "cpanel_tani.yml", "sunucu_tani.yml", "twilio_tani.yml", "diagnose-dns.yml",
           "site_onizleme.yml", "durum_analizi.yml", "saha_saatlik.yml"}


def main():
    tok = z.sirlar().get("GH_TOKEN")
    tok = tok or ""
    H = {"Authorization": "Bearer " + tok, "Accept": "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28"}
    yazabilir = True
    if requests.get("https://api.github.com/rate_limit", headers=H, timeout=20).status_code == 401:
        # anahtar geçersiz: depolar açık olduğundan okuma anahtarsız sürer; yeniden çalıştırma yapılamaz
        H = {k: v for k, v in H.items() if k != "Authorization"}; yazabilir = False
    simdi = dt.datetime.now(dt.timezone.utc); out = {"kapanan": [], "yeniden": [], "acik": []}
    for depo in DEPOLAR:
        r = requests.get(f"https://api.github.com/repos/{depo}/actions/runs", headers=H, params={"status": "failure", "per_page": 50}, timeout=30)
        if r.status_code != 200:
            if not yazabilir:   # anahtarsız okumada gizli depo görünmez; o depoyu denetçi (n8n) kendi anahtarıyla süzer
                out.setdefault("atlanan", []).append(depo.split("/")[1]); continue
            out["acik"].append({"depo": depo, "ad": "GitHub API", "neden": f"okunamadı HTTP {r.status_code}"}); continue
        for x in r.json().get("workflow_runs", []):
            t = dt.datetime.fromisoformat(x["created_at"].replace("Z", "+00:00"))
            if (simdi - t).total_seconds() > 86400:
                continue
            dosya = (x.get("path") or "").split("/")[-1]
            kayit = {"depo": depo.split("/")[1], "id": x["id"], "ad": x["name"], "t": x["created_at"], "dosya": dosya}
            s = requests.get(f"https://api.github.com/repos/{depo}/actions/workflows/{x['workflow_id']}/runs", headers=H, params={"per_page": 20}, timeout=30)
            sonra = [y for y in (s.json().get("workflow_runs", []) if s.status_code == 200 else [])
                     if y["created_at"] > x["created_at"] and y.get("conclusion") == "success"]
            if sonra:
                out["kapanan"].append({**kayit, "neden": "sonraki çalışma başarılı (" + sonra[-1]["created_at"][11:16] + " UTC)"}); continue
            if dosya in GUVENLI and yazabilir and x.get("run_attempt", 1) == 1 and (simdi - t).total_seconds() > 600:
                k = requests.post(f"https://api.github.com/repos/{depo}/actions/runs/{x['id']}/rerun-failed-jobs", headers=H, timeout=30)
                out["yeniden"].append({**kayit, "ok": k.status_code in (201, 204), "kod": k.status_code}); continue
            out["acik"].append({**kayit, "neden": "güvenli tekrar listesinde değil" if dosya not in GUVENLI else ("yeniden çalıştırmak için GitHub anahtarı (PAT_TOKEN) geçersiz" if not yazabilir else "yeniden çalıştırıldı, yine başarısız")})
    out["anahtar"] = "geçerli" if yazabilir else "geçersiz (yalnız okuma)"
    # işler kapalıysa (ETKIN=0) ve bakım işareti yoksa: sır paketini etkin=1 ile yeniden üret (şef açar)
    if len(sys.argv) > 1 and sys.argv[1] == "ac" and yazabilir:
        k = requests.post("https://api.github.com/repos/ekinciomer-ai/epias-ptf/actions/workflows/sunucuya_sir.yml/dispatches",
                          headers=H, json={"ref": "main", "inputs": {"etkin": "1"}}, timeout=30)
        out["ac"] = {"ok": k.status_code == 204, "kod": k.status_code}
    print(json.dumps(out, ensure_ascii=False))


if __name__ == "__main__":
    main()
