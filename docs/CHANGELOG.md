# Histórico de alterações

As mudanças relevantes são registradas por entrega. Datas usam `YYYY-MM-DD`.

## 2026-10-10 — Monitoramento Tapo ao vivo

### Adicionado

- Página Ao Vivo com cadastro, edição, remoção e seleção de câmeras Tapo.
- RTSP local convertido para WebRTC pelo MediaMTX, configurado sob demanda; controle e player limitados a loopback no Docker Compose.
- Credenciais de câmera cifradas no banco, escopo por empresa e rotas de reconexão.
- Guia de configuração da Conta da câmera, rede, qualidade e limitações de modelos alimentados por bateria.

## 2026-10-10 — Atualização visual e navegação responsiva

### Melhorado

- Tema escuro unificado, superfícies, formulários, tabelas, estados e contrastes consistentes em todas as páginas autenticadas.
- Barra lateral com modo compacto no desktop e painel recolhível em telas móveis.
- Dashboard reorganizado em indicadores operacionais, disponibilidade de equipamentos, produção ativa, pedidos recentes e atalhos.

## 2026-10-10 — Catálogo visual de impressoras

### Adicionado

- Listagem em cartões com busca, filtros por fabricante e status, e alteração rápida de status.
- Cadastro e edição com bico, extrusoras, horas acumuladas, imagem, fornecedor, localização e observações.
- Fotos por URL ou upload comprimido no navegador, com prévia nos cartões.

## 2026-10-10 — Calculadora Express

### Adicionado

- Modo Express na Precificação com seleção de impressora, bobinas, consumo, insumos e custos operacionais.
- Cálculo por margem ou preço fixo, taxas de marketplace informadas manualmente e opções de pagamento.
- Resumo rápido de custos, investimento, preço e lucro, com salvamento no mesmo histórico da calculadora completa.
- Reutilização da prévia, exportação do orçamento e impressão/salvamento em PDF.

## 2026-10-09 — Precificação e biblioteca de projetos

### Adicionado

- Calculadora por unidade com custo de material, máquina/energia, mão de obra, custos adicionais, perda, taxas, imposto e margem alvo.
- Detalhamento de múltiplos filamentos e insumos do estoque, impressora e custos calculados por tempo de uso; margem sobre venda ou markup sobre custo.
- Prévia, impressão/salvamento em PDF pelo navegador, exportação do orçamento completo e reutilização de simulações salvas.
- Preço arredondado para cima ao centavo para não ficar abaixo do custo calculado; histórico de simulações isolado por empresa.
- Biblioteca de arquivos com projeto, versão, categoria, tags, busca e vínculo opcional à produção.
- Upload e download autenticados, limite de 50 MB e formatos permitidos; binários ficam no armazenamento privado configurável e ignorado pelo Git.

## 2026-10-09 — Fornecedores e estoque geral

### Adicionado

- Cadastro e manutenção de fornecedores, com documento e meios de contato.
- Vínculo opcional de fornecedor a impressoras/equipamentos e bobinas de filamento.
- Estoque geral de equipamentos auxiliares, consumíveis, peças, ferramentas, embalagens e outros materiais, com saldo, unidade, custo e alerta de estoque mínimo.

## 2026-10-09 — Tempo e revisão da produção

### Adicionado

- Duração prevista informada ao criar produção e acompanhamento do tempo ativo em tempo real, com pausas descontadas.
- Registro de início e conclusão junto ao equipamento selecionado.
- Correção posterior do consumo concluído, ajustando somente a diferença no saldo da bobina.
- Arquivamento de produção concluída com problema, retirando-a da lista operacional sem apagar seu histórico.

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

