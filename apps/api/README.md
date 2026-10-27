# CTRL+Farm API

API REST construída com NestJS, Prisma e PostgreSQL. O app module registra autenticação, empresas, usuários, impressoras, filamentos, produção, clientes, pedidos e a IA Farm.

## Desenvolvimento

Na raiz do monorepo, com PostgreSQL configurado no `.env`:

```bash
pnpm --filter api dev
```

Ou inicie a web e a API juntas com `pnpm dev`. A API escuta na porta `3001`; Swagger fica em `/docs`.

## Validação

```bash
pnpm --filter api build
pnpm --filter api test
pnpm --filter api lint
```

Os endpoints operacionais exigem Bearer JWT. O `companyId` é obtido do usuário autenticado, nunca do corpo enviado pelo cliente.

## IA Farm (Ollama)

A IA Farm consulta os dados operacionais da empresa autenticada e prepara ações usando os serviços normais da API. Alterações precisam de confirmação explícita no painel; criação/edição/exclusão só podem ser confirmadas por ADMIN ou MANAGER. As credenciais de câmeras e senhas de usuários não são incluídas no contexto enviado ao modelo. Envio de arquivos e cadastro/redefinição da senha RTSP continuam sendo feitos nas páginas próprias para que binários e credenciais não sejam enviados ao modelo.

Configure no `.env` da raiz `OLLAMA_BASE_URL` (padrão `http://127.0.0.1:11434`) e `OLLAMA_MODEL` (padrão `llama3.2:latest`). O modelo precisa estar instalado e o Ollama em execução no host da API. O modelo local processa o resumo dos dados da empresa para responder às consultas.
