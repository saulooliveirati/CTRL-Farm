# CTRL+Farm 🖨️

Plataforma Industrial e Sistema ERP profissional para gerenciamento de Farms e Oficinas de Impressão 3D.

[![Download Windows](https://img.shields.io/badge/Download-Windows%20(.exe)-0078D6?style=for-the-badge&logo=windows&logoColor=white)](https://github.com/saulooliveirati/CTRL-Farm/releases/latest/download/CTRL-Farm-Setup.exe)
[![Download macOS](https://img.shields.io/badge/Download-macOS%20(.dmg)-000000?style=for-the-badge&logo=apple&logoColor=white)](https://github.com/saulooliveirati/CTRL-Farm/releases/latest/download/CTRL-Farm.dmg)
[![Website Oficial](https://img.shields.io/badge/Website-GitHub%20Pages-20c997?style=for-the-badge&logo=githubpages&logoColor=black)](https://saulooliveirati.github.io/CTRL-Farm/)
[![Status](https://img.shields.io/badge/Release-v1.0.0--Beta-emerald?style=for-the-badge)](https://github.com/saulooliveirati/CTRL-Farm/releases)

---

## 📥 Download dos Instaladores Oficiais (Desktop)

O CTRL-Farm opera nativamente em computadores pessoais e servidores de farm com baixíssimo consumo de memória RAM (< 40 MB) e zero dependência de Docker ou configurações manuais:

| Sistema Operacional | Formato | Arquitetura | Link de Download Direto |
| :--- | :--- | :--- | :--- |
| **Microsoft Windows** | `.exe` | Windows 10 e 11 (64-bit) | 🔗 [Baixar CTRL-Farm-Setup.exe](https://github.com/saulooliveirati/CTRL-Farm/releases/latest/download/CTRL-Farm-Setup.exe) |
| **Apple macOS** | `.dmg` | Apple Silicon (M1/M2/M3/M4) & Intel | 🔗 [Baixar CTRL-Farm.dmg](https://github.com/saulooliveirati/CTRL-Farm/releases/latest/download/CTRL-Farm.dmg) |

> 📖 **Guia Passo a Passo:** Consulte o [Guia de Instalação e Ativação](INSTRUCOES-INSTALACAO.md) para instruções detalhadas.

---

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
- Gestão de impressoras e status operacional com telemetria Klipper/Moonraker e OctoPrint.
- Cadastro de bobinas e controle do peso disponível.
- Cadastro de clientes e pedidos com status operacional.
- Ordens de produção com fila, início, pausa, conclusão e registro de falhas.
- Pedido vinculado diretamente à ordem de produção correspondente.
- Baixa automática do consumo real de filamento ao concluir uma ordem.
- Dados operacionais estritamente isolados por empresa (Multi-Tenant).
- Calculadora de preço com custos unitários, perdas, taxas, impostos, margem e histórico de simulações.
- Biblioteca de arquivos 3D e documentos, com versões, tags e vínculo opcional à produção.
- Módulo de Suporte Híbrido Nível 1 (IA) + Nível 2 Humano (Sistema ADM) com Acesso Remoto Assistido via WebRTC.

## Executar localmente

Pré-requisitos: Node.js 24 ou superior, pnpm e Docker.

1. Instale as dependências: `pnpm install`.
2. Copie `.env.example` para `.env` e configure suas chaves.
3. Inicie os serviços locais de dados: `docker compose up -d postgres redis`.
4. Aplique as migrações existentes: `pnpm dlx prisma@6.16.3 migrate deploy`.
5. Inicie web e API: `pnpm dev`.

A aplicação web fica em `http://localhost:3000` e a documentação da API em `http://localhost:3001/docs`.

## Documentação

Consulte o [índice da documentação](docs/README.md) para arquitetura, domínio, banco de dados, endpoints, padrões, roadmap e instruções de contribuição.

## Objetivo

Criar o ERP mais completo para gerenciamento de impressão 3D.

---

Desenvolvido por Saulo Oliveira.
