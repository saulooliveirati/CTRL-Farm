@echo off
echo =====================================================================
echo  CTRL-Farm e Sistema ADM Gerente - Compilador de Executaveis Desktop
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

echo 1. Compilando CTRL-Farm.exe...
"%CSC%" /nologo /target:winexe /optimize+ /out:desktop\ctrl-farm\dist\CTRL-Farm.exe /win32icon:desktop\ctrl-farm\icon.ico desktop\ctrl-farm\src\Program.cs
if errorlevel 1 (
    echo [ERRO] Falha ao compilar CTRL-Farm.exe
    exit /b 1
)
copy /y desktop\ctrl-farm\dist\CTRL-Farm.exe .\CTRL-Farm.exe >nul
echo [OK] CTRL-Farm.exe gerado com sucesso!

echo.
echo 2. Compilando CTRL-Farm-Setup.exe (Instalador Autocontido)...
"%CSC%" /nologo /target:winexe /optimize+ /out:desktop\ctrl-farm\dist\CTRL-Farm-Setup.exe /win32icon:desktop\ctrl-farm\icon.ico /resource:desktop\ctrl-farm\dist\CTRL-Farm.exe,CtrlFarm.exe /resource:desktop\ctrl-farm\icon.ico,icon.ico desktop\ctrl-farm\src\Installer.cs
if errorlevel 1 (
    echo [ERRO] Falha ao compilar CTRL-Farm-Setup.exe
    exit /b 1
)
copy /y desktop\ctrl-farm\dist\CTRL-Farm-Setup.exe .\CTRL-Farm-Setup.exe >nul
echo [OK] CTRL-Farm-Setup.exe gerado com sucesso!

echo.
echo 3. Compilando Sistema-ADM-Gerente.exe...
"%CSC%" /nologo /target:winexe /optimize+ /out:desktop\sistema-adm-gerente\dist\Sistema-ADM-Gerente.exe /win32icon:desktop\sistema-adm-gerente\icon.ico desktop\sistema-adm-gerente\src\Program.cs
if errorlevel 1 (
    echo [ERRO] Falha ao compilar Sistema-ADM-Gerente.exe
    exit /b 1
)
copy /y desktop\sistema-adm-gerente\dist\Sistema-ADM-Gerente.exe .\Sistema-ADM-Gerente.exe >nul
copy /y desktop\sistema-adm-gerente\dist\Sistema-ADM-Gerente.exe .\sistema-adm-gerente\Sistema-ADM-Gerente.exe >nul
echo [OK] Sistema-ADM-Gerente.exe gerado com sucesso!

echo.
echo 4. Compilando Sistema-ADM-Gerente-Setup.exe (Instalador Autocontido)...
"%CSC%" /nologo /target:winexe /optimize+ /out:desktop\sistema-adm-gerente\dist\Sistema-ADM-Gerente-Setup.exe /win32icon:desktop\sistema-adm-gerente\icon.ico /resource:desktop\sistema-adm-gerente\dist\Sistema-ADM-Gerente.exe,SistemaAdmGerente.exe /resource:desktop\sistema-adm-gerente\icon.ico,icon.ico desktop\sistema-adm-gerente\src\Installer.cs
if errorlevel 1 (
    echo [ERRO] Falha ao compilar Sistema-ADM-Gerente-Setup.exe
    exit /b 1
)
copy /y desktop\sistema-adm-gerente\dist\Sistema-ADM-Gerente-Setup.exe .\Sistema-ADM-Gerente-Setup.exe >nul
copy /y desktop\sistema-adm-gerente\dist\Sistema-ADM-Gerente-Setup.exe .\sistema-adm-gerente\Sistema-ADM-Gerente-Setup.exe >nul
echo [OK] Sistema-ADM-Gerente-Setup.exe gerado com sucesso!

echo.
echo =====================================================================
echo  TODOS OS 4 EXECUTAVEIS E INSTALADORES FORAM GERADOS COM SUCESSO!
echo =====================================================================
echo  Arquivos gerados na raiz:
echo   - CTRL-Farm.exe
echo   - CTRL-Farm-Setup.exe
echo   - Sistema-ADM-Gerente.exe
echo   - Sistema-ADM-Gerente-Setup.exe
echo =====================================================================
