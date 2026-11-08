FROM python:3.12-slim
RUN apt-get update && apt-get install -y --no-install-recommends chromium fonts-liberation && rm -rf /var/lib/apt/lists/* \
    && pip install --no-cache-dir requests==2.32.3 playwright==1.49.1 \
    && useradd -m -u 1001 aesun && mkdir -p /musteri && chown aesun:aesun /musteri
WORKDIR /app
COPY solarman.py ace.py fronius.py medas_osos.py .
USER aesun
CMD ["python", "-u", "solarman.py"]
