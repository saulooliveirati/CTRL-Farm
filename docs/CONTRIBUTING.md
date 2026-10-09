# Contribuindo com o CTRL+Farm

## Ambiente

- Node.js 24+, pnpm, Docker e PostgreSQL.
- Configure `DATABASE_URL` e `JWT_SECRET` em `.env`; não adicione segredos ao Git.
- `docker compose up -d postgres redis` inicia os serviços locais.
- `pnpm dlx prisma@6.16.3 migrate deploy` aplica migrations versionadas; `pnpm dlx prisma@6.16.3 generate` gera Prisma Client.
- `pnpm dev` inicia a web e a API juntas.

## Validação antes de concluir

```bash
pnpm --filter api build
pnpm --filter api test
pnpm --filter api lint
pnpm --filter web lint
pnpm --filter web build
```

## Migrations

Atualize `prisma/schema.prisma`, crie uma nova pasta `prisma/migrations/<timestamp>_<nome>/migration.sql`, aplique-a localmente e inclua schema e migration no mesmo commit. Nunca reescreva migration já aplicada em ambiente compartilhado.

## Convenções

- Código e nomes no banco em inglês; interface em português.
- Módulos Nest ficam em `apps/api/src/<modulo>`; páginas Next em `apps/web/app/(dashboard)` e componentes em `apps/web/components`.
- Toda consulta ou escrita operacional deve filtrar pelo `companyId` do JWT.
- Use DTOs validados, documentação Swagger e testes unitários para regras de domínio.
- Use Conventional Commits, por exemplo `feat(orders): link orders to production`.

Veja o [índice da documentação](README.md) e os padrões em [05-padroes.md](05-padroes.md).
