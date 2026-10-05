@echo off
chcp 65001 >nul
cd /d "%~dp0"
if not exist data mkdir data
python fusionsolar_toplayici.py >> data\calisma.log 2>&1
