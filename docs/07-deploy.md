# Ambiente local e implantação

## Executar localmente

Requisitos: Node.js 24+, pnpm, Docker e PostgreSQL.

1. `pnpm install`
2. Copie `.env.example` para `.env`; gere um `JWT_SECRET` forte de pelo menos 32 caracteres.
3. `docker compose up -d postgres redis`
4. `pnpm dlx prisma@6.16.3 migrate deploy`
5. `pnpm dlx prisma@6.16.3 generate`
6. `pnpm dev`

Web: `http://localhost:3000`; API: `http://localhost:3001`; Swagger: `http://localhost:3001/docs`.

## Implantação

O repositório ainda não define ambiente de produção, host, domínio, TLS, backups nem gestão de segredos. Antes de publicar, definir esses pontos, executar as migrations com `prisma migrate deploy`, configurar `CTRL_FARM_API_URL`, HTTPS e cookies seguros, e testar restauração de backup. Não usar o `.env` local nem senhas de desenvolvimento em produção.
