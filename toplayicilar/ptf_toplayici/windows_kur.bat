@echo off
REM 13:00-18:00 arasi her 10 dakikada bir ptf_cek.py calistirir (her gun)
set DIR=%~dp0
schtasks /Create /F /TN "EPIAS_PTF_Cek" /SC DAILY /ST 13:00 /RI 10 /DU 05:10 ^
 /TR "\"%LOCALAPPDATA%\Programs\Python\Python312\pythonw.exe\" \"%DIR%ptf_cek.py\""
if errorlevel 1 (
  echo Python yolu farkliysa: where pythonw  ile bulup bu dosyada duzeltin.
) else (
  echo Gorev kuruldu: EPIAS_PTF_Cek
  schtasks /Run /TN "EPIAS_PTF_Cek"
)
pause
