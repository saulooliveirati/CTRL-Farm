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
  <title>CTRL-Farm Industrial Platform - Carregando...</title>
  <style>
    body { background: #0a0f1b; color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
    .box { text-align: center; max-width: 480px; padding: 20px; }
    .logo { font-size: 32px; font-weight: 800; color: #20c997; letter-spacing: -0.5px; margin-bottom: 8px; }
    .subtitle { font-size: 14px; color: #94a3b8; margin-bottom: 28px; text-transform: uppercase; letter-spacing: 1px; }
    .spinner { width: 44px; height: 44px; border: 4px solid #1e293b; border-top: 4px solid #20c997; border-radius: 50%; animation: spin 0.9s linear infinite; margin: 0 auto 20px; }
    .status { font-size: 15px; color: #cbd5e1; font-weight: 500; }
    @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
  </style>
</head>
<body>
  <div class="box">
    <div class="logo">CTRL-Farm</div>
    <div class="subtitle">Industrial Farm Platform</div>
    <div class="spinner"></div>
    <div class="status">Sincronizando componentes locais e abrindo interface...</div>
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
