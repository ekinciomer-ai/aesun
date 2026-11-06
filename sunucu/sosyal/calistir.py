"""Sosyal Stüdyo'yu başlatır: python calistir.py  →  http://localhost:5090"""
import os

from sosyal.web import create_app

app = create_app()

if __name__ == "__main__":
    app.run(host=os.getenv("HOST", "127.0.0.1"), port=int(os.getenv("PORT", "5090")), threaded=True)
