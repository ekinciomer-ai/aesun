FROM python:3.12-slim
RUN pip install --no-cache-dir requests==2.32.3 && useradd -m -u 1001 aesun && mkdir -p /musteri && chown aesun:aesun /musteri
WORKDIR /app
COPY solarman.py ace.py .
USER aesun
CMD ["python", "-u", "solarman.py"]
