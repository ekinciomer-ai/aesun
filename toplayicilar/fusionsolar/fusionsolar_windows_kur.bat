@echo off
chcp 65001 >nul
cd /d "%~dp0"
schtasks /Create /F /TN "AEMonitoring FusionSolar" /SC ONLOGON /RL LIMITED /TR "\"%~dp0fusionsolar_calistir.bat\""
schtasks /Run /TN "AEMonitoring FusionSolar"
echo Kuruldu: oturum acilinca FusionSolar toplayici arka planda calisir.
pause
