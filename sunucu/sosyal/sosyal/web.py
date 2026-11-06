"""Web arayüzü ve API. Parola (SOSYAL_PAROLA) tanımlıysa giriş ister."""
import hmac
import os
import secrets

from flask import Flask, Response, abort, jsonify, render_template, request, send_file, session

from . import arac, kaynaklar
from .uretim import Studyo, UretimHatasi


def create_app(studyo=None):
    app = Flask(__name__)
    app.secret_key = os.getenv("SOSYAL_OTURUM_ANAHTARI") or secrets.token_hex(32)
    app.config.update(SESSION_COOKIE_HTTPONLY=True, SESSION_COOKIE_SAMESITE="Strict",
                      MAX_CONTENT_LENGTH=2 * 1024 * 1024)
    st = studyo or Studyo()
    st.h.temizle()

    def parola():
        return os.getenv("SOSYAL_PAROLA", "")

    @app.before_request
    def koru():
        acik = request.path in ("/", "/saglik", "/api/giris") or request.path.startswith("/static")
        if parola() and not acik and not session.get("giris"):
            return jsonify(hata="Giriş gerekli."), 401

    @app.errorhandler(UretimHatasi)
    def _hata(e):
        return jsonify(hata=str(e)), 400

    def j():
        return request.get_json(silent=True) or {}

    @app.get("/")
    def ana():
        return render_template("index.html", parola_var=bool(parola()), giris=bool(session.get("giris")))

    @app.get("/saglik")
    def saglik():
        return jsonify(durum="ok", **st.h.sayilar())

    @app.post("/api/giris")
    def giris():
        if parola() and hmac.compare_digest(str(j().get("parola", "")), parola()):
            session["giris"] = True
            return jsonify(ok=True)
        return jsonify(hata="Parola yanlış."), 401

    @app.get("/api/durum")
    def durum():
        return jsonify(st.durum())

    @app.post("/api/oturum")
    def oturum_ac():
        d = j()
        oid = st.oturum_ac(d.get("platform", ""), d.get("dil", "tr"), d.get("format", ""), d.get("konu", ""))
        return jsonify(id=oid)

    @app.get("/api/oturumlar")
    def oturumlar():
        return jsonify(st.h.oturumlar("acik"))

    @app.get("/api/oturum/<int:oid>")
    def oturum(oid):
        return jsonify(st.oturum_ozeti(oid))

    @app.post("/api/oturum/<int:oid>/uret")
    def uret(oid):
        return jsonify(st.uret(oid, arastir=bool(j().get("arastir", True))))

    @app.post("/api/oturum/<int:oid>/geri")
    def geri(oid):
        return jsonify(st.geri_bildirim(oid, str(j().get("metin", ""))))

    @app.get("/api/oturum/<int:oid>/elle")
    def elle(oid):
        return jsonify(paket=st.elle_paket(oid))

    @app.post("/api/oturum/<int:oid>/elle")
    def elle_yanit(oid):
        return jsonify(st.elle_yanit(oid, str(j().get("metin", ""))))

    @app.post("/api/oturum/<int:oid>/onayla")
    def onayla(oid):
        d = j()
        p = d.get("puan")
        return jsonify(icerik_id=st.onayla(oid, int(p) if p else None, str(d.get("notlar", ""))))

    @app.post("/api/oturum/<int:oid>/kapat")
    def kapat(oid):
        return jsonify(st.kapat(oid))

    @app.get("/api/yetenekler")
    def yetenekler():
        return jsonify(st.h.yetenekler())

    @app.post("/api/yetenek")
    def yetenek_ekle():
        d = j()
        yid = st.h.yetenek_ekle(d.get("tur", "tercih"), str(d.get("ad", "")), str(d.get("aciklama", "")),
                                str(d.get("ornek", "")), str(d.get("platform", "hepsi")))
        if not yid:
            raise UretimHatasi("Ad ve açıklama gerekli.")
        st.hafiza_disa_aktar()
        return jsonify(id=yid)

    @app.post("/api/yetenek/<int:yid>")
    def yetenek_guncelle(yid):
        st.h.yetenek_guncelle(yid, **j())
        st.hafiza_disa_aktar()
        return jsonify(ok=True)

    @app.get("/api/icerikler")
    def icerikler():
        return jsonify(st.h.icerikler(int(request.args.get("limit", 50))))

    @app.post("/api/icerik/<int:iid>/puan")
    def icerik_puan(iid):
        d = j()
        st.h.icerik_puanla(iid, int(d.get("puan", 0)) or None, str(d.get("notlar", "")))
        return jsonify(ok=True)

    @app.post("/api/icerik/<int:iid>/arac")
    def icerik_arac(iid):
        d = j()
        return jsonify(st.arac_isi(iid, str(d.get("tur", "")), str(d.get("ses", ""))))

    @app.get("/api/isler")
    def isler():
        return jsonify(isler=arac.isler(), araclar=arac.araclar_durumu())

    @app.get("/api/is/<iid>/<ad>")
    def is_dosya(iid, ad):
        y = arac.dosya_yolu(iid, ad)
        if not y:
            abort(404)
        return send_file(y, conditional=True)

    @app.get("/api/gunluk")
    def gunluk():
        return jsonify(st.h.gunluk_listesi())

    @app.get("/api/kaynaklar")
    def kaynak_liste():
        return jsonify(kaynaklar.liste())

    @app.post("/api/kaynak")
    def kaynak_yukle():
        f = request.files.get("dosya")
        if not f:
            raise UretimHatasi("Dosya seçilmedi.")
        ad = kaynaklar.kaydet(f.filename or "kaynak.md", f.read())
        st.h.gunluk("kaynak_eklendi", ad)
        return jsonify(ad=ad)

    @app.get("/api/hafiza.md")
    def hafiza_md():
        return Response(st.h.markdown(), mimetype="text/markdown; charset=utf-8")

    return app
