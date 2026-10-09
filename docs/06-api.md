# API REST

Base local: `http://localhost:3001`. Swagger: `/docs`. Respostas bem-sucedidas usam o envelope `{ success, timestamp, data }`; exceções seguem o filtro HTTP global.

## Público

- `GET /auth/health`
- `POST /auth/register` — empresa + primeiro administrador.
- `POST /auth/login` — token JWT consumido pelo BFF web.

## Autenticado (Bearer JWT)

- `GET /auth/me`
- `GET /companies`
- `GET|POST /printers`; `PATCH|DELETE /printers/:id`
- `GET|POST /filaments`; `PATCH|DELETE /filaments/:id`
- `GET|POST /production`; `PATCH /production/:id`
- `GET|POST /customers`; `PATCH|DELETE /customers/:id`
- `GET|POST /orders`; `PATCH /orders/:id/cancel`

As rotas operacionais só veem dados da empresa do usuário autenticado. Clientes com pedidos, impressoras e filamentos com histórico de produção são protegidos contra exclusão. Status e validações de domínio estão descritos em [03-banco-de-dados.md](03-banco-de-dados.md).
