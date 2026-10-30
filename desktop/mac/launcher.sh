#!/usr/bin/env bash
# ==============================================================================
# CTRL-Farm Desktop - Supervisor Nativo para macOS (Apple Silicon & Intel)
# ==============================================================================

set -e

# Resolve o diretório raiz do aplicativo dentro do bundle .app
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_ROOT="$(cd "$DIR/../../.." && pwd)"

# Arquivo de Lock e Logs
LOCKFILE="/tmp/ctrl-farm-mac.lock"
LOG_DIR="$HOME/Library/Logs/CTRL-Farm"
mkdir -p "$LOG_DIR"
MAIN_LOG="$LOG_DIR/ctrl-farm-supervisor.log"

exec > >(tee -a "$MAIN_LOG") 2>&1

echo "=============================================================================="
echo "🚀 Iniciando CTRL-Farm Industrial Platform no macOS..."
echo "📅 Data: $(date)"
echo "📍 Diretório App: $APP_ROOT"
echo "=============================================================================="

# ------------------------------------------------------------------------------
# 1. CONTROLE DE INSTÂNCIA ÚNICA
# ------------------------------------------------------------------------------
if [ -f "$LOCKFILE" ]; then
  EXISTING_PID=$(cat "$LOCKFILE" 2>/dev/null || true)
  if [ -n "$EXISTING_PID" ] && kill -0 "$EXISTING_PID" 2>/dev/null; then
    echo "⚠️  O CTRL-Farm já está em execução (PID: $EXISTING_PID). Focando janela existente..."
    if [ -d "/Applications/Google Chrome.app" ]; then
      open -a "Google Chrome" "http://localhost:3000"
    elif [ -d "/Applications/Microsoft Edge.app" ]; then
      open -a "Microsoft Edge" "http://localhost:3000"
    elif [ -d "/Applications/Brave Browser.app" ]; then
      open -a "Brave Browser" "http://localhost:3000"
    else
      open "http://localhost:3000"
    fi
    exit 0
  fi
fi

echo "$$" > "$LOCKFILE"

# ------------------------------------------------------------------------------
# 2. ENCERRAMENTO LIMPO (GRACEFUL SHUTDOWN)
# ------------------------------------------------------------------------------
PIDS_TO_KILL=()

