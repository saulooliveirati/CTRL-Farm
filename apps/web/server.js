const http = require('http');
const path = require('path');
const fs = require('fs');

const webDir = __dirname;
const webNodeModules = path.join(webDir, 'node_modules');
const rootNodeModules = path.join(webDir, '..', '..', 'node_modules');

function writeLog(msg) {
  const line = `[${new Date().toLocaleTimeString()}] ${msg}\n`;
  console.log(msg);
  try {
    const devLogsDir = path.join(webDir, '..', '..', 'logs');
    if (!fs.existsSync(devLogsDir)) fs.mkdirSync(devLogsDir, { recursive: true });
    fs.appendFileSync(path.join(devLogsDir, 'web.log'), line);
  } catch {}
  try {
    if (process.env.LOCALAPPDATA) {
      const appDataLogsDir = path.join(process.env.LOCALAPPDATA, 'CTRL-Farm', 'Logs');
      if (!fs.existsSync(appDataLogsDir)) fs.mkdirSync(appDataLogsDir, { recursive: true });
      fs.appendFileSync(path.join(appDataLogsDir, 'web.log'), line);
    }
  } catch {}
}

writeLog('[CTRL-Farm Web] Inicializando servidor web...');

if (module.paths) {
  if (fs.existsSync(webNodeModules) && !module.paths.includes(webNodeModules)) {
    module.paths.unshift(webNodeModules);
  }
  if (fs.existsSync(rootNodeModules) && !module.paths.includes(rootNodeModules)) {
    module.paths.push(rootNodeModules);
  }
}

const port = parseInt(process.env.PORT, 10) || 3000;
const hostname = process.env.HOSTNAME || '0.0.0.0';

let nextFactory;
try {
  nextFactory = require('next');
} catch (e1) {
  try {
    nextFactory = require(path.join(webNodeModules, 'next'));
  } catch (e2) {
    writeLog(`[CTRL-Farm Web] ERRO CRÍTICO ao carregar módulo next: ${e1.message}`);
    process.exit(1);
  }
}

// Verifica se o build de produção existe
const dotNextDir = path.join(webDir, '.next');
const hasBuild = fs.existsSync(dotNextDir);
const isDev = !hasBuild && process.env.NODE_ENV !== 'production';

if (hasBuild) {
  process.env.NODE_ENV = 'production';
  writeLog('[CTRL-Farm Web] Build de produção localizado (.next). Modo otimizado ativo.');
} else {
  writeLog('[CTRL-Farm Web] Build não localizado. Inicializando em modo dinâmico.');
}

const app = nextFactory({
  dev: isDev,
  dir: webDir,
  hostname: hostname,
  port: port
});

let isReady = false;
let prepareError = null;
let handle = null;

