@echo off
echo =====================================================================
echo  CTRL-Farm Industrial Platform - Compilador de Executaveis Desktop
echo =====================================================================

set CSC=C:\Windows\Microsoft.NET\Framework64\v4.0.30319\csc.exe

if not exist "%CSC%" set CSC=C:\Windows\Microsoft.NET\Framework\v4.0.30319\csc.exe

if not exist "%CSC%" (
    echo [ERRO] Compilador C# nao encontrado no sistema .NET Framework.
    exit /b 1
)

echo Usando compilador: %CSC%
echo.

cd /d "%~dp0\.."

if not exist "desktop\ctrl-farm\dist" mkdir "desktop\ctrl-farm\dist"

echo 1. Compilando CTRL-Farm.exe...
"%CSC%" /nologo /target:winexe /optimize+ /out:desktop\ctrl-farm\dist\CTRL-Farm.exe /win32icon:desktop\ctrl-farm\icon.ico desktop\ctrl-farm\src\Program.cs
if errorlevel 1 (
    echo [ERRO] Falha ao compilar CTRL-Farm.exe
    exit /b 1
)
copy /y desktop\ctrl-farm\dist\CTRL-Farm.exe .\CTRL-Farm.exe >nul
echo [OK] CTRL-Farm.exe gerado com sucesso!

echo.
echo 2. Compilando CTRL-Farm-Setup.exe (Instalador Autocontido de 1 Clique)...
"%CSC%" /nologo /target:winexe /optimize+ /out:desktop\ctrl-farm\dist\CTRL-Farm-Setup.exe /win32icon:desktop\ctrl-farm\icon.ico /resource:desktop\ctrl-farm\dist\CTRL-Farm.exe,CtrlFarm.exe /resource:desktop\ctrl-farm\icon.ico,icon.ico desktop\ctrl-farm\src\Installer.cs
if errorlevel 1 (
    echo [ERRO] Falha ao compilar CTRL-Farm-Setup.exe
    exit /b 1
)
copy /y desktop\ctrl-farm\dist\CTRL-Farm-Setup.exe .\CTRL-Farm-Setup.exe >nul
echo [OK] CTRL-Farm-Setup.exe gerado com sucesso!

echo.
echo =====================================================================
echo  EXECUTAVEIS CLIENTE DO CTRL-FARM GERADOS COM SUCESSO!
echo =====================================================================
echo  Arquivos prontos para distribuicao:
echo   - CTRL-Farm.exe
echo   - CTRL-Farm-Setup.exe
echo =====================================================================
