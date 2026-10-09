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
- `GET|POST /production`; `PATCH|DELETE /production/:id` — exclusão permitida apenas para produção na fila ou cancelada sem início/consumo registrado.
- `GET|POST /customers`; `PATCH|DELETE /customers/:id`
- `GET|POST /orders`; `PATCH /orders/:id/cancel`; `DELETE /orders/:id` — exclusão permitida quando não há produção vinculada.

As rotas operacionais só veem dados da empresa do usuário autenticado. Clientes com pedidos, impressoras e filamentos com histórico de produção são protegidos contra exclusão; pedidos e produções com histórico vinculado também são preservados. Nesses casos, a API retorna conflito (409) com orientação para manter os rastros operacionais. Produções em fila, imprimindo ou pausadas podem ser canceladas conforme suas transições; produções iniciadas não podem ser apagadas. Status e validações de domínio estão descritos em [03-banco-de-dados.md](03-banco-de-dados.md).
