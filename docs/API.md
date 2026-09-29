# API do Control Finance

Referência resumida da API REST utilizada pelo frontend. A URL local padrão é `http://localhost:3333/api`.

As tabelas de recursos usam caminhos relativos a `/api`; a tabela de saúde e rotas públicas mostra caminhos completos. Revisão documental: 28/09/2026. Consulte as [limitações confirmadas no QA](QA_2026-09-28.md).

## Autenticação e formato

As rotas protegidas recebem `Authorization: Bearer <token>`. Corpos e respostas usam JSON, exceto upload e download de anexos. Erros seguem o formato:

```json
{ "message": "Descrição do erro" }
```

Erros de validação também podem incluir `issues`. Datas são enviadas em ISO 8601 e IDs usam UUID. Valores monetários são armazenados com duas casas decimais; campos Prisma `Decimal` podem ser serializados como strings nas respostas, enquanto totais calculados são números. O frontend aceita valores no padrão brasileiro (por exemplo, `1.250,75`) e os converte para número antes de enviar o JSON.

Criações normalmente retornam 201; consultas/edições, 200; exclusões sem conteúdo, 204. Autenticação inválida retorna 401; falta de permissão, 403; recurso ausente, 404; duplicidade tratada, 409; validação, 422. JSON malformado atualmente retorna 500 indevidamente (QA-04).

## Rotas públicas e saúde

| Método | Rota | Finalidade |
|---|---|---|
| `GET` | `/health` | Verificação simples do serviço |
| `GET` | `/health/live` | Processo ativo e tempo de execução |
| `GET` | `/health/ready` | Disponibilidade do banco e armazenamento |
| `POST` | `/api/auth/register` | Criar uma conta |
| `POST` | `/api/auth/login` | Autenticar e abrir sessão |
| `POST` | `/api/auth/reset-password` | Redefinir senha com código temporário |

## Sessão e segurança

| Método | Rota | Finalidade |
|---|---|---|
| `GET` | `/auth/me` | Usuário autenticado |
| `POST` | `/auth/logout` | Revogar a sessão atual |
| `GET` | `/auth/sessions` | Dispositivos conectados |
| `DELETE` | `/auth/sessions/:id` | Revogar uma sessão |
| `PUT` | `/auth/password` | Alterar a própria senha |
| `GET` | `/auth/avatar` | Obter a foto privada do usuário autenticado |
| `PUT` | `/auth/avatar` | Enviar foto via multipart, campo `file` |
| `DELETE` | `/auth/avatar` | Remover a foto |

Fotos aceitam PNG, JPEG e WebP, até 2 MB. Senhas exigem de 8 a 72 caracteres, incluindo letra minúscula, maiúscula e número. Sessões expiram em sete dias. O código administrativo de recuperação vale por 30 minutos e é de uso único. Cadastro, login e recuperação compartilham limite de 20 requisições por janela de 15 minutos por chave do limitador.

## Recursos financeiros

| Recurso | Operações principais |
|---|---|
| `/accounts` | Listar, criar, editar e excluir/desativar contas e carteiras |
| `/transfers` | Listar, criar, editar e excluir transferências entre contas |
| `/cards` | Gerenciar cartões, consultar faturas, pagar e desfazer pagamento |
| `/categories` | Gerenciar categorias de receita e despesa |
| `/transactions` | Consultar com filtros/paginação, criar, editar e excluir lançamentos; ocorrências recorrentes excluídas são canceladas para não serem recriadas |
| `/recurrences` | Gerenciar regras recorrentes e materializar ocorrências futuras |
| `/budgets` | Gerenciar orçamentos mensais e copiar para outro mês |
| `/goals` | Gerenciar metas e seus aportes |

### Operações financeiras específicas

| Método | Rota | Dados principais |
| --- | --- | --- |
| `GET/POST` | `/accounts`, `/cards`, `/categories`, `/transfers`, `/recurrences`, `/goals` | Listagem e criação do recurso |
| `PUT/DELETE` | `/<recurso>/:id` | Edição e exclusão dos recursos acima |
| `GET/POST` | `/transactions` | Listagem paginada e criação, com `installments` entre 1 e 60 |
| `PUT/DELETE` | `/transactions/:id` | Edição e exclusão/cancelamento |
| `GET` | `/cards/:id/invoices` | Cartão e lista de faturas |
| `POST` | `/cards/:id/invoices/:referenceMonth/pay` | `accountId`, `paidAt`; mês no formato `AAAA-MM` |
| `DELETE` | `/cards/:id/invoices/:referenceMonth/payment` | Estornar pagamento |
| `GET` | `/budgets?month=AAAA-MM` | Orçamentos e progresso do mês |
| `POST` | `/budgets` | `month`, `categoryId`, `amount`; cria ou atualiza o limite |
| `POST` | `/budgets/copy` | `fromMonth`, `toMonth`; preserva limites já existentes no destino |
| `DELETE` | `/budgets/:id` | Excluir orçamento |
| `POST` | `/goals/:id/contributions` | `amount`, `date`, `accountId` opcional, `notes` opcional |
| `DELETE` | `/goals/:id/contributions/:contributionId` | Excluir aporte |