// Inicializa o servidor HTTP IMEDIATAMENTE para que a porta 3000 responda em < 100ms
const server = http.createServer((req, res) => {
  if (isReady && handle) {
    return handle(req, res);
  }

  if (prepareError) {
    res.writeHead(500, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(`<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <title>CTRL-Farm - Diagnóstico de Inicialização</title>
  <style>
    body { background: #0a0f1b; color: #f8fafc; font-family: Segoe UI, Roboto, sans-serif; padding: 40px; margin: 0; }
    .card { background: #101827; border: 1px solid #ef4444; border-radius: 8px; padding: 24px; max-width: 800px; margin: 0 auto; box-shadow: 0 10px 25px rgba(0,0,0,0.5); }
    h2 { color: #f87171; margin-top: 0; }
    pre { background: #050811; padding: 16px; border-radius: 6px; overflow-x: auto; color: #fca5a5; font-size: 13px; line-height: 1.5; }
    button { background: #20c997; color: #0a0f1b; border: none; font-weight: bold; padding: 10px 20px; border-radius: 6px; cursor: pointer; margin-top: 15px; }
  </style>
</head>
<body>
  <div class="card">
    <h2>⚠️ Falha ao Preparar o Servidor Next.js</h2>
    <p>Ocorreu um erro interno durante a inicialização da interface web local:</p>
    <pre>${prepareError.stack || prepareError.message || String(prepareError)}</pre>
    <button onclick="location.reload()">Tentar Novamente</button>
  </div>
</body>
</html>`);
    return;
  }

  // Página de carregamento instantânea com auto-refresh enquanto app.prepare() completa
  res.writeHead(200, {
    'Content-Type': 'text/html; charset=utf-8',
    'Retry-After': '2'
  });
  res.end(`<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta http-equiv="refresh" content="2">
  <title>CTRL-Farm - Inicializando...</title>
  <style>
    * { box-sizing: border-box; }
    body {
      background: #080c16;
      color: #f8fafc;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100vh;
      margin: 0;
      overflow: hidden;
    }
    .hud-window {
      position: relative;
      width: 680px;
      background: linear-gradient(180deg, #0d1527 0%, #080c16 100%);
      border: 1.5px solid #1e293b;
      border-radius: 12px;
      padding: 34px 40px;
      box-shadow: 0 25px 60px rgba(0, 0, 0, 0.8), 0 0 40px rgba(32, 201, 151, 0.08);
    }
    /* Cantos cibernéticos HUD (brackets) */
    .corner {
      position: absolute;
      width: 18px;
      height: 18px;
      border-color: #20c997;
      border-style: solid;
      pointer-events: none;
    }
    .corner-tl { top: -1px; left: -1px; border-width: 3px 0 0 3px; border-top-left-radius: 12px; }
    .corner-tr { top: -1px; right: -1px; border-width: 3px 3px 0 0; border-top-right-radius: 12px; }
    .corner-bl { bottom: -1px; left: -1px; border-width: 0 0 3px 3px; border-bottom-left-radius: 12px; }
    .corner-br { bottom: -1px; right: -1px; border-width: 0 3px 3px 0; border-bottom-right-radius: 12px; }

    /* Top Controls */
    .top-controls {
      position: absolute;
      top: 16px;
      right: 20px;
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .vents {
      display: flex;
      gap: 4px;
    }
    .vent-line {
      width: 2px;
      height: 10px;
      background: #334155;
      transform: skewX(-30deg);
    }
    .ctrl-btn {
      color: #64748b;
      font-size: 13px;
      font-weight: bold;
    }

    /* Header */
    .header {
      display: flex;
      align-items: center;
      gap: 22px;
    }
    .printer-icon-box {
      width: 74px;
      height: 74px;
      background: #0b1322;
      border: 1.5px solid #20c997;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
      box-shadow: 0 0 20px rgba(32, 201, 151, 0.25);
    }
    .title-box h1 {
      margin: 0;
      font-size: 34px;
      font-weight: 800;
      color: #20c997;
      letter-spacing: -0.5px;
    }
    .title-box p {
      margin: 4px 0 0 0;
      font-size: 13px;
      color: #94a3b8;
    }

    /* Progress Section */
    .progress-section {
      margin-top: 36px;
      position: relative;
    }
    .badge-pill {
      position: absolute;
      top: -26px;
      right: 50px;
      background: #1e293b;
      border: 1px solid #334155;
      border-radius: 20px;
      padding: 2px 10px;
      font-size: 11px;
      font-weight: 700;
      color: #cbd5e1;
    }
    .progress-bar {
      width: 100%;
      height: 20px;
      background: #0f172a;
      border: 1.5px solid #1e3a47;
      border-radius: 20px;
      padding: 2px;
      box-shadow: 0 0 15px rgba(32, 201, 151, 0.25);
      overflow: hidden;
      position: relative;
    }
    .progress-fill {
      height: 100%;
      width: 84%;
      background: linear-gradient(90deg, #20c997 0%, #4ade80 100%);
      border-radius: 16px;
      position: relative;
      box-shadow: 0 0 12px #20c997;
      animation: pulse 1.8s ease-in-out infinite alternate;
    }
    .progress-fill::after {
      content: '';
      position: absolute;
      right: 3px;
      top: 50%;
      transform: translateY(-50%);
      width: 8px;
      height: 8px;
      background: #fff;
      border-radius: 50%;
      box-shadow: 0 0 6px #fff;
    }
    @keyframes pulse {
      0% { opacity: 0.85; filter: drop-shadow(0 0 2px #20c997); }
      100% { opacity: 1; filter: drop-shadow(0 0 8px #4ade80); }
    }

    .status-msg {
      text-align: center;
      margin-top: 18px;
      font-size: 14px;
      font-weight: 500;
      color: #cbd5e1;
    }

    /* Bottom Pills */
    .bottom-cards {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 14px;
      margin-top: 32px;
    }
    .status-card {
      background: #10182a;
      border: 1px solid #1e293b;
      border-radius: 8px;
      padding: 9px 12px;
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 12px;
      color: #94a3b8;
    }
    .status-card strong.green {
      color: #20c997;
      font-weight: 700;
    }
    .status-card strong.cyan {
      color: #38bdf8;
      font-weight: 700;
    }
  </style>
</head>
<body>
  <div class="hud-window">
    <div class="corner corner-tl"></div>
    <div class="corner corner-tr"></div>
    <div class="corner corner-bl"></div>
    <div class="corner corner-br"></div>

    <div class="top-controls">
      <div class="vents">
        <div class="vent-line"></div>
        <div class="vent-line"></div>
        <div class="vent-line"></div>
        <div class="vent-line"></div>
      </div>
      <span class="ctrl-btn">—</span>
      <span class="ctrl-btn">✕</span>
    </div>

    <div class="header">
      <div class="printer-icon-box">
        <svg width="44" height="44" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
          <!-- Cubo Isométrico 3D Printer Neon -->
          <path d="M32 10L54 22L32 34L10 22L32 10Z" stroke="#20c997" stroke-width="2.5" stroke-linejoin="round"/>
          <path d="M10 22V46L32 58V34" stroke="#20c997" stroke-width="2.5" stroke-linejoin="round"/>
          <path d="M54 22V46L32 58" stroke="#20c997" stroke-width="2.5" stroke-linejoin="round"/>
          <!-- Cabeçote e Gantry -->
          <line x1="20" y1="28" x2="44" y2="41" stroke="#38bdf8" stroke-width="2"/>
          <circle cx="32" cy="35" r="3.5" fill="#20c997"/>
          <!-- Peça sendo impressa -->
          <path d="M32 44L38 47L32 50L26 47Z" fill="#38bdf8" stroke="#20c997" stroke-width="1.5"/>
        </svg>
      </div>
      <div class="title-box">
        <h1>CTRL+Farm</h1>
        <p>Plataforma Industrial de Impressão 3D • Gestão Integrada v1.0.0-Beta</p>
      </div>
    </div>

    <div class="progress-section">
      <div class="badge-pill">84%</div>
      <div class="progress-bar">
        <div class="progress-fill"></div>
      </div>
    </div>

    <div class="status-msg">
      Inicializando serviços locais...
    </div>

    <div class="bottom-cards">
      <div class="status-card">
        <span>🗄️</span>
        <span>Banco de Dados: <strong class="green">Pronto</strong></span>
      </div>
      <div class="status-card">
        <span>📹</span>
        <span>Streaming de Câmeras: <strong class="green">Ativo</strong></span>
      </div>
      <div class="status-card">
        <span>🔗</span>
        <span>Portas: <strong class="cyan">3000 / 3001</strong></span>
      </div>
    </div>
  </div>
</body>
</html>`);
});

server.on('error', (err) => {
  writeLog(`[CTRL-Farm Web Server Error] ${err.message}`);
  process.exit(1);
});

server.listen(port, hostname, () => {
  writeLog(`[CTRL-Farm Web] Servidor HTTP escutando imediatamente na porta ${port} (${hostname})`);
});

// Inicializa a engine do Next.js de forma assíncrona
app.prepare()
  .then(() => {
    handle = app.getRequestHandler();
    isReady = true;
    writeLog('[CTRL-Farm Web] Engine do Next.js carregada com sucesso! Pronto para requisições.');
  })
  .catch((err) => {
    prepareError = err;
    writeLog(`[CTRL-Farm Web Prepare Error] ${err.stack || err.message}`);
  });
