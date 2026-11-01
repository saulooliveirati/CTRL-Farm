const http = require('http');
const path = require('path');
const fs = require('fs');
const next = require('next');

const port = parseInt(process.env.PORT, 10) || 3000;
const hostname = process.env.HOSTNAME || '0.0.0.0';

// Detecta se o build de produção existe
const dotNextDir = path.join(__dirname, '.next');
const hasBuild = fs.existsSync(dotNextDir);
const isDev = !hasBuild && process.env.NODE_ENV !== 'production';

if (hasBuild) {
  process.env.NODE_ENV = 'production';
  console.log('[CTRL-Farm Web] Build de produção detectado. Modo otimizado ativo.');
} else {
  console.log('[CTRL-Farm Web] Build não encontrado. Utilizando modo dinâmico.');
}

const app = next({
  dev: isDev,
  dir: __dirname,
  hostname: hostname,
  port: port
});

const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = http.createServer((req, res) => {
    handle(req, res);
  });

  server.on('error', (err) => {
    console.error('[CTRL-Farm Web Server Error]', err);
    process.exit(1);
  });

  server.listen(port, hostname, () => {
    console.log(`[CTRL-Farm Web] Servidor Next.js pronto e escutando na porta ${port}`);
  });
}).catch((err) => {
  console.error('[CTRL-Farm Web Prepare Error]', err);
  process.exit(1);
});
