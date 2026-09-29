# Testes e QA

Use Node.js >= 22.12 e PostgreSQL com um banco descartável dedicado. Os testes de integração usam o `DATABASE_URL` configurado e executam gravações reais; não use a base de produção.

## Preparação

Na raiz do repositório, após criar o banco de testes:

```powershell
Set-Location backend
npm.cmd ci
Copy-Item .env.example .env
# Edite .env: DATABASE_URL deve apontar para o banco descartável.
# Defina JWT_SECRET e mantenha CORS_ORIGIN=http://localhost:5173.
npx.cmd prisma generate
npx.cmd prisma migrate deploy
npm.cmd test
npm.cmd run typecheck
npm.cmd run build

Set-Location ..\frontend
npm.cmd ci
Copy-Item .env.example .env
npm.cmd test
npm.cmd run typecheck
npm.cmd run test:pwa
npm.cmd run build
```

Os comandos `Copy-Item` são apenas para a primeira configuração; preserve arquivos `.env` existentes. Use `npm audit --audit-level=high` em cada projeto para a checagem de dependências feita pelo CI.

## QA adicional da API

Em dois terminais, inicie os servidores usando o mesmo ambiente de teste:

```powershell
# Terminal 1, a partir da raiz
Set-Location backend
npm.cmd run dev
```

```powershell
# Terminal 2, a partir da raiz
Set-Location frontend
npm.cmd run dev -- --host 127.0.0.1
```

Em um terceiro terminal:

```powershell
Set-Location backend
npx.cmd tsx scripts/qa-api.ts
```

O roteiro exige API em `localhost:3333` e frontend em `127.0.0.1:5173`. Testa os fluxos com Supertest e banco real; apenas readiness e disponibilidade do HTML são verificadas pelos servidores em execução. Os usuários têm identificadores exclusivos por execução; um usuário temporário recebe papel administrativo para exercitar as rotas protegidas. O bloco `finally` remove os dados e arquivos desses usuários.

O resultado é escrito em `docs/QA_API_RESULTS.json`; arquive a evidência antes de repetir caso precise preservar uma rodada. O comando retorna código 1 se algum cenário falhar. As quatro falhas de 28/09/2026 permanecem documentadas em [QA_2026-09-28.md](QA_2026-09-28.md); esse código de saída é esperado enquanto elas não forem corrigidas.

## Cobertura e limites

| Camada | Resultado local em 28/09/2026 |
| --- | --- |
| Backend existente | 57 testes aprovados / 15 arquivos |
| Frontend existente | 16 testes aprovados / 7 arquivos |
| API adicional | 19 cenários aprovados, 4 reprovados / 23 cenários |
| Compilação | Backend e frontend aprovados |
| PWA/acessibilidade | Verificação estática aprovada |
| Navegador | Não executado; nenhum navegador conectado |

O CI em `.github/workflows/ci.yml` executa instalação, auditoria, Prisma, migrations em PostgreSQL temporário, tipagem/testes/build do backend, testes/PWA/build do frontend e construção de imagens Docker. Não inclui o roteiro adicional nem testes de navegador.

## QA manual pendente

- Cadastro, login, expiração de sessão e mensagens de erro pela interface.
- CRUD e filtros nas telas, conferindo saldos, faturas, orçamento e metas.
- Layout desktop/mobile, diálogos, foco e navegação por teclado.
- Importação CSV, download de relatórios, impressão/PDF e anexos.
- Instalação e atualização da PWA, perda de conexão e reconexão.
- Fluxos de administração e recuperação pela interface.

Carga, concorrência, restauração de backup e auditoria completa de segurança exigem rodadas específicas. Não foi medida cobertura percentual de linhas/branches.
