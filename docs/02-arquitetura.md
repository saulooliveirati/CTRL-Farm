# Arquitetura atual

```text
Navegador
  └─ Next.js (apps/web, :3000)
       ├─ páginas de servidor autenticadas
       ├─ Route Handlers /api/* como BFF
       └─ cookie de sessão HttpOnly
            └─ NestJS REST API (apps/api, :3001)
                 ├─ JWT guard + companyId do token
                 ├─ DTOs validados e serviços por domínio
                 └─ Prisma → PostgreSQL (:5432)
```

## Limites de responsabilidade

- `apps/web`: interface, sessão no navegador e encaminhamento autenticado para a API. O token não é exposto ao JavaScript da página.
- `apps/api`: validação de entrada, autorização e regras de negócio. Cada consulta operacional é filtrada pelo `companyId` do JWT.
- `prisma/`: schema e migrations versionadas são a fonte de verdade do banco.
- `packages/ui`: componentes compartilhados, ainda pequeno no beta.
- Redis está disponível no Compose, mas não é requisito dos fluxos atuais.

Código e nomes do banco ficam em inglês; a interface e mensagens ao usuário ficam em português. Veja [padrões](05-padroes.md) e [endpoints](06-api.md).
