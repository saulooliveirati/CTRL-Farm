# Padrões de desenvolvimento

- Monorepo pnpm; `apps/api` contém NestJS e `apps/web` contém Next.js.
- Código e banco em inglês; interface em português. Arquivos em kebab-case, classes em PascalCase, variáveis em camelCase.
- Cada módulo da API possui controller, service, DTOs e module. Documente as rotas com Swagger.
- Valide entrada com class-validator e `ValidationPipe` global, mantendo `whitelist` e `forbidNonWhitelisted`.
- Nunca aceite `companyId` do corpo ou query string para escolher tenant; use o usuário autenticado.
- Use transação quando uma operação altera mais de uma entidade de negócio.
- Não retorne hashes de senha, JWT ou outros segredos em respostas de cadastro.
- Use Conventional Commits (`feat`, `fix`, `docs`, `test`, `chore`), com escopo opcional.

Consulte [contribuição](CONTRIBUTING.md) para validação local e migrations.