cleanup() {
  echo ""
  echo "🛑 Encerrando serviços do CTRL-Farm (Graceful Shutdown)..."
  for pid in "${PIDS_TO_KILL[@]}"; do
    if [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null; then
      echo "   → Finalizando processo filho PID $pid..."
      kill -TERM "$pid" 2>/dev/null || kill -9 "$pid" 2>/dev/null || true
    fi
  done

  # Encerra processos node locais residuais do bundle
  pkill -f "apps/api/dist/main.js" 2>/dev/null || true
  pkill -f "mediamtx-darwin" 2>/dev/null || true

  # Remove arquivo de lock
  rm -f "$LOCKFILE"
  echo "✓ Todos os serviços encerrados com segurança. Até logo!"
}

trap cleanup SIGINT SIGTERM SIGHUP EXIT

# ------------------------------------------------------------------------------
# 3. DETECÇÃO DE ARQUITETURA DO PROCESSADOR (Apple Silicon M-Series vs Intel)
# ------------------------------------------------------------------------------
ARCH="$(uname -m)"
echo "🖥️  Arquitetura detectada: $ARCH"

MEDIAMTX_BIN=""
if [ "$ARCH" = "arm64" ]; then
  echo "🍏 Apple Silicon (M1/M2/M3/M4) detectado."
  if [ -f "$APP_ROOT/bin/mediamtx/mediamtx-darwin-arm64" ]; then
    MEDIAMTX_BIN="$APP_ROOT/bin/mediamtx/mediamtx-darwin-arm64"
  fi
else
  echo "💻 Processador Intel x86_64 detectado."
  if [ -f "$APP_ROOT/bin/mediamtx/mediamtx-darwin-amd64" ]; then
    MEDIAMTX_BIN="$APP_ROOT/bin/mediamtx/mediamtx-darwin-amd64"
  fi
fi

# Fallback genérico para mediamtx
if [ -z "$MEDIAMTX_BIN" ] && [ -f "$APP_ROOT/bin/mediamtx/mediamtx" ]; then
  MEDIAMTX_BIN="$APP_ROOT/bin/mediamtx/mediamtx"
fi

# Localiza runtime do Node.js
NODE_BIN="$(command -v node || true)"
if [ -z "$NODE_BIN" ]; then
  for candidate in \
    "$APP_ROOT/bin/node" \
    "/opt/homebrew/bin/node" \
    "/usr/local/bin/node" \
    "$HOME/.nvm/versions/node/$(ls "$HOME/.nvm/versions/node" 2>/dev/null | tail -n 1)/bin/node"
  do
    if [ -x "$candidate" ]; then
      NODE_BIN="$candidate"
      break
    fi
  done
fi

if [ -z "$NODE_BIN" ]; then
  osascript -e 'display alert "Node.js Não Encontrado" message "O CTRL-Farm requer Node.js v18+ instalado no seu Mac. Baixe gratuitamente em https://nodejs.org" as critical'
  exit 1
fi

echo "🟢 Node.js localizado em: $NODE_BIN ($($NODE_BIN -v))"

# ------------------------------------------------------------------------------
# 4. INICIALIZAÇÃO DO SERVIDOR DE TRANSMISSÃO DE CÂMERAS (MediaMTX)
# ------------------------------------------------------------------------------
if [ -n "$MEDIAMTX_BIN" ] && [ -x "$MEDIAMTX_BIN" ]; then
  echo "🎥 Iniciando MediaMTX (Darwin): $MEDIAMTX_BIN"
  "$MEDIAMTX_BIN" "$APP_ROOT/bin/mediamtx/mediamtx.yml" > "$LOG_DIR/mediamtx.log" 2>&1 &
  PIDS_TO_KILL+=($!)
else
  echo "ℹ️  MediaMTX Darwin não encontrado em bin/mediamtx/. O streaming usará adaptadores web."
fi

# ------------------------------------------------------------------------------
# 5. INICIALIZAÇÃO DA API BACKEND (NestJS - Porta 3001)
# ------------------------------------------------------------------------------
echo "🔌 Inicializando Backend da Plataforma (Porta 3001)..."
cd "$APP_ROOT/apps/api"
export PORT=3001
export NODE_ENV=production

"$NODE_BIN" dist/main.js > "$LOG_DIR/api.log" 2>&1 &
API_PID=$!
PIDS_TO_KILL+=($API_PID)

# Aguarda inicialização da API
echo -n "⏳ Aguardando inicialização da API..."
for i in {1..30}; do
  if curl -s "http://localhost:3001/docs" >/dev/null 2>&1 || curl -s "http://localhost:3001" >/dev/null 2>&1; then
    echo " Online!"
    break
  fi
  sleep 1
  echo -n "."
done

# ------------------------------------------------------------------------------
# 6. INICIALIZAÇÃO DO FRONTEND (Next.js - Porta 3000)
# ------------------------------------------------------------------------------
echo "🖥️  Inicializando Frontend da Fazenda 3D (Porta 3000)..."
cd "$APP_ROOT/apps/web"
export PORT=3000
export NODE_ENV=production

"$NODE_BIN" node_modules/.bin/next start -p 3000 > "$LOG_DIR/web.log" 2>&1 &
WEB_PID=$!
PIDS_TO_KILL+=($WEB_PID)

# Aguarda disponibilidade da porta 3000
echo -n "⏳ Aguardando carregamento da interface web..."
for i in {1..40}; do
  if curl -s "http://localhost:3000" >/dev/null 2>&1; then
    echo " Pronta!"
    break
  fi
  sleep 1
  echo -n "."
done

# ------------------------------------------------------------------------------
# 7. ABERTURA EM MODO JANELA NATIVA (Chromium App Mode)
# ------------------------------------------------------------------------------
echo "🪟 Abrindo janela nativa do CTRL-Farm..."

if [ -d "/Applications/Google Chrome.app" ]; then
  open -na "Google Chrome" --args --app="http://localhost:3000" --window-size=1440,900
elif [ -d "/Applications/Microsoft Edge.app" ]; then
  open -na "Microsoft Edge" --args --app="http://localhost:3000" --window-size=1440,900
elif [ -d "/Applications/Brave Browser.app" ]; then
  open -na "Brave Browser" --args --app="http://localhost:3000" --window-size=1440,900
elif [ -d "/Applications/Arc.app" ]; then
  open -na "Arc" --args "http://localhost:3000"
else
  open "http://localhost:3000"
fi

echo "✅ CTRL-Farm em execução com sucesso!"
echo "📝 Logs detalhados disponíveis em: $LOG_DIR"

# Mantém o processo principal vivo aguardando encerramento
wait $WEB_PID $API_PID
