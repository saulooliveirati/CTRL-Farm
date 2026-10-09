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
- `GET|POST /suppliers`; `PATCH|DELETE /suppliers/:id` — fornecedor com vínculos não pode ser removido.
- `GET|POST /inventory-materials`; `PATCH|DELETE /inventory-materials/:id` — estoque de equipamento auxiliar, insumo e material geral.
- `GET|POST /production`; `PATCH|DELETE /production/:id` — `PATCH` altera status ou corrige consumo concluído; `DELETE` apaga itens não iniciados elegíveis ou arquiva uma produção concluída, preservando o histórico.
- `GET|POST /customers`; `PATCH|DELETE /customers/:id`
- `GET|POST /orders`; `PATCH /orders/:id/cancel`; `DELETE /orders/:id` — exclusão permitida quando não há produção vinculada.

As rotas operacionais só veem dados da empresa do usuário autenticado. Clientes com pedidos, impressoras e filamentos com histórico de produção são protegidos contra exclusão; pedidos e produções concluídas permanecem preservados, podendo ser arquivados da lista operacional. Produções iniciadas não concluídas não podem ser apagadas. Status e validações de domínio estão descritos em [03-banco-de-dados.md](03-banco-de-dados.md).
