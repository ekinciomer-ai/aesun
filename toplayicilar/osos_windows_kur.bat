@echo off
chcp 65001 >nul
REM AEMonitoring OSOS toplayici - Windows kurulumu (Pi gelene kadar)
REM 1) requests paketini kurar  2) ayar dosyasini acar  3) her saat xx:10 calisan gorev olusturur
set KLASOR=%~dp0
python -m pip install --quiet requests
if not exist "%USERPROFILE%\.aesun" mkdir "%USERPROFILE%\.aesun"
if not exist "%USERPROFILE%\.aesun\osos.env" (
  > "%USERPROFILE%\.aesun\osos.env" echo OSOS_KULLANICI=
  >>"%USERPROFILE%\.aesun\osos.env" echo OSOS_SIFRE=
  >>"%USERPROFILE%\.aesun\osos.env" echo GITHUB_TOKEN=
  >>"%USERPROFILE%\.aesun\osos.env" echo AESUN_ANAHTAR=
)
echo Ayar dosyasi aciliyor, bilgileri yazip kaydedin ve kapatin...
notepad "%USERPROFILE%\.aesun\osos.env"
echo Ilk calistirma (son 3 gun)...
python "%KLASOR%osos_toplayici.py" --gun 3
schtasks /Create /F /TN "AEMonitoring OSOS" /SC HOURLY /ST 00:10 /TR "cmd /c python \"%KLASOR%osos_toplayici.py\" >> \"%USERPROFILE%\.aesun\osos.log\" 2>&1"
echo.
echo Gorev kuruldu: her saat xx:10. Kayit: %USERPROFILE%\.aesun\osos.log
pause
