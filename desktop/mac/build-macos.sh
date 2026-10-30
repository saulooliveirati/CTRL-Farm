#!/usr/bin/env bash
# ==============================================================================
# Script Oficial de Empacotamento macOS (.dmg) do CTRL-Farm Industrial
# ==============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

echo "=============================================================================="
echo "🍏 INICIANDO EMPACOTAMENTO OFICIAL DO CTRL-FARM PARA MACOS"
echo "=============================================================================="
echo "📂 Raiz do Projeto: $PROJECT_ROOT"
echo "📂 Script Dir:     $SCRIPT_DIR"

cd "$PROJECT_ROOT"

# 1. Compilação de Produção
echo ""
echo "📦 1. Compilando Backend e Frontend em modo Produção..."
pnpm --filter api build
pnpm --filter web build

# 2. Preparação dos Diretórios Temporários de Staging
STAGE_DIR="$PROJECT_ROOT/desktop/mac/dist/dmg-stage"
APP_BUNDLE="$STAGE_DIR/CTRL-Farm.app"
CONTENTS="$APP_BUNDLE/Contents"
MACOS_DIR="$CONTENTS/MacOS"
RESOURCES_DIR="$CONTENTS/Resources"
APP_PAYLOAD="$CONTENTS/app"

echo "🧹 2. Limpando diretórios de build anteriores..."
rm -rf "$PROJECT_ROOT/desktop/mac/dist"
mkdir -p "$MACOS_DIR"
mkdir -p "$RESOURCES_DIR"
mkdir -p "$APP_PAYLOAD"

# 3. Cópia de Metadados e Recursos da Apple
echo "🎨 3. Copiando Info.plist e ícones nativos..."
cp "$SCRIPT_DIR/Info.plist" "$CONTENTS/Info.plist"

if [ -f "$SCRIPT_DIR/assets/icon.icns" ]; then
  cp "$SCRIPT_DIR/assets/icon.icns" "$RESOURCES_DIR/icon.icns"
fi

# 4. Cópia e Configuração do Launcher Executável
echo "⚙️  4. Configurando executável nativo launcher.sh..."
cp "$SCRIPT_DIR/launcher.sh" "$MACOS_DIR/launcher.sh"
chmod +x "$MACOS_DIR/launcher.sh"

# 5. Cópia dos Arquivos da Aplicação
echo "📁 5. Copiando arquivos essenciais da aplicação..."
mkdir -p "$APP_PAYLOAD/apps/api"
mkdir -p "$APP_PAYLOAD/apps/web"
mkdir -p "$APP_PAYLOAD/bin"
mkdir -p "$APP_PAYLOAD/prisma"

cp -R "$PROJECT_ROOT/apps/api/dist" "$APP_PAYLOAD/apps/api/"
cp "$PROJECT_ROOT/apps/api/package.json" "$APP_PAYLOAD/apps/api/"

cp -R "$PROJECT_ROOT/apps/web/.next" "$APP_PAYLOAD/apps/web/"
cp -R "$PROJECT_ROOT/apps/web/public" "$APP_PAYLOAD/apps/web/" 2>/dev/null || true
cp "$PROJECT_ROOT/apps/web/package.json" "$APP_PAYLOAD/apps/web/"

cp -R "$PROJECT_ROOT/bin" "$APP_PAYLOAD/" 2>/dev/null || true
cp -R "$PROJECT_ROOT/prisma" "$APP_PAYLOAD/" 2>/dev/null || true
cp "$PROJECT_ROOT/package.json" "$APP_PAYLOAD/"
cp "$PROJECT_ROOT/.env.example" "$APP_PAYLOAD/.env" 2>/dev/null || true

# 6. Criação do Link Simbólico para /Applications
echo "🔗 6. Criando link simbólico para a pasta de Aplicativos do Mac..."
ln -s /Applications "$STAGE_DIR/Applications" 2>/dev/null || true

# 7. Geração da Imagem de Disco (.dmg)
OUTPUT_DMG="$PROJECT_ROOT/desktop/mac/dist/CTRL-Farm.dmg"
ROOT_DMG="$PROJECT_ROOT/CTRL-Farm.dmg"

echo "💿 7. Gerando imagem de disco comprimida CTRL-Farm.dmg..."
if command -v hdiutil >/dev/null 2>&1; then
  hdiutil create -volname "CTRL-Farm" -srcfolder "$STAGE_DIR" -ov -format UDZO "$OUTPUT_DMG"
  cp -f "$OUTPUT_DMG" "$ROOT_DMG"
  echo "✅ Imagem DMG gerada com sucesso via hdiutil!"
else
  echo "⚠️  hdiutil nativo não encontrado neste sistema operacional (execução em Windows/Linux)."
  echo "⚡ Executando gerador universal compatível..."
  node "$SCRIPT_DIR/create-dmg.mjs"
fi

if [ -f "$ROOT_DMG" ]; then
  echo ""
  echo "=============================================================================="
  echo "🎉 PACOTE MAC OFICIAL GERADO COM SUCESSO!"
  echo "=============================================================================="
  echo "📍 Arquivo final: $ROOT_DMG"
  echo "📍 Tamanho: $(ls -lh "$ROOT_DMG" 2>/dev/null | awk '{print $5}' || echo 'OK')"
  echo "=============================================================================="
fi
