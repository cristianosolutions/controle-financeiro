# Controle Financeiro — API

API REST em Express, TypeScript, PostgreSQL e Prisma ORM 7.

## Configuração

1. Copie `.env.example` para `.env` e informe `DATABASE_URL` e `JWT_SECRET`.
2. Aplique as migrations com `npx prisma migrate deploy`.
3. Gere o client com `npm run prisma:generate`.
4. Inicie com `npm run dev`.

O frontend permitido por CORS é configurado em `CORS_ORIGIN`; múltiplas origens podem ser separadas por vírgula.

## Verificação

Use `npm test`, `npm run typecheck` e `npm run build` antes de publicar alterações.

## Rotas

A API inclui autenticação e sessões, contas, transferências, cartões e faturas, categorias, lançamentos e anexos, recorrências, orçamentos, metas, previsão, relatórios, avisos, importação CSV, administração e auditoria.

Consulte a [referência completa da API](../docs/API.md). As rotas protegidas usam `Authorization: Bearer <token>`.
