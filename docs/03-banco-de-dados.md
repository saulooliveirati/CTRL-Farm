# Banco de dados e relações do domínio

O schema é `prisma/schema.prisma`; toda alteração deve vir acompanhada de uma nova pasta em `prisma/migrations/`. Nunca edite uma migration já aplicada.

## Relações atuais

- `Company` é o tenant raiz. Usuários, impressoras, bobinas, clientes, pedidos e produções pertencem a uma empresa.
- `Customer` possui zero ou mais `CustomerOrder`; documento, quando informado, é único dentro da empresa.
- `CustomerOrder` registra descrição, quantidade, preço unitário, prazo e status. Tem no máximo uma `ProductionJob` vinculada.
- `ProductionJob` aponta para uma impressora, uma bobina e opcionalmente um pedido. Registra peso planejado e peso real.
- `Filament.currentWeightG` é atualizado atomicamente ao concluir uma produção.
- Uma impressora ou bobina referenciada por histórico de produção não pode ser apagada (`Restrict`). Clientes com pedidos também são preservados.

## Ciclo do pedido

`DRAFT` → produção criada e vinculada → `IN_PRODUCTION` quando a produção inicia → `COMPLETED` quando finaliza. Cancelar a produção na fila cancela o pedido vinculado. Pedido sem produção pode ser cancelado diretamente.

## Ciclo da produção

`QUEUED` → `PRINTING` ↔ `PAUSED` → `COMPLETED` / `FAILED` / `CANCELLED`. Uma produção com falha pode ser tentada novamente. A baixa do peso real e a atualização do status são feitas na mesma transação para não deixar estoque e histórico divergentes.

Mais detalhes funcionais: [visão geral](01-visao-geral.md). A validação de escopo por empresa é obrigatória em todo serviço.
