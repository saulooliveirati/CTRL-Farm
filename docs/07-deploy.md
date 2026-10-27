# Ambiente local e implantação

## Executar localmente

Requisitos: Node.js 24+, pnpm, Docker e PostgreSQL.

1. `pnpm install`
2. Copie `.env.example` para `.env`; gere um `JWT_SECRET` forte, uma `MEDIAMTX_API_PASSWORD` e uma `CAMERA_ENCRYPTION_KEY` distintas. Preserve a `CAMERA_ENCRYPTION_KEY` para conseguir ler credenciais de câmeras já salvas.
3. `docker compose up -d postgres redis mediamtx`
4. `pnpm dlx prisma@6.16.3 migrate deploy`
5. `pnpm dlx prisma@6.16.3 generate`
6. `pnpm dev`

Web: `http://localhost:3000`; API: `http://localhost:3001`; Swagger: `http://localhost:3001/docs`.

Arquivos de projeto são armazenados em `storage/projects` por padrão. Em produção, defina `CTRL_FARM_STORAGE_DIR` para um volume persistente com acesso restrito à API e inclua esse volume na rotina de backup; o banco guarda apenas metadados. Para múltiplas instâncias, todas precisam acessar o mesmo armazenamento persistente.

O MediaMTX é necessário para câmeras Tapo: a API configura as origens RTSP e o navegador recebe o vídeo por WebRTC. No ambiente local, as portas de controle e vídeo estão limitadas a `127.0.0.1`; não publique essas portas nem a porta RTSP 554 na internet. Para outro host ou clientes em rede, planeje autenticação, HTTPS e endereços ICE/WebRTC antes de alterar os bindings.

## Implantação

O repositório ainda não define ambiente de produção, host, domínio, TLS, backups nem gestão de segredos. Antes de publicar, definir esses pontos, executar as migrations com `prisma migrate deploy`, configurar `CTRL_FARM_API_URL`, HTTPS e cookies seguros, e testar restauração de backup. Não usar o `.env` local nem senhas de desenvolvimento em produção.
