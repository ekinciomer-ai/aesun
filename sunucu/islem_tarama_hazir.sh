#!/bin/bash
echo "NOT: ssh klasörü: $(ls /opt/aesun/ssh | tr '\n' ' ') · python3: $(python3 --version 2>&1) · git: $(git --version)"
