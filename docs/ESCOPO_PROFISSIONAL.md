# Escopo profissional implementado

Este documento registra o escopo funcional do Control Finance. A aplicação é manual e não possui integração com bancos ou administradoras de cartão.

| Área | Entrega |
|---|---|
| Contas e carteiras | Tipos de conta, saldo inicial, saldo calculado, ativação e proteção do histórico |
| Transferências | Origem, destino, situação e preservação do patrimônio total |
| Cartões | Limite, ciclo de fechamento, vencimento, faturas e pagamento por conta |
| Lançamentos | Receitas/despesas, situação, filtros, paginação, forma de pagamento e parcelas |
| Recorrências | Frequências semanais, quinzenais, mensais, anuais e personalizadas |
| Orçamentos | Limite mensal por categoria, consumo pago, pendências e cópia entre meses |
| Previsão | Projeção futura incluindo compromissos e faturas |
| Metas | Valor-alvo, prazo, progresso, aportes e conta de origem |
| Relatórios | Filtros, comparativos, evolução, categorias, contas, cartões, CSV e PDF |
| Importação | CSV brasileiro/ISO, prévia, erros por linha e controle de duplicidade |
| Comprovantes | Upload privado, assinatura binária, hash, limite e download autorizado |
| Avisos | Vencimentos, faturas, orçamento e metas, com leitura e dispensa por usuário |
| Segurança | Senhas fortes, sessões revogáveis, rate limit, recuperação e isolamento por usuário |
| Administração | Usuários, perfis, ativação, senha, bootstrap seguro e auditoria |
| Experiência | Responsividade, PWA, estado offline seguro, teclado, acessibilidade, ordenação alfabética em português, capitalização por palavra, sugestões locais de acentuação e entrada monetária brasileira; observações sem assistência de capitalização, com pendência de preservação dos espaços na API |
| Operação | Health checks, Docker, migrations, CI, backup e restauração protegida |

## Evidências de qualidade

Escopo implementado não equivale a aprovação integral de QA. Em 28/09/2026, passaram 57 testes de backend e 16 de frontend, os dois builds e a validação estática de PWA/acessibilidade. O QA adicional registrou 19 cenários aprovados e quatro falhas em 23 cenários; a validação visual continua pendente. Veja [resultados e reprodução](QA_2026-09-28.md).

- Regras financeiras possuem testes unitários no backend.
- O fluxo HTTP integrado valida cadastro, login, conta inicial, lançamento, dashboard, avisos e isolamento entre usuários.
- O frontend possui testes para CSV, preferências dos avisos, renderização acessível, capitalização, sugestões de acentuação e formatação monetária.
- O workflow de CI cria PostgreSQL temporário, aplica todas as migrations, audita dependências, testa e compila os dois projetos e constrói as imagens.
- O CI bloqueia auditorias com vulnerabilidades de severidade alta ou crítica (`npm audit --audit-level=high`). Isso não é evidência de ausência de vulnerabilidades; a auditoria não foi repetida na rodada de QA de 28/09/2026.

## Verificação local

Use um banco descartável, configure o ambiente e gere o Prisma Client antes dos testes, conforme o [guia de testes](TESTES.md). A sequência abaixo pressupõe essa preparação.

```powershell
Set-Location backend
npm.cmd ci
npm.cmd audit --audit-level=high
npx.cmd prisma validate
npx.cmd prisma migrate status
npm.cmd test
npm.cmd run typecheck
npm.cmd run build

Set-Location ..\frontend
npm.cmd ci
npm.cmd audit --audit-level=high
npm.cmd test
npm.cmd run test:pwa
npm.cmd run typecheck
npm.cmd run build
```

Consulte [API.md](API.md) para as rotas e [OPERACAO.md](OPERACAO.md) para implantação, backups e atualizações.
