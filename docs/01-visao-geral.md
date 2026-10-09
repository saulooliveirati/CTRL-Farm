# CTRL+Farm: visão geral

CTRL+Farm é um sistema web para organizar uma fazenda de impressão 3D, com dados isolados por empresa.

## O que funciona no beta

- Cadastro de empresa e primeiro usuário administrador; login com sessão em cookie HttpOnly.
- Impressoras: cadastro, identificação, localização e status operacional.
- Filamentos: cadastro de bobinas, custo opcional e peso disponível.
- Fornecedores: dados de contato e vínculo com impressoras, bobinas e materiais.
- Materiais e equipamentos: estoque geral de insumos, equipamentos auxiliares, peças, ferramentas e embalagens com saldo mínimo e fornecedor.
- Produção: ordens de trabalho com estados de fila, impressão, pausa, falha, cancelamento e conclusão.
- Clientes e pedidos: registro de contato, quantidade, preço unitário e prazo.
- Rastreio: pedido → produção → impressora e bobina → consumo real; a conclusão baixa o estoque dentro da mesma transação. Tempo ativo é acompanhado e pausas são descontadas; consumo concluído pode ser corrigido e produção problemática arquivada.

## Limites atuais

Um pedido tem no máximo uma ordem de produção vinculada, e essa ordem representa a produção da quantidade inteira do pedido. Endereços, pagamentos, múltiplos itens por pedido, modelos 3D e financeiro ainda não fazem parte do beta.
