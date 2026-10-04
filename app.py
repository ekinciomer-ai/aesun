import os
from pathlib import Path


def _env_yukle():
    """.env / env.txt dosyasini (varsa) ortam degiskenlerine yukler; mevcutlari ezmez."""
    kok = Path(__file__).resolve().parent
    for yol in [d / ad for d in (Path.cwd(), kok) for ad in (".env", "env.txt", ".env.txt")]:
        if yol.is_file():
            for satir in yol.read_text(encoding="utf-8").splitlines():
                satir = satir.strip()
                if satir and not satir.startswith("#") and "=" in satir:
                    k, v = satir.split("=", 1)
                    os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))
            return


_env_yukle()

from aesun.web import create_app  # noqa: E402  (ortam degiskenleri yuklendikten sonra)

app = create_app()

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.getenv("PORT", "8080")))
