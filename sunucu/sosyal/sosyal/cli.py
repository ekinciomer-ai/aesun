"""Komut satırından kullanım (n8n ya da zamanlanmış iş için).
  python -m sosyal.cli durum
  python -m sosyal.cli uret --platform youtube_shorts --dil tr --format "Tarihi Magazin" --konu "..." [--kapat]
  python -m sosyal.cli hafiza
"""
import argparse
import json

from .uretim import Studyo


def main():
    p = argparse.ArgumentParser(prog="sosyal")
    alt = p.add_subparsers(dest="komut", required=True)
    alt.add_parser("durum")
    alt.add_parser("hafiza")
    u = alt.add_parser("uret")
    u.add_argument("--platform", default="youtube_shorts")
    u.add_argument("--dil", default="tr")
    u.add_argument("--format", default="")
    u.add_argument("--konu", required=True)
    u.add_argument("--arastirma-yok", action="store_true")
    u.add_argument("--kapat", action="store_true", help="üretimden sonra öğren ve sohbeti sil")
    a = p.parse_args()
    st = Studyo()
    if a.komut == "durum":
        d = st.durum()
        for m in d["motorlar"]:
            print(f"{'HAZIR' if m['hazir'] else '  -  '}  {m['etiket']} ({m['model']})")
        print(json.dumps(d["sayilar"], ensure_ascii=False))
    elif a.komut == "hafiza":
        print(st.h.markdown())
    else:
        oid = st.oturum_ac(a.platform, a.dil, a.format, a.konu)
        d = st.uret(oid, arastir=not a.arastirma_yok)
        print(d["son"])
        print("\n--- denetim:", json.dumps(d["denetim"], ensure_ascii=False))
        if a.kapat:
            print("--- öğrenilen:", json.dumps(st.kapat(oid), ensure_ascii=False))
        else:
            print(f"--- sohbet açık: {oid}")


if __name__ == "__main__":
    main()
