@echo off
REM AEMonitoring OSOS toplayici - zamanlanmis gorev icin
cd /d "%~dp0"
if not exist "%USERPROFILE%\.aesun" mkdir "%USERPROFILE%\.aesun"
python osos_toplayici.py >> "%USERPROFILE%\.aesun\osos.log" 2>&1