`GET /transactions` aceita `type`, `categoryId`, `status`, `from`, `to`, `page` e `limit` (1 a 100; padrão 20). A resposta contém `items` e `pagination` com `page`, `limit`, `total` e `pages`. `OVERDUE` é uma situação calculada para pendências vencidas; estados persistidos são `PENDING`, `PAID`, `RECEIVED` e `CANCELED`.

Exemplo de corpo para `POST /transactions` (substitua os IDs pelos recursos do usuário):

```json
{
  "description": "Compra de mercado",
  "amount": 125.5,
  "type": "EXPENSE",
  "status": "PAID",
  "date": "2026-09-28T12:00:00.000Z",
  "categoryId": "UUID_DA_CATEGORIA",
  "accountId": "UUID_DA_CONTA",
  "paymentMethod": "PIX",
  "installments": 1
}
```

Despesas exigem forma de pagamento. Operações fora do cartão exigem conta ativa; `CREDIT_CARD` exige `cardId` e remove o vínculo com conta na compra. Parcelamento é permitido apenas no cartão e distribui o valor total em centavos. Uma compra parcelada retorna `{ items, installments }`; uma compra simples retorna o lançamento.

### Comprovantes privados

| Método | Rota | Finalidade |
|---|---|---|
| `POST` | `/transactions/:id/attachments` | Enviar um arquivo no campo multipart `file` |
| `GET` | `/transactions/:id/attachments/:attachmentId` | Baixar um anexo autorizado |
| `DELETE` | `/transactions/:id/attachments/:attachmentId` | Excluir anexo e arquivo privado |

São aceitos PDF, PNG, JPEG e WebP, com limite de 5 MB por arquivo e cinco anexos por lançamento.

Ao executar `DELETE /transactions/:id`, um lançamento comum é removido. Se o lançamento tiver sido gerado por uma recorrência, ele é marcado como `CANCELED` e deixa de aparecer na listagem padrão; isso preserva a exceção da ocorrência e impede sua recriação automática. Para consultar esses registros, use o filtro `status=CANCELED`.

## Análise e produtividade

| Método | Rota | Finalidade |
|---|---|---|
| `GET` | `/dashboard/summary?month=AAAA-MM` | Indicadores e gráficos mensais |
| `GET` | `/forecasts` | Projeção de fluxo e saldos futuros |
| `GET` | `/reports/financial` | Relatório filtrável e análises comparativas |
| `GET` | `/alerts` | Avisos consolidados de vencimentos, limites e metas |
| `POST` | `/imports/transactions/preview` | Validar e pré-visualizar CSV |
| `POST` | `/imports/transactions/commit` | Confirmar linhas válidas da importação |

`GET /reports/financial` exige `from` e `to`, com início anterior ou igual ao fim; aceita filtros de tipo, categoria, conta, cartão, forma de pagamento e situação. CSV e impressão/PDF são recursos do frontend, sem endpoint próprio de exportação.

`GET /forecasts` aceita `startMonth` (`AAAA-MM`, padrão mês atual) e `months` (3 a 24, padrão 6). Consultas de lançamentos, recorrências e previsão podem materializar ocorrências; não são adequadas a testes em banco de produção sem considerar esse efeito.

A importação recebe JSON, não um arquivo multipart. O frontend interpreta o CSV e envia `{ "fileName": "importacao.csv", "rows": [...] }`. São aceitas de 1 a 2.000 linhas. Cada linha inclui `rowNumber`, `date`, `description`, `amount`, `type`, `category`; pode incluir `account`, `paymentMethod`, `card`, `status` e `notes`. Os valores de importação são strings, exceto `rowNumber`; conta/categoria/cartão são resolvidos pelo nome. A prévia retorna `rows` e `summary`; a gravação retorna `imported`, `skipped` e `total`. Linhas inválidas ou duplicadas são ignoradas na gravação.

## Administração

As rotas abaixo exigem perfil `ADMIN`.

| Método | Rota | Finalidade |
|---|---|---|
| `GET/POST` | `/admin/users` | Listar e criar usuários |
| `PUT/DELETE` | `/admin/users/:id` | Editar ou excluir usuário |
| `PUT` | `/admin/users/:id/password` | Definir nova senha |
| `POST` | `/admin/users/:id/recovery-code` | Emitir código temporário de recuperação |
| `GET` | `/admin/audit-logs` | Consultar trilha administrativa paginada |

## Limites e proteção

- Todas as consultas financeiras são isoladas pelo usuário autenticado.
- Cadastro, login e recuperação possuem limitação de tentativas.
- Senhas são validadas e armazenadas somente como hash.
- Sessões podem ser revogadas e expiram automaticamente.
- O frontend armazena o token apenas em `sessionStorage`, exigindo novo login após o encerramento da sessão do navegador.
- Entradas são validadas com Zod e corpos JSON são limitados a 1 MB.
- Arquivos são validados por assinatura binária e armazenados fora do frontend público.

Para implantação, banco de dados, backup e restauração, consulte [OPERACAO.md](OPERACAO.md).

## Limitações conhecidas

O QA de 28/09/2026 confirmou inconsistência ao excluir compra de fatura paga (QA-01), erro 500 ao excluir conta vinculada a pagamento de fatura (QA-02), remoção de espaços nas extremidades de observações (QA-03) e erro 500 para JSON malformado (QA-04). Veja [evidências e passos de reprodução](QA_2026-09-28.md). A documentação desses problemas não indica que foram corrigidos.
