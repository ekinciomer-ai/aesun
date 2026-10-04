"""aesun Flask uygulamasi."""
from __future__ import annotations

import base64
import os
import urllib.parse
import urllib.request

from flask import Flask, jsonify, redirect, render_template

from . import ozet as ozet_mod


def _whatsapp(mesaj: str) -> tuple[bool, str]:
    sid, tok = os.getenv("TWILIO_SID", ""), os.getenv("TWILIO_TOKEN", "")
    kimden = os.getenv("TWILIO_NUMARA", "whatsapp:+14155238886")
    kime = [x.strip() for x in os.getenv("AESUN_WHATSAPP_KIME", "").split(",") if x.strip()]
    if not (sid and tok and kime):
        return False, "TWILIO_SID, TWILIO_TOKEN ve AESUN_WHATSAPP_KIME tanımlı değil"
    yetki = base64.b64encode(f"{sid}:{tok}".encode()).decode()
    for k in kime:
        govde = urllib.parse.urlencode({"From": kimden, "To": k, "Body": mesaj}).encode()
        req = urllib.request.Request(f"https://api.twilio.com/2010-04-01/Accounts/{sid}/Messages.json",
                                     data=govde, headers={"Authorization": f"Basic {yetki}"})
        urllib.request.urlopen(req, timeout=20).read()
    return True, f"{len(kime)} kişiye gönderildi"


def create_app() -> Flask:
    app = Flask(__name__)

    @app.route("/")
    def genel():
        d = ozet_mod.genel_bakis()
        d["inverter_uyari"] = sum(1 for u in d["uyarilar"] if u["kategori"] == "inverter" and u["seviye"] != "bilgi")
        d["madencilik_uyari"] = sum(1 for u in d["uyarilar"] if u["kategori"] == "madencilik")
        d["fusion_bayat"] = any(u["kategori"] == "inverter" and "FusionSolar" in u["baslik"] for u in d["uyarilar"])
        return render_template("genel.html", **d)

    @app.route("/api/genel")
    def api_genel():
        d = ozet_mod.genel_bakis()
        d.pop("sayi", None)
        d["simdi"] = d["simdi"].isoformat()
        return jsonify(d)

    @app.route("/api/uyarilar/whatsapp", methods=["POST"])
    def whatsapp():
        d = ozet_mod.genel_bakis()
        onemli = [u for u in d["uyarilar"] if u["seviye"] != "bilgi"]
        mesaj = "Otocoin uyarıları\n" + "\n".join(
            f"{'🔴' if u['seviye'] == 'kritik' else '🟠'} {u['baslik']}" for u in onemli) if onemli else \
            "Otocoin: dikkat isteyen bir şey yok."
        try:
            ok, bilgi = _whatsapp(mesaj)
        except Exception as e:  # ag hatasi
            ok, bilgi = False, str(e)[:200]
        return redirect("/?whatsapp=" + ("ok" if ok else urllib.parse.quote(bilgi)))

    return app
