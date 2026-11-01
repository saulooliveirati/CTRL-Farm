@echo off
echo =====================================================================
echo  CTRL-Farm - Compilador do Frontend Web Next.js
echo =====================================================================
cd /d "%~dp0\.."

echo Executando build de producao do Next.js no Windows...
call npm --prefix apps\web run build
if errorlevel 1 (
    echo Tentando com pnpm...
    call pnpm --filter web build
)

if exist "%LOCALAPPDATA%\Programs\CTRL-Farm\apps\web" (
    echo Sincronizando arquivos de producao com AppData...
    copy /y apps\web\server.js "%LOCALAPPDATA%\Programs\CTRL-Farm\apps\web\server.js" >nul
    copy /y apps\web\next.config.mjs "%LOCALAPPDATA%\Programs\CTRL-Farm\apps\web\next.config.mjs" >nul
    copy /y apps\web\next.config.ts "%LOCALAPPDATA%\Programs\CTRL-Farm\apps\web\next.config.ts" >nul
    if exist "apps\web\.next" (
        xcopy /s /e /y /q "apps\web\.next" "%LOCALAPPDATA%\Programs\CTRL-Farm\apps\web\.next\" >nul 2>&1
    )
)

echo.
echo [OK] Frontend Web compilado e atualizado com sucesso!
echo Ao abrir o CTRL-Farm, a nova interface sera carregada imediatamente.
echo =====================================================================
pause
