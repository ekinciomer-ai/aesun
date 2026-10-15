#!/usr/bin/env python3
"""Parasal veri dosyasını portalın açık anahtarıyla şifreler (RSA-OAEP-256 ile sarılmış rastgele AES-256-GCM anahtarı).

Açık anahtar epias-ptf/portal/veri.json → parasal_acik (JWK n/e) alanındadır; yönetici portala ilk girişte üretir.
Özel anahtar yalnız portal rehberinde ve monitoring 'parasal' yetkili kullanıcıların şifreli kaydında durur, burada YOKTUR.
Kullanım: parasal_sifrele.py <girdi.json> <çıktı.json>
Açık anahtar henüz yoksa içerik yazılmaz; yalnız {"sifreli": true, "bekliyor": true} yazılır ve çıkış kodu 3 olur.
"""
import base64, json, os, sys, time, urllib.request

from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.asymmetric import padding, rsa
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

VERILER = ["https://api.aksarayenerji.net/v1/acik/portal/veri.json", "https://raw.githubusercontent.com/ekinciomer-ai/epias-ptf/main/portal/veri.json"]


def b64u_int(s):
    return int.from_bytes(base64.urlsafe_b64decode(s + "=" * (-len(s) % 4)), "big")


def acik_anahtar():
    yol = os.environ.get("PARASAL_ACIK")          # test için yerel JWK dosyası
    if yol:
        j = json.load(open(yol))
    else:
        j = None
        for u in VERILER:
            try:
                with urllib.request.urlopen(u + "?t=" + str(int(time.time())), timeout=30) as r:
                    j = json.loads(r.read().decode()).get("parasal_acik"); break
            except Exception:
                continue
    if not j or not j.get("n"):
        return None, None
    return rsa.RSAPublicNumbers(b64u_int(j["e"]), b64u_int(j["n"])).public_key(), j.get("olusturma")


def main(girdi, cikti):
    acik, surum = acik_anahtar()
    if acik is None:
        json.dump({"sifreli": True, "bekliyor": True, "not": "Parasal anahtar henüz oluşturulmadı: yönetici portala bir kez giriş yapmalı."}, open(cikti, "w"))
        print("::warning::Parasal açık anahtar yok; veri yayınlanmadı (yalnız bekleme kaydı)")
        return 3
    ham = open(girdi, "rb").read()
    k, iv = AESGCM.generate_key(256), os.urandom(12)
    ct = AESGCM(k).encrypt(iv, ham, None)            # WebCrypto ile aynı biçim: şifreli metin + 16 bayt etiket
    ak = acik.encrypt(k, padding.OAEP(mgf=padding.MGF1(hashes.SHA256()), algorithm=hashes.SHA256(), label=None))
    b = lambda x: base64.b64encode(x).decode()
    json.dump({"sifreli": True, "alg": "RSA-OAEP-256+A256GCM", "anahtar_surum": surum, "ak": b(ak), "iv": b(iv), "ct": b(ct)}, open(cikti, "w"))
    print(f"::notice::şifrelendi {len(ham)} bayt → {cikti}")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1], sys.argv[2]))
