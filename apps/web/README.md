# CTRL+Farm Web

Aplicação Next.js do CTRL+Farm. As páginas operacionais ficam no grupo autenticado `(dashboard)` e usam Route Handlers como backend-for-frontend para manter o JWT em cookie HttpOnly.

Na raiz do monorepo, execute `pnpm --filter web dev` ou `pnpm dev` para iniciar web e API. A aplicação web fica em `http://localhost:3000`.

Valide alterações com:

```bash
pnpm --filter web lint
pnpm --filter web build
```
