# ==============================================================================
# Script de Publicacao Simultanea dos Instaladores no GitHub Releases
# Anexa CTRL-Farm-Setup.exe (Windows) e CTRL-Farm.dmg (macOS) na release
# ==============================================================================

param(
    [string]$Tag = "v1.0.0-beta",
    [string]$Repo = "saulooliveirati/CTRL-Farm"
)

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "==============================================================================" -ForegroundColor Cyan
Write-Host "PUBLICADOR OFICIAL DE RELEASES DO CTRL-FARM (CROSS-PLATFORM)" -ForegroundColor Cyan
Write-Host "==============================================================================" -ForegroundColor Cyan
Write-Host ""

$WinFile = "CTRL-Farm-Setup.exe"
$MacFile = "CTRL-Farm.dmg"

if (-not (Test-Path $WinFile)) {
    Write-Host "[INFO] $WinFile nao encontrado na raiz. Compilando agora..." -ForegroundColor Yellow
    cmd /c "desktop\build-desktop.bat"
}

if (-not (Test-Path $MacFile)) {
    Write-Host "[INFO] $MacFile nao encontrado na raiz. Gerando imagem agora..." -ForegroundColor Yellow
    node desktop/mac/create-dmg.mjs
}

Write-Host "[OK] Instaladores verificados com sucesso:" -ForegroundColor Green
Get-Item $WinFile, $MacFile | Select-Object Name, Length, LastWriteTime | Format-Table -AutoSize

# Verifica se o GitHub CLI (gh) esta disponivel
$ghPath = Get-Command gh -ErrorAction SilentlyContinue

if ($ghPath) {
    Write-Host "Executando deploy via GitHub CLI (gh)..." -ForegroundColor Cyan
    
    # Tenta criar a release primeiro caso nao exista
    gh release create $Tag $WinFile $MacFile --title "CTRL-Farm $Tag" --notes "Release oficial multiplataforma contendo os instaladores para Windows (.exe) e macOS (.dmg)." --repo $Repo 2>$null

    if ($LASTEXITCODE -ne 0) {
        Write-Host "Release $Tag ja existe. Atualizando assets com --clobber..." -ForegroundColor Yellow
        gh release upload $Tag $WinFile $MacFile --clobber --repo $Repo
    }

    Write-Host "Deploy concluido com sucesso!" -ForegroundColor Green
    Write-Host "Windows: https://github.com/$Repo/releases/download/$Tag/$WinFile" -ForegroundColor Cyan
    Write-Host "macOS:   https://github.com/$Repo/releases/download/$Tag/$MacFile" -ForegroundColor Cyan
} else {
    Write-Host "[INFO] GitHub CLI (gh) nao detectado no PATH." -ForegroundColor Yellow
    Write-Host "Para publicar diretamente na sua conta do GitHub via terminal:" -ForegroundColor Yellow
    Write-Host "1. Instale o gh: winget install GitHub.cli" -ForegroundColor DarkGray
    Write-Host "2. Autentique: gh auth login" -ForegroundColor DarkGray
    Write-Host "3. Execute o comando oficial:" -ForegroundColor DarkGray
    Write-Host "   gh release upload $Tag $WinFile $MacFile --clobber" -ForegroundColor Green
    Write-Host "Ou anexe manualmente os arquivos $WinFile e $MacFile para a release no painel do GitHub." -ForegroundColor DarkGray
}

Write-Host ""
