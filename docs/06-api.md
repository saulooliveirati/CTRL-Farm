# API REST

Base local: `http://localhost:3001`. Swagger: `/docs`. Respostas bem-sucedidas usam o envelope `{ success, timestamp, data }`; exceções seguem o filtro HTTP global.

## Público

- `GET /auth/health`
- `POST /auth/register` — empresa + primeiro administrador.
- `POST /auth/login` — token JWT consumido pelo BFF web.

## Autenticado (Bearer JWT)

- `GET /auth/me`
- `GET /companies`
- `GET|POST /printers`; `PATCH|DELETE /printers/:id` — cadastro, especificações, status e imagem dos equipamentos.
- `GET|POST /filaments`; `PATCH|DELETE /filaments/:id`
- `GET|POST /suppliers`; `PATCH|DELETE /suppliers/:id` — fornecedor com vínculos não pode ser removido.
- `GET|POST /inventory-materials`; `PATCH|DELETE /inventory-materials/:id` — estoque de equipamento auxiliar, insumo e material geral.
- `GET|POST /pricing-estimates`; `DELETE /pricing-estimates/:id` — calcula e mantém simulações por unidade, com preço baseado em margem/markup ou preço fixo e opções de pagamento.
- `GET|POST /project-files`; `GET /project-files/:id/download`; `DELETE /project-files/:id` — arquivos privados da empresa; `POST` recebe `multipart/form-data`, com arquivo de até 50 MB.
- `GET|POST /production`; `PATCH|DELETE /production/:id` — `PATCH` altera status ou corrige consumo concluído; `DELETE` apaga itens não iniciados elegíveis ou arquiva uma produção concluída, preservando o histórico.
- `GET|POST /customers`; `PATCH|DELETE /customers/:id`
- `GET|POST /orders`; `PATCH /orders/:id/cancel`; `DELETE /orders/:id` — exclusão permitida quando não há produção vinculada.

As rotas operacionais só veem dados da empresa do usuário autenticado. Clientes com pedidos, impressoras e filamentos com histórico de produção são protegidos contra exclusão; pedidos e produções concluídas permanecem preservados, podendo ser arquivados da lista operacional. Produções iniciadas não concluídas não podem ser apagadas. Status e validações de domínio estão descritos em [03-banco-de-dados.md](03-banco-de-dados.md).

## Monitoramento ao vivo

- `GET|POST /cameras`; `PATCH|DELETE /cameras/:id`; `POST /cameras/:id/reconnect` — cadastro por empresa de câmera Tapo com IP IPv4 privado, conta RTSP e seleção entre `stream1` (alta) e `stream2` (padrão). Senhas são cifradas com AES-256-GCM usando chave derivada de `JWT_SECRET`, não são devolvidas pela API e podem ser atualizadas sem exibir o valor atual.
- A ponte MediaMTX recebe a fonte RTSP por conexão TCP sob demanda e disponibiliza leitura WebRTC ao navegador. A senha de administração da API MediaMTX fica em `MEDIAMTX_API_PASSWORD`; a porta de controle e o player do Docker ficam publicados apenas em loopback por padrão.
- Câmeras devem estar na rede local e usar IP privado IPv4. A Conta da câmera do app Tapo é separada da conta de usuário TP-Link. O servidor do CTRL+Farm precisa conseguir alcançar a porta RTSP 554 da câmera.
