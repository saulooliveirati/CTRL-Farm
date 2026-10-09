# Decisões de projeto

Este registro resume decisões que afetam segurança e rastreabilidade. Atualize-o quando uma decisão mudar.

## 1. Isolamento por empresa

Toda entidade operacional possui `companyId`. A API deriva o tenant do JWT do usuário autenticado e inclui esse identificador em cada consulta e mutação. O cliente não escolhe o tenant.

## 2. Sessão web

O Next.js mantém o JWT em cookie HttpOnly, SameSite=Lax e Secure em produção. Route Handlers encaminham pedidos autenticados à API, evitando expor o bearer token ao JavaScript do navegador.

## 3. Pedido e produção no beta

Um pedido pode ter no máximo uma ordem de produção, que representa a produção da quantidade total solicitada. Essa simplificação permite rastrear o fluxo sem impedir evolução futura para itens múltiplos e lotes de produção.

## 4. Consumo de filamento

O estoque só é debitado quando a ordem é concluída, usando o peso real informado. O débito e a mudança de status acontecem na mesma transação; tentativas com estoque insuficiente falham sem registrar conclusão.

## 5. Fornecedores e estoque geral

Fornecedores são registros da empresa e não podem ser removidos enquanto estiverem associados a equipamentos ou materiais. Filamentos mantêm saldo próprio em gramas, vinculado à produção; o estoque geral cobre equipamentos auxiliares, insumos, peças, ferramentas, embalagens e outros materiais, com unidade e limite mínimo.
