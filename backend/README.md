# Controle Financeiro — API

API REST em Express, TypeScript, PostgreSQL e Prisma ORM 7.

## Configuração

Requer Node.js >= 22.12 e PostgreSQL disponível. Na pasta `backend`:

```powershell
npm.cmd ci
Copy-Item .env.example .env
# Configure DATABASE_URL e JWT_SECRET no arquivo .env antes de continuar.
npx.cmd prisma migrate deploy
npm.cmd run prisma:generate
npm.cmd run dev
```

O servidor usa a porta 3333 por padrão. Consulte `/health/ready` para verificar banco e armazenamento. Não sobrescreva um `.env` já configurado ao repetir a instalação.

O frontend permitido por CORS é configurado em `CORS_ORIGIN`; múltiplas origens podem ser separadas por vírgula.

## Verificação

Use `npm test`, `npm run typecheck` e `npm run build` antes de publicar alterações.

Os testes incluem acesso ao banco: use uma base local descartável. O [guia de testes](../docs/TESTES.md) detalha as suítes e o QA adicional em `scripts/qa-api.ts`. Na rodada de 28/09/2026, os 57 testes existentes do backend passaram; o QA adicional identificou quatro defeitos documentados no [relatório](../docs/QA_2026-09-28.md).

## Configuração de ambiente

| Variável | Uso |
| --- | --- |
| `DATABASE_URL` | Conexão PostgreSQL obrigatória |
| `JWT_SECRET` | Chave com pelo menos 32 caracteres; definir segredo exclusivo em produção |
| `PORT` | Porta HTTP; padrão 3333 |
| `NODE_ENV` | `development`, `test` ou `production` |
| `CORS_ORIGIN` | Origens permitidas, separadas por vírgula; padrão `http://localhost:5173` |
| `UPLOAD_DIR` | Armazenamento privado de anexos e fotos; padrão `./uploads` relativo ao processo |

Para criar o administrador inicial, cadastre um usuário e execute `npm run admin:promote -- email@exemplo.com --confirm`. Consulte [operação](../docs/OPERACAO.md) para a execução dentro do container.

## Rotas

A API inclui autenticação e sessões, contas, transferências, cartões e faturas, categorias, lançamentos e anexos, recorrências, orçamentos, metas, previsão, relatórios, avisos, importação CSV, administração e auditoria.

Consulte a [referência completa da API](../docs/API.md). As rotas protegidas usam `Authorization: Bearer <token>`.
