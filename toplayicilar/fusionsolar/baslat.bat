@echo off
chcp 65001 >nul
cd /d %~dp0

if exist .env goto kur
echo FusionSolar WEB giris bilgileri (bos birakirsaniz acilan pencereden elle giris yaparsiniz)
set /p FSUSER=Kullanici adi: 
set /p FSPASS=Sifre: 
(
  echo FUSIONSOLAR_USER=%FSUSER%
  echo FUSIONSOLAR_PASS=%FSPASS%
) > .env
set FSUSER=
set FSPASS=

:kur
python -m pip install playwright -q --disable-pip-version-check
python fusionsolar_toplayici.py %*
pause
