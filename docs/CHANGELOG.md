# Histórico de alterações

As mudanças relevantes são registradas por entrega. Datas usam `YYYY-MM-DD`.

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
