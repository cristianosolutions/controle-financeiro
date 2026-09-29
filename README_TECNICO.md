# Control Finance — Documentação técnica

Referência da arquitetura da versão declarada `1.0.1`, revisada em 28/09/2026. Para instalação, consulte o [README](README.md); para todos os guias, consulte o [índice](docs/README.md).

## Arquitetura

```text
Navegador: React + Vite
        │ HTTP/JSON e multipart; Authorization: Bearer
        ▼
API: Express + Zod + autenticação por sessão/JWT
        │ Prisma Client + adapter PostgreSQL
        ▼
PostgreSQL                 Armazenamento privado em UPLOAD_DIR
```

Desenvolvimento: frontend na porta 5173 e API na 3333. Docker: Nginx publica o frontend na 8080, API na 3333 e PostgreSQL permanece na rede interna. A URL da API é incorporada ao frontend no build.

| Caminho | Responsabilidade |
| --- | --- |
| `backend/src/app.ts` | Middlewares, health checks e roteamento |
| `backend/src/server.ts` | Inicialização HTTP |
| `backend/src/config/env.ts` | Validação das variáveis de ambiente |
| `backend/src/routes/` | Contratos e operações dos recursos |
| `backend/src/middleware/` | Autenticação, administração, auditoria e tratamento de erros |
| `backend/src/lib/` | Regras financeiras, segurança, anexos e Prisma |
| `backend/src/scripts/promote-admin.ts` | Promoção explícita do administrador inicial |
| `backend/prisma/schema.prisma` | Modelos e relações persistidas |
| `backend/prisma/migrations/` | Evolução versionada do banco |
| `backend/generated/prisma/` | Client gerado, não versionado |
| `backend/scripts/qa-api.ts` | Roteiro adicional de QA com banco real |
| `frontend/src/App.tsx` | Sessão, navegação e composição das telas |
| `frontend/src/components/` | Telas, formulários e componentes de interface |
| `frontend/src/lib/` | Cliente HTTP, CSV e utilitários de apresentação |
| `frontend/public/` | Manifesto, ícones, service worker e página offline |
| `.github/workflows/ci.yml` | Verificações de integração contínua |

## Persistência e regras financeiras

O banco usa UUIDs, timestamps e valores monetários `Decimal(14,2)`. A serialização de campos Decimal pode produzir strings; agregações calculadas pela aplicação normalmente retornam números.

| Grupo | Modelos principais |
| --- | --- |
| Identidade | `User`, `AuthSession`, `PasswordResetToken`, `AuditLog` |
| Movimentação | `Account`, `Category`, `Transaction`, `Transfer` |
| Crédito | `CreditCard`, `CardInvoicePayment` |
| Planejamento | `RecurringTransaction`, `Budget`, `FinancialGoal`, `GoalContribution` |
| Arquivos | `TransactionAttachment`; foto referenciada por `User.avatarStoredName` |

O saldo de uma conta parte do saldo inicial, soma receitas recebidas, subtrai despesas pagas fora do cartão, pagamentos de fatura e aportes em metas, e aplica transferências concluídas até a data atual. Transferências internas preservam a soma dos saldos. Compras no cartão são agrupadas por fechamento/vencimento; o débito em conta ocorre pelo pagamento da fatura.

As situações persistidas de lançamento são `PENDING`, `PAID`, `RECEIVED` e `CANCELED`. `OVERDUE` é calculada para pendências vencidas. Parcelas distribuem o total em centavos e compartilham um identificador de grupo. Excluir uma ocorrência recorrente cancela o lançamento para impedir que a materialização o recrie.

Consultas de lançamentos, recorrências e previsão podem gerar ocorrências futuras no banco. A importação interpreta nomes e valores de linhas CSV convertidas em JSON, valida referências do usuário e utiliza fingerprints para detectar duplicidades.

A implementação atual possui uma inconsistência em compras de faturas pagas: excluir a compra pode ocultar a fatura mantendo seu pagamento no saldo. Veja QA-01 no [relatório](docs/QA_2026-09-28.md).

## Autenticação e autorização

Senhas são armazenadas com bcrypt. O JWT identifica usuário e sessão, com validade de sete dias. Cada requisição autenticada confere a sessão persistida, revogação, expiração e ativação do usuário. Rotas administrativas também exigem perfil `ADMIN`.

O frontend usa `sessionStorage` para o token e envia `Authorization: Bearer`. Logout revoga a sessão atual; alteração de senha revoga as outras sessões; recuperação por código revoga as sessões do usuário. Códigos administrativos de recuperação têm validade de 30 minutos e são de uso único.

O bootstrap exige um usuário já cadastrado e confirmação explícita no comando. Não há administrador ou senha padrão. Variáveis reais, senhas e tokens não devem entrar no versionamento; exemplos usam apenas placeholders.

## Interface e arquivos

As telas cobrem dashboard, contas, transferências, cartões, lançamentos, categorias, recorrências, orçamentos, metas, previsão, relatórios, importação, avisos, segurança e administração. Relatórios exportam CSV e usam impressão do navegador para PDF.

A interface oferece ordenação nominal em português, assistência local de acentuação e entrada monetária brasileira. Observações são excluídas da assistência de capitalização, mas a API ainda aplica trim nas extremidades (QA-03).

Comprovantes aceitam PDF, PNG, JPEG e WebP, até 5 MB e cinco anexos por lançamento. Fotos de perfil aceitam os formatos de imagem até 2 MB. Arquivos ficam em armazenamento privado; o backend valida assinatura binária e controla acesso. Faça backup do banco e do diretório de uploads, que também contém fotos de perfil.

O service worker é registrado no build de produção. Ele mantém recursos estáticos e trata navegação offline; requisições autenticadas, caminhos `/api` e origens externas são excluídos do cache pelo código. A inspeção desse código não substitui validação em navegador real.

## Configuração, operação e qualidade

Consulte [backend](backend/README.md) e [frontend](frontend/README.md) para comandos e variáveis; [API](docs/API.md) para contratos; [operação](docs/OPERACAO.md) para Docker e backups; [testes](docs/TESTES.md) para reprodução.

Em 28/09/2026, passaram 57 testes existentes do backend, 16 do frontend, os builds e a validação estática de PWA/acessibilidade. O QA adicional teve 19 cenários aprovados e quatro falhas. A validação visual/interativa não foi executada por ausência de navegador conectado. Carga, concorrência e restauração de backup não foram homologadas nessa rodada.

As quatro falhas conhecidas e os limites estão no [relatório de QA](docs/QA_2026-09-28.md). A suíte adicional não faz parte do workflow atual; CI aprovado não implica sua aprovação.
