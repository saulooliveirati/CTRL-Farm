# Banco de dados e relações do domínio

O schema é `prisma/schema.prisma`; toda alteração deve vir acompanhada de uma nova pasta em `prisma/migrations/`. Nunca edite uma migration já aplicada.

## Relações atuais

- `Company` é o tenant raiz. Usuários, fornecedores, impressoras, bobinas, materiais, clientes, pedidos e produções pertencem a uma empresa.
- `Supplier` centraliza os dados do fornecedor e pode estar associado a impressoras, bobinas e itens do estoque geral.
- `Printer` registra especificações do equipamento, status, bico, número de extrusoras, horas de uso, imagem e fornecedor opcional.
- `InventoryMaterial` registra equipamentos auxiliares, insumos, peças, ferramentas, embalagens e outros itens com unidade, saldo, estoque mínimo, custo e fornecedor.
- `Customer` possui zero ou mais `CustomerOrder`; documento, quando informado, é único dentro da empresa.
- `CustomerOrder` registra descrição, quantidade, preço unitário, prazo e status. Tem no máximo uma `ProductionJob` vinculada.
- `ProductionJob` aponta para uma impressora, uma bobina e opcionalmente um pedido. Registra peso planejado/real, tempo previsto, início, conclusão e duração ativa acumulada (desconta pausas). Produções concluídas podem ser arquivadas sem perder o histórico.
- `ProjectFile` cataloga arquivos por empresa, projeto, versão, categoria e tags; cada arquivo pode ser vinculado a uma ordem de produção. O binário fica em armazenamento privado, não no banco nem no Git.
- `PricingEstimate` guarda uma fotografia do produto, impressora, tempo, potência, tarifa elétrica, depreciação, mão de obra, taxas, margem ou preço fixo, meios de pagamento, linhas de filamentos e insumos, custo total, preço sugerido e lucro previsto. Cada simulação pertence à empresa autenticada.
- `Camera` guarda identificação, IP local, qualidade RTSP, caminho de publicação WebRTC e credenciais da Conta da câmera cifradas com AES-256-GCM. Os campos cifrados nunca são retornados pela API; as câmeras são isoladas por empresa. `CAMERA_ENCRYPTION_KEY` deve ser preservada para manter as senhas descriptografáveis entre reinícios e atualizações.
- `Filament.currentWeightG` é atualizado atomicamente ao concluir uma produção.
- O estoque geral alerta quando o saldo alcança ou fica abaixo do mínimo; bobinas continuam com controle próprio em gramas, integrado à produção.
- Uma impressora ou bobina referenciada por histórico de produção não pode ser apagada (`Restrict`). Clientes com pedidos e pedidos com produção vinculada também são preservados. A API informa o motivo em vez de expor erro interno.
- Uma produção só pode ser excluída se estiver na fila ou cancelada e nunca tiver iniciado nem registrado consumo; produções iniciadas permanecem como histórico, mesmo canceladas ou com falha.

## Ciclo do pedido

`DRAFT` → produção criada e vinculada → `IN_PRODUCTION` quando a produção inicia → `COMPLETED` quando finaliza. Cancelar a produção cancela o pedido vinculado. Pedido sem produção pode ser cancelado ou excluído diretamente.

## Ciclo da produção

`QUEUED` → `PRINTING` ↔ `PAUSED` → `COMPLETED` / `FAILED` / `CANCELLED`. Produções na fila, imprimindo ou pausadas podem ser canceladas. Uma produção com falha pode ser tentada novamente. A baixa do peso real e a atualização do status são feitas na mesma transação. Corrigir o consumo de uma produção concluída acerta apenas a diferença no estoque, também dentro de uma transação.

Mais detalhes funcionais: [visão geral](01-visao-geral.md). A validação de escopo por empresa é obrigatória em todo serviço.
