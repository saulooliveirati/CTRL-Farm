# CTRL+Farm

Sistema profissional para gerenciamento de Farms de Impressão 3D.

## Tecnologias

- Next.js
- NestJS
- PostgreSQL
- Prisma
- Docker
- pnpm workspace
- TypeScript
- TailwindCSS

## Beta funcional

O beta atual inclui:

- Cadastro de empresa e autenticação por sessão protegida.
- Gestão de impressoras e status operacional.
- Cadastro de bobinas e controle do peso disponível.
- Cadastro de clientes e pedidos com status operacional.
- Ordens de produção com fila, início, pausa, conclusão e registro de falhas.
- Pedido vinculado diretamente à ordem de produção correspondente.
- Baixa automática do consumo real de filamento ao concluir uma ordem.
- Dados operacionais isolados por empresa.
- Calculadora de preço com custos unitários, perdas, taxas, impostos, margem e histórico de simulações.
- Biblioteca de arquivos 3D e documentos, com versões, tags e vínculo opcional à produção.

## Executar localmente

Pré-requisitos: Node.js 24 ou superior, pnpm e Docker.

1. Instale as dependências: `pnpm install`.
2. Copie `.env.example` para `.env` e gere um `JWT_SECRET` aleatório forte com pelo menos 32 caracteres.
3. Inicie os serviços locais de dados: `docker compose up -d postgres redis`.
4. Aplique as migrações existentes: `pnpm dlx prisma@6.16.3 migrate deploy`.
5. Inicie web e API: `pnpm dev`.

A aplicação web fica em `http://localhost:3000` e a documentação da API em `http://localhost:3001/docs`.

Os arquivos enviados pela biblioteca ficam em `storage/projects`, diretório ignorado pelo Git. Em implantação, configure `CTRL_FARM_STORAGE_DIR` para um volume persistente e compartilhado entre as instâncias da API. O limite atual é de 50 MB por arquivo.

O primeiro acesso é criado pela tela de cadastro. A API é executada na porta 3001 e o Next.js encaminha as chamadas autenticadas pelo backend web. Configure `DATABASE_URL` e um `JWT_SECRET` forte no `.env`; nunca versione esse arquivo.

## Documentação

Consulte o [índice da documentação](docs/README.md) para arquitetura, domínio, banco de dados, endpoints, padrões, roadmap e instruções de contribuição.

## Objetivo

Criar o ERP mais completo para gerenciamento de impressão 3D.

---

Desenvolvido por LuLuKa Art 3D.
