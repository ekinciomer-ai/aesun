"""Web arayüzü ve API. Parola (SOSYAL_PAROLA) tanımlıysa giriş ister."""
import hmac
import os
import secrets
import threading
import time
from datetime import timedelta

from flask import Flask, Response, abort, jsonify, render_template, request, send_file, session

from . import arac, kaynaklar
from .uretim import Studyo, UretimHatasi


def create_app(studyo=None):
    app = Flask(__name__)
    app.secret_key = os.getenv("SOSYAL_OTURUM_ANAHTARI") or secrets.token_hex(32)
    disarida = os.getenv("SOSYAL_DISARIDA", "") == "1"  # alan adından (HTTPS) yayında mı
    app.config.update(SESSION_COOKIE_HTTPONLY=True, SESSION_COOKIE_SAMESITE="Strict", SESSION_COOKIE_SECURE=disarida,
                      PERMANENT_SESSION_LIFETIME=timedelta(days=30), MAX_CONTENT_LENGTH=2 * 1024 * 1024)
    denemeler = {}  # ip → yanlış parola zamanları (15 dk'da 5 hata → bekletilir)
    st = studyo or Studyo()
    st.h.temizle()
    calisan = {}  # oturum → {"is": ..., "hata": ...}; uzun işler arka planda yürür, ekran durumu sorar
    kilit = threading.Lock()

    def arka_plan(oid, ad, fn, *a):
        with kilit:
            if calisan.get(oid, {}).get("durum") == "calisiyor":
                raise UretimHatasi("Bu sohbette bir iş zaten sürüyor.")
            calisan[oid] = {"durum": "calisiyor", "is": ad}

        def yurut():
            try:
                fn(*a)
                calisan.pop(oid, None)
            except Exception as e:  # motor hatası dahil: ekranda gösterilir
                calisan[oid] = {"durum": "hata", "is": ad, "hata": str(e)[:600]}
        threading.Thread(target=yurut, daemon=True).start()
        return {"durum": "calisiyor", "is": ad}

    def ozet(oid):
        d = st.oturum_ozeti(oid)
        d["is_durumu"] = calisan.get(oid)
        return d

    def parola():
        return os.getenv("SOSYAL_PAROLA", "")

    @app.before_request
    def koru():
        if disarida and not parola() and request.path != "/saglik":
            return jsonify(hata="Parola tanımlı değil; program dışarıya kapalı."), 503
        acik = request.path in ("/", "/saglik", "/api/giris") or request.path.startswith("/static")
        if parola() and not acik and not session.get("giris"):
            return jsonify(hata="Giriş gerekli."), 401

    @app.after_request
    def basliklar(r):
        r.headers.setdefault("X-Content-Type-Options", "nosniff")
        r.headers.setdefault("X-Frame-Options", "DENY")
        r.headers.setdefault("Referrer-Policy", "no-referrer")
        if request.path.startswith("/api/"):
            r.headers.setdefault("Cache-Control", "no-store")
        return r

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
        ip = (request.headers.get("X-Forwarded-For", "").split(",")[0].strip() or request.remote_addr or "?")
        simdi = time.time()
        son = [t for t in denemeler.get(ip, []) if simdi - t < 900]
        if len(son) >= 5:
            return jsonify(hata="Çok fazla yanlış deneme. 15 dakika sonra tekrar deneyin."), 429
        if parola() and hmac.compare_digest(str(j().get("parola", "")).encode(), parola().encode()):
            session.permanent = True
            session["giris"] = True
            denemeler.pop(ip, None)
            return jsonify(ok=True)
        denemeler[ip] = son + [simdi]
        st.h.gunluk("giris_hatasi", f"yanlış parola · {ip}")
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
        if not st.h.oturum(oid):
            raise UretimHatasi("Sohbet bulunamadı.")
        return jsonify(ozet(oid))

    @app.post("/api/oturum/<int:oid>/uret")
    def uret(oid):
        st._oturum(oid)
        return jsonify(arka_plan(oid, "uret", st.uret, oid, bool(j().get("arastir", True))))

    @app.post("/api/oturum/<int:oid>/geri")
    def geri(oid):
        metin = str(j().get("metin", "")).strip()
        if not st.h.son_mesaj(oid, "son"):
            raise UretimHatasi("Önce içerik üretin.")
        return jsonify(arka_plan(oid, "geri", st.geri_bildirim, oid, metin))

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
        if calisan.get(oid, {}).get("durum") == "calisiyor":
            raise UretimHatasi("İş bitmeden sohbet kapatılamaz.")
        calisan.pop(oid, None)
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
        return jsonify(st.arac_isi(iid, str(d.get("tur", "")), str(d.get("ses", "")), str(d.get("stil", ""))))

    @app.get("/api/isler")
    def isler():
        return jsonify(isler=arac.isler(), araclar=arac.araclar_durumu())

    @app.post("/api/is/<iid>/iptal")
    def is_iptal(iid):
        if not arac.iptal(iid):
            raise UretimHatasi("İş başlamış ya da bulunamadı; yalnız sıradaki iş iptal edilebilir.")
        st.h.gunluk("arac_iptal", iid)
        return jsonify(ok=True)

    @app.get("/api/is/<iid>/<ad>")
    def is_dosya(iid, ad):
        y = arac.dosya_yolu(iid, ad)
        if not y:
            abort(404)
        return send_file(y, conditional=True)

    # Ücretsiz katman günlük sınırları (yaklaşık; sağlayıcılar değiştirebilir, ayarla değiştirilebilir)
    SINIR = {"gemini": {"istek": int(os.getenv("SOSYAL_SINIR_GEMINI_ISTEK", "250"))},
             "groq": {"istek": int(os.getenv("SOSYAL_SINIR_GROQ_ISTEK", "1000")),
                      "token": int(os.getenv("SOSYAL_SINIR_GROQ_TOKEN", "100000"))},
             "openrouter": {"istek": int(os.getenv("SOSYAL_SINIR_OPENROUTER_ISTEK", "50"))}}

    @app.get("/api/kullanim")
    def kullanim():
        return jsonify(**st.h.kullanim_ozet(int(request.args.get("gun", 7))), sinirlar=SINIR)

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
