FROM python:3.11-slim
RUN apt-get update && apt-get install -y --no-install-recommends git openssh-client ca-certificates tzdata && rm -rf /var/lib/apt/lists/* \
 && pip install --no-cache-dir twilio matplotlib requests cryptography \
 && useradd -m -u 1001 aesun && mkdir -p /veri && chown aesun:aesun /veri
ENV TZ=Europe/Istanbul
ENV GIT_SSH_COMMAND="ssh -i /home/aesun/.ssh/id_ed25519 -o UserKnownHostsFile=/dev/null -o StrictHostKeyChecking=no"
WORKDIR /app
COPY zamanlayici.py sef_github.py ./
USER aesun
CMD ["python", "-u", "zamanlayici.py"]
