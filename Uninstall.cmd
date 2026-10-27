@echo off
title Desinstalador CTRL-Farm
echo Removendo atalhos e registros do CTRL-Farm...
taskkill /IM CTRL-Farm.exe /F >nul 2>&1
del /f /q "%USERPROFILE%\Desktop\CTRL-Farm.lnk" >nul 2>&1
rmdir /s /q "%APPDATA%\Microsoft\Windows\Start Menu\Programs\CTRL-Farm" >nul 2>&1
reg delete "HKCU\Software\Microsoft\Windows\CurrentVersion\Uninstall\CTRL-Farm" /f >nul 2>&1
echo CTRL-Farm foi desinstalado com sucesso!
pause
