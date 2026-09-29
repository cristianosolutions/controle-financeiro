# Control Finance — Frontend

Interface React 19 e TypeScript, com Vite, Lucide React e CSS. Requer Node.js >= 22.12 e a API disponível.

## Instalação local

Na pasta `frontend`:

```powershell
npm.cmd ci
Copy-Item .env.example .env
npm.cmd run dev
```

Não sobrescreva um `.env` já configurado. A interface usa `http://localhost:5173`; `VITE_API_URL` deve apontar para a base da API, incluindo `/api` (padrão `http://localhost:3333/api`). Configure essa origem também no `CORS_ORIGIN` do backend.

## Comandos

| Comando | Finalidade |
| --- | --- |
| `npm run dev` | Servidor de desenvolvimento |
| `npm test` | Testes Vitest |
| `npm run typecheck` | Verificação de tipos |
| `npm run test:pwa` | Validação estática de PWA e requisitos de acessibilidade |
| `npm run build` | TypeScript e build em `dist/` |
| `npm run preview` | Servir o build local para inspeção |

`VITE_API_URL` é resolvida no build; trocar somente o ambiente do container após compilar não modifica o cliente. Consulte [operação](../docs/OPERACAO.md).

## Organização e comportamento

- `src/App.tsx`: sessão, navegação e integração das telas.
- `src/components/`: autenticação, dashboard, contas, cartões, lançamentos, transferências, recorrências, categorias, orçamentos, metas, previsão, relatórios, importação, avisos, segurança e administração.
- `src/lib/`: API, CSV, preferências, valores monetários, ordenação e assistência de escrita.
- `public/`: manifesto, ícones e recursos da PWA.

O token fica em `sessionStorage`. CSV e impressão/PDF são gerados pela interface. A assistência de escrita não deve capitalizar observações; a API ainda remove espaços nas extremidades (QA-03).

A PWA oferece indicação de perda de conexão e página de indisponibilidade. A verificação estática não substitui testes de instalação, atualização, cache e reconexão em navegador real.

## Qualidade

Na rodada de 28/09/2026, passaram 16 testes em sete arquivos, o build e a validação estática de PWA/acessibilidade. Navegação visual e interativa não foi executada por ausência de navegador conectado. Consulte o [guia de testes](../docs/TESTES.md) e o [relatório completo](../docs/QA_2026-09-28.md).
