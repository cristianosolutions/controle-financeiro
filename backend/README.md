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

- `GET /health`
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `GET|POST /api/categories`
- `PUT|DELETE /api/categories/:id`
- `GET|POST /api/transactions`
- `PUT|DELETE /api/transactions/:id`
- `GET /api/dashboard/summary?month=2026-08`

As rotas protegidas usam `Authorization: Bearer <token>`.
