FROM python:3.11-slim
RUN apt-get update && apt-get install -y --no-install-recommends git openssh-client ca-certificates tzdata && rm -rf /var/lib/apt/lists/* \
 && pip install --no-cache-dir twilio matplotlib requests cryptography \
 && useradd -m -u 1001 aesun && mkdir -p /veri && chown aesun:aesun /veri
ENV TZ=Europe/Istanbul
WORKDIR /app
COPY zamanlayici.py .
USER aesun
CMD ["python", "-u", "zamanlayici.py"]
