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

echo Finalizando processos ativos do CTRL-Farm para liberar os arquivos...
taskkill /F /IM CTRL-Farm.exe >nul 2>&1
taskkill /F /IM CTRL-Farm-Setup.exe >nul 2>&1
taskkill /F /IM Uninstall.exe >nul 2>&1
timeout /t 1 /nobreak >nul 2>&1

cd /d "%~dp0\.."

if not exist "desktop\ctrl-farm\dist" mkdir "desktop\ctrl-farm\dist"
if not exist "docs\downloads" mkdir "docs\downloads"

echo 1. Compilando CTRL-Farm.exe (Modo Silencioso /target:winexe)...
"%CSC%" /nologo /target:winexe /optimize+ /out:desktop\ctrl-farm\dist\CTRL-Farm.exe /win32icon:desktop\ctrl-farm\icon.ico desktop\ctrl-farm\src\Program.cs
if errorlevel 1 (
    echo [ERRO] Falha ao compilar CTRL-Farm.exe
    exit /b 1
)
copy /y desktop\ctrl-farm\dist\CTRL-Farm.exe .\CTRL-Farm.exe >nul
if exist "%LOCALAPPDATA%\Programs\CTRL-Farm" (
    copy /y desktop\ctrl-farm\dist\CTRL-Farm.exe "%LOCALAPPDATA%\Programs\CTRL-Farm\CTRL-Farm.exe" >nul
    if not exist "%LOCALAPPDATA%\Programs\CTRL-Farm\apps\web" mkdir "%LOCALAPPDATA%\Programs\CTRL-Farm\apps\web"
    copy /y apps\web\server.js "%LOCALAPPDATA%\Programs\CTRL-Farm\apps\web\server.js" >nul
    copy /y apps\web\next.config.mjs "%LOCALAPPDATA%\Programs\CTRL-Farm\apps\web\next.config.mjs" >nul
    echo [OK] Atalho e modulos instalados em AppData atualizados com sucesso!
)
if exist "%LOCALAPPDATA%\CTRL-Farm" (
    copy /y ctrlfarm.config.json "%LOCALAPPDATA%\CTRL-Farm\ctrlfarm.config.json" >nul
)
if exist "%LOCALAPPDATA%\Programs\CTRL-Farm" (
    copy /y ctrlfarm.config.json "%LOCALAPPDATA%\Programs\CTRL-Farm\ctrlfarm.config.json" >nul
)
echo [OK] CTRL-Farm.exe gerado com sucesso!

echo.
echo 2. Compilando Uninstall.exe (Desinstalador Grafico Nativo WinForms)...
"%CSC%" /nologo /target:winexe /optimize+ /out:desktop\ctrl-farm\dist\Uninstall.exe /win32icon:desktop\ctrl-farm\icon.ico desktop\ctrl-farm\src\Uninstaller.cs
if errorlevel 1 (
    echo [ERRO] Falha ao compilar Uninstall.exe
    exit /b 1
)
copy /y desktop\ctrl-farm\dist\Uninstall.exe .\Uninstall.exe >nul
if exist "%LOCALAPPDATA%\Programs\CTRL-Farm" (
    copy /y desktop\ctrl-farm\dist\Uninstall.exe "%LOCALAPPDATA%\Programs\CTRL-Farm\Uninstall.exe" >nul
)
echo [OK] Uninstall.exe gerado com sucesso!

echo.
echo 3. Compilando CTRL-Farm-Setup.exe (Instalador Autocontido de 1 Clique)...
"%CSC%" /nologo /target:winexe /optimize+ /out:desktop\ctrl-farm\dist\CTRL-Farm-Setup.exe /win32icon:desktop\ctrl-farm\icon.ico /resource:desktop\ctrl-farm\dist\CTRL-Farm.exe,CtrlFarm.exe /resource:desktop\ctrl-farm\dist\Uninstall.exe,Uninstall.exe /resource:desktop\ctrl-farm\icon.ico,icon.ico desktop\ctrl-farm\src\Installer.cs
if errorlevel 1 (
    echo [ERRO] Falha ao compilar CTRL-Farm-Setup.exe
    exit /b 1
)
copy /y desktop\ctrl-farm\dist\CTRL-Farm-Setup.exe .\CTRL-Farm-Setup.exe >nul
copy /y desktop\ctrl-farm\dist\CTRL-Farm-Setup.exe .\docs\downloads\CTRL-Farm-Setup.exe >nul
echo [OK] CTRL-Farm-Setup.exe gerado com sucesso!

echo.
echo 4. Verificando Inno Setup (Opcional para pacote adicional)...
set ISCC="%ProgramFiles(x86)%\Inno Setup 6\ISCC.exe"
if not exist %ISCC% set ISCC="%ProgramFiles%\Inno Setup 6\ISCC.exe"
if exist %ISCC% (
    echo Compilando pacote via Inno Setup 6...
    %ISCC% desktop\ctrl-farm\ctrl-farm.iss
    if not errorlevel 1 (
        echo [OK] Pacote Inno Setup gerado com sucesso!
    )
) else (
    echo [INFO] Inno Setup nao instalado no caminho padrao. O instalador autocontido WinForms (.NET) foi gerado perfeitamente!
)

echo.
echo =====================================================================
echo  EXECUTAVEIS CLIENTE DO CTRL-FARM GERADOS COM SUCESSO!
echo =====================================================================
echo  Arquivos prontos para distribuicao:
echo   - CTRL-Farm.exe (Executavel nativo silencioso)
echo   - Uninstall.exe (Desinstalador grafico nativo)
echo   - CTRL-Farm-Setup.exe (Instalador autocontido oficial)
echo   - docs\downloads\CTRL-Farm-Setup.exe (Copia para distribuicao web)
echo =====================================================================
