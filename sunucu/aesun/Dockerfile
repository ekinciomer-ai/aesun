FROM python:3.12-slim
RUN apt-get update && apt-get install -y --no-install-recommends git openssh-client ca-certificates && rm -rf /var/lib/apt/lists/* \
 && pip install --no-cache-dir fastapi==0.115.6 uvicorn==0.32.1 \
 && useradd -m -u 1001 aesun && mkdir -p /veri && chown aesun:aesun /veri
WORKDIR /app
COPY app.py .
USER aesun
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000", "--proxy-headers", "--forwarded-allow-ips", "*", "--workers", "1"]
