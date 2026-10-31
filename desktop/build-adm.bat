@echo off
echo =====================================================================
echo  Sistema ADM Gerente - Compilador Privado do Desenvolvedor
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

if not exist "desktop\sistema-adm-gerente\dist" mkdir "desktop\sistema-adm-gerente\dist"

echo 1. Compilando Sistema-ADM-Gerente.exe (Modo Silencioso /target:winexe)...
"%CSC%" /nologo /target:winexe /optimize+ /out:desktop\sistema-adm-gerente\dist\Sistema-ADM-Gerente.exe /win32icon:desktop\sistema-adm-gerente\icon.ico desktop\sistema-adm-gerente\src\Program.cs
if errorlevel 1 (
    echo [ERRO] Falha ao compilar Sistema-ADM-Gerente.exe
    exit /b 1
)
copy /y desktop\sistema-adm-gerente\dist\Sistema-ADM-Gerente.exe .\Sistema-ADM-Gerente.exe >nul
copy /y desktop\sistema-adm-gerente\dist\Sistema-ADM-Gerente.exe .\sistema-adm-gerente\Sistema-ADM-Gerente.exe >nul
echo [OK] Sistema-ADM-Gerente.exe gerado com sucesso!

echo.
echo 2. Compilando Uninstall.exe para o Sistema ADM...
"%CSC%" /nologo /target:winexe /optimize+ /out:desktop\sistema-adm-gerente\dist\Uninstall.exe /win32icon:desktop\sistema-adm-gerente\icon.ico desktop\sistema-adm-gerente\src\Uninstaller.cs
if errorlevel 1 (
    echo [ERRO] Falha ao compilar Uninstall.exe para o Sistema ADM
    exit /b 1
)
copy /y desktop\sistema-adm-gerente\dist\Uninstall.exe .\sistema-adm-gerente\Uninstall.exe >nul
echo [OK] Uninstall.exe gerado com sucesso!

echo.
echo 3. Compilando Sistema-ADM-Gerente-Setup.exe...
"%CSC%" /nologo /target:winexe /optimize+ /out:desktop\sistema-adm-gerente\dist\Sistema-ADM-Gerente-Setup.exe /win32icon:desktop\sistema-adm-gerente\icon.ico /resource:desktop\sistema-adm-gerente\dist\Sistema-ADM-Gerente.exe,SistemaAdmGerente.exe /resource:desktop\sistema-adm-gerente\dist\Uninstall.exe,Uninstall.exe /resource:desktop\sistema-adm-gerente\icon.ico,icon.ico desktop\sistema-adm-gerente\src\Installer.cs
if errorlevel 1 (
    echo [ERRO] Falha ao compilar Sistema-ADM-Gerente-Setup.exe
    exit /b 1
)
copy /y desktop\sistema-adm-gerente\dist\Sistema-ADM-Gerente-Setup.exe .\Sistema-ADM-Gerente-Setup.exe >nul
copy /y desktop\sistema-adm-gerente\dist\Sistema-ADM-Gerente-Setup.exe .\sistema-adm-gerente\Sistema-ADM-Gerente-Setup.exe >nul
echo [OK] Sistema-ADM-Gerente-Setup.exe gerado com sucesso!

echo.
echo =====================================================================
echo  EXECUTAVEIS DO SISTEMA ADM GERENTE GERADOS COM SUCESSO!
echo =====================================================================
echo  (Apenas maquina DEV - Protegido contra commits via .gitignore)
