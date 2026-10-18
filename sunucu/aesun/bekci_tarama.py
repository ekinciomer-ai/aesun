#!/usr/bin/env python3
"""AEMonitoring · öğrenen tarama (ns1 bekçisi çağırır, 15 dk'da bir).

Sabit liste YOK: epias-ptf deposundaki HER dosyanın son 8 gündeki güncellenme düzenini geçmişten kendisi öğrenir
ve olağan düzenine göre geciken dosyayı bildirir. Yeni bir toplayıcı/iş eklendiğinde ayrıca tanıtmak gerekmez;
birkaç gün içinde düzeni öğrenilir. Gece durmak gibi olağan sessizlikler saat-dilimi profiliyle ayırt edilir.

Kural (dosya başına):
  - son 8 günde en az 12 güncelleme olan ve düzenli yazılan dosyalar izlenir (olay güdümlü, patlamalı yazılanlar hariç)
  - olağan aralık = güncellemeler arası sürelerin medyanı; sınır = max(3 × medyan, 1,5 × %95'lik, 30 dk)
  - son güncellemeden bu yana geçen süre sınırı aşmışsa VE aradaki saatlerden en az birinde dosya son 7 günün
    en az 4'ünde güncellenmişse (yani o saatlerde normalde yazılıyorsa) → "gecikti"
Çıktı: /opt/aesun/tarama_durum.json (bekçi /v1/bekci'ye ekler). Yalnız okur; hiçbir dosyayı değiştirmez.
"""
import json, os, statistics, subprocess, time
from collections import defaultdict
from datetime import datetime, timedelta, timezone

D = "/opt/aesun/tarama"
REPO = "git@github.com:ekinciomer-ai/epias-ptf.git"
KLON = D + "/epias-ptf"
CIKTI = "/opt/aesun/tarama_durum.json"
TR = timezone(timedelta(hours=3))
GIT_ENV = {**os.environ, "GIT_SSH_COMMAND": "ssh -i /opt/aesun/ssh/id_ed25519 -o UserKnownHostsFile=/opt/aesun/ssh/known_hosts -o StrictHostKeyChecking=accept-new -o BatchMode=yes"}
HARIC = (".github/", "__pycache__/")


def git(*a, cwd=None, t=300):
    return subprocess.run(["git", *a], cwd=cwd or KLON, env=GIT_ENV, capture_output=True, text=True, timeout=t)


def esitle():
    os.makedirs(D, exist_ok=True)
    if not os.path.isdir(KLON + "/.git"):
        r = git("clone", "-q", "--filter=blob:none", "--no-checkout", "--shallow-since=9 days ago", "--single-branch", REPO, KLON, cwd=D, t=600)
        if r.returncode:
            raise RuntimeError("klon: " + r.stderr[-200:])
    r = git("fetch", "-q", "--filter=blob:none", "--shallow-since=9 days ago", "origin", "main")
    if r.returncode:
        raise RuntimeError("fetch: " + r.stderr[-200:])


def gecmis():
    r = git("log", "FETCH_HEAD", "--since=8 days ago", "--format=%x01%ct", "--name-only", t=300)
    zaman = defaultdict(list); t = None
    for s in r.stdout.splitlines():
        if s.startswith("\x01"):
            t = int(s[1:])
        elif s.strip() and t and not s.startswith(HARIC):
            zaman[s.strip()].append(t)
    return zaman


def main():
    simdi = time.time()
    esitle()
    Z = gecmis()
    izlenen, geciken, ogrenilen = 0, [], {}
    for f, ts in Z.items():
        ts = sorted(set(ts))
        if len(ts) < 12:
            continue
        izlenen += 1
        ara = [b - a for a, b in zip(ts, ts[1:]) if b > a]
        if not ara:
            continue
        med = statistics.median(ara)
        p95 = sorted(ara)[int(len(ara) * 0.95) - 1] if len(ara) >= 20 else max(ara)
        p90 = sorted(ara)[int(len(ara) * 0.9) - 1] if len(ara) >= 10 else max(ara)
        if p90 > 6 * med and p90 > 3 * 3600:
            continue                                   # olay güdümlü (komut dosyaları gibi): düzenli değil, izlenmez
        sinir = max(3 * med, 1.5 * p95, 1800)
        # saat dilimi profili: son 7 günde hangi saatlerde (TR) kaç farklı gün yazılmış
        prof = defaultdict(set)
        for x in ts:
            if x > simdi - 7 * 86400:
                d = datetime.fromtimestamp(x, TR); prof[d.hour].add(d.date())
        if sum(1 for g in prof.values() if len(g) >= 4) < 12:
            continue                                   # günün yalnız birkaç saatinde yazılan (olay/plan güdümlü) dosya: sürekli değil
        son = ts[-1]; yas = simdi - son
        ogrenilen[f] = {"olagan_dk": round(med / 60, 1), "sinir_dk": round(sinir / 60), "son": datetime.fromtimestamp(son, TR).isoformat(timespec="minutes")}
        if yas <= sinir:
            continue
        # son yazımdan bu yana geçen saatlerden en az birinde normalde (≥4 gün) yazılıyor mu?
        saatler = set()
        h = datetime.fromtimestamp(son, TR).replace(minute=0, second=0) + timedelta(hours=1)
        while h.timestamp() <= simdi and len(saatler) < 24:
            saatler.add(h.hour); h += timedelta(hours=1)
        beklenen = [x for x in saatler if len(prof.get(x, ())) >= 4]
        if not beklenen:
            continue                                   # olağan sessizlik (ör. gece)
        geciken.append({"dosya": f, "son": ogrenilen[f]["son"], "yas_dk": round(yas / 60), "olagan_dk": ogrenilen[f]["olagan_dk"], "sinir_dk": ogrenilen[f]["sinir_dk"]})
    geciken.sort(key=lambda x: -x["yas_dk"] / max(x["sinir_dk"], 1))
    out = {"t": datetime.now(TR).isoformat(timespec="seconds"), "izlenen": izlenen, "geciken": geciken[:30],
           "ogrenilen_ornek": dict(sorted(ogrenilen.items(), key=lambda kv: kv[1]["olagan_dk"])[:40])}
    tmp = CIKTI + ".tmp"; json.dump(out, open(tmp, "w"), ensure_ascii=False); os.replace(tmp, CIKTI)
    print(f"izlenen {izlenen} dosya, geciken {len(geciken)}")


if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        json.dump({"t": datetime.now(TR).isoformat(timespec="seconds"), "hata": str(e)[:300]}, open(CIKTI, "w"), ensure_ascii=False)
        print("tarama hatası:", e)
