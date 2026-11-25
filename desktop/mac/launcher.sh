#!/usr/bin/env bash
# ==============================================================================
# CTRL-Farm Desktop - Supervisor Nativo Silencioso para macOS (Apple Silicon & Intel)
# ==============================================================================

# Resolve o diretório raiz do aplicativo dentro do bundle .app
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_ROOT="$(cd "$DIR/../../.." && pwd)"

# Configuração de Logs Ocultos em ~/Library/Logs/CTRL-Farm/
LOCKFILE="/tmp/ctrl-farm-mac.lock"
LOG_DIR="$HOME/Library/Logs/CTRL-Farm"
mkdir -p "$LOG_DIR"
MAIN_LOG="$LOG_DIR/ctrl-farm-supervisor.log"

# Redireciona toda a saída para o log de forma 100% silenciosa sem abrir terminais
exec >> "$MAIN_LOG" 2>&1

echo "=============================================================================="
echo "🚀 Iniciando CTRL-Farm Industrial Platform no macOS (Modo Silencioso)..."
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
      open -a "Google Chrome" "http://localhost:3000" >/dev/null 2>&1 || true
    elif [ -d "/Applications/Microsoft Edge.app" ]; then
      open -a "Microsoft Edge" "http://localhost:3000" >/dev/null 2>&1 || true
    elif [ -d "/Applications/Brave Browser.app" ]; then
      open -a "Brave Browser" "http://localhost:3000" >/dev/null 2>&1 || true
    else
      open "http://localhost:3000" >/dev/null 2>&1 || true
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

  # Encerra processos residuais vinculados ao bundle
  pkill -f "apps/api/dist/main.js" 2>/dev/null || true
  pkill -f "mediamtx-darwin" 2>/dev/null || true

  # Remove arquivo de lock
  rm -f "$LOCKFILE"
  echo "✓ Todos os serviços encerrados com segurança."
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
NODE_BIN="$(command -v node 2>/dev/null || true)"
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
  osascript -e 'display alert "Node.js Não Encontrado" message "O CTRL-Farm requer o Node.js instalado no seu Mac. Baixe gratuitamente em https://nodejs.org" as critical' >/dev/null 2>&1 || true
  exit 1
fi

echo "🟢 Node.js localizado em: $NODE_BIN ($($NODE_BIN -v 2>/dev/null || echo 'OK'))"

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
echo "⏳ Aguardando disponibilidade da porta 3001..."
for i in {1..35}; do
  if curl -s "http://localhost:3001" >/dev/null 2>&1 || curl -s "http://localhost:3001/docs" >/dev/null 2>&1; then
    echo "🟢 API Online!"
    break
  fi
  sleep 1
done

# ------------------------------------------------------------------------------
# 6. INICIALIZAÇÃO DO FRONTEND (Next.js - Porta 3000)
# ------------------------------------------------------------------------------
echo "🖥️  Inicializando Frontend da Fazenda 3D (Porta 3000)..."
cd "$APP_ROOT/apps/web"
export PORT=3000
export NODE_ENV=production

NEXT_BIN="$APP_ROOT/apps/web/node_modules/next/dist/bin/next"
if [ ! -f "$NEXT_BIN" ]; then
  NEXT_BIN="$APP_ROOT/node_modules/next/dist/bin/next"
fi

if [ -f "$APP_ROOT/apps/web/server.js" ]; then
  "$NODE_BIN" "$APP_ROOT/apps/web/server.js" > "$LOG_DIR/web.log" 2>&1 &
elif [ -f "$NEXT_BIN" ]; then
  "$NODE_BIN" "$NEXT_BIN" start -p 3000 -H 0.0.0.0 > "$LOG_DIR/web.log" 2>&1 &
else
  "$NODE_BIN" node_modules/.bin/next start -p 3000 -H 0.0.0.0 > "$LOG_DIR/web.log" 2>&1 &
fi
WEB_PID=$!
PIDS_TO_KILL+=($WEB_PID)

# Aguarda disponibilidade da interface web
echo "⏳ Aguardando carregamento da interface web na porta 3000..."
for i in {1..40}; do
  if curl -s "http://localhost:3000" >/dev/null 2>&1; then
    echo "🟢 Interface Web Pronta!"
    break
  fi
  sleep 1
done

# ------------------------------------------------------------------------------
# 7. ABERTURA EM MODO JANELA NATIVA (Chromium App Mode / WebKit)
# ------------------------------------------------------------------------------
echo "🪟 Abrindo janela de aplicativo nativo do CTRL-Farm..."

# Detecta idioma configurado (padrão pt-BR)
LOCALE="pt-BR"
if [ -f "$APP_ROOT/ctrlfarm.config.json" ]; then
  CONF_LOC=$(grep -o '"locale"[[:space:]]*:[[:space:]]*"[^"]*"' "$APP_ROOT/ctrlfarm.config.json" | cut -d'"' -f4)
  if [ -n "$CONF_LOC" ]; then
    LOCALE="$CONF_LOC"
  fi
fi

APP_URL="http://localhost:3000?lang=$LOCALE"

if [ -d "/Applications/Google Chrome.app" ]; then
  open -na "Google Chrome" --args --app="$APP_URL" --window-size=1440,900 >/dev/null 2>&1
elif [ -d "/Applications/Microsoft Edge.app" ]; then
  open -na "Microsoft Edge" --args --app="$APP_URL" --window-size=1440,900 >/dev/null 2>&1
elif [ -d "/Applications/Brave Browser.app" ]; then
  open -na "Brave Browser" --args --app="$APP_URL" --window-size=1440,900 >/dev/null 2>&1
else
  # Fallback: navegador padrão do Mac
  open "$APP_URL" >/dev/null 2>&1
fi

echo "✅ CTRL-Farm em execução silenciosa com sucesso!"
echo "📝 Logs detalhados disponíveis em: $LOG_DIR"

# Mantém o processo principal vivo aguardando encerramento
wait $WEB_PID $API_PID
