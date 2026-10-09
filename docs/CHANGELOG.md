# Histórico de alterações

As mudanças relevantes são registradas por entrega. Datas usam `YYYY-MM-DD`.

## 2026-10-09 — Exclusões seguras e cancelamento da produção

### Adicionado

- Cancelamento de ordens de produção em andamento e pausadas.
- Exclusão de produções sem início ou consumo registrado e de pedidos ainda sem produção vinculada.
- Mensagens 409 claras quando impressoras, bobinas, pedidos ou produções têm histórico que precisa ser preservado.

### Corrigido

- Falhas ao excluir impressoras e bobinas agora informam que o histórico de produção impede a remoção, em vez de retornar erro interno.

## 2026-10-09 — Beta operacional

### Adicionado

- Cadastro de empresa, login JWT, rota de sessão e cookie web HttpOnly.
- CRUD de impressoras com estados, escopo por empresa e tela web.
- CRUD de bobinas de filamento e saldo em gramas.
- Ordens de produção com fila, pausa, conclusão, falha e retry.
- Baixa transacional do consumo real, atualização de estado da impressora e indicadores do dashboard.
- Clientes e pedidos com contato, preço, prazo e ligação direta da produção ao pedido.
- Migrações versionadas para impressoras, filamentos, produção, clientes e pedidos.
- Documentação de arquitetura, domínio, API, padrões, roadmap e execução local.

### Corrigido

- Hidratação do elemento raiz diante de atributos injetados por extensões do navegador, como `data-lt-installed` (LanguageTool). A supressão fica restrita ao `<html>` e não esconde divergências em componentes internos.
