# CTRL+Farm API

API REST construída com NestJS, Prisma e PostgreSQL. O app module registra autenticação, empresas, usuários, impressoras, filamentos, produção, clientes e pedidos.

## Desenvolvimento

Na raiz do monorepo, com PostgreSQL configurado no `.env`:

```bash
pnpm --filter api dev
```

Ou inicie a web e a API juntas com `pnpm dev`. A API escuta na porta `3001`; Swagger fica em `/docs`.

## Validação

```bash
pnpm --filter api build
pnpm --filter api test
pnpm --filter api lint
```

Os endpoints operacionais exigem Bearer JWT. O `companyId` é obtido do usuário autenticado, nunca do corpo enviado pelo cliente.
