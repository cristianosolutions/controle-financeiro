# API do Control Finance

Referência resumida da API REST utilizada pelo frontend. A URL local padrão é `http://localhost:3333/api`.

## Autenticação e formato

As rotas protegidas recebem `Authorization: Bearer <token>`. Corpos e respostas usam JSON, exceto upload e download de anexos. Erros seguem o formato:

```json
{ "message": "Descrição do erro" }
```

Erros de validação também podem incluir `issues`. Datas são enviadas em ISO 8601, valores monetários possuem duas casas decimais e IDs usam UUID.

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

## Recursos financeiros

| Recurso | Operações principais |
|---|---|
| `/accounts` | Listar, criar, editar e excluir/desativar contas e carteiras |
| `/transfers` | Listar, criar, editar e excluir transferências entre contas |
| `/cards` | Gerenciar cartões, consultar faturas, pagar e desfazer pagamento |
| `/categories` | Gerenciar categorias de receita e despesa |
| `/transactions` | Consultar com filtros/paginação, criar, editar e excluir lançamentos |
| `/recurrences` | Gerenciar regras recorrentes e materializar ocorrências futuras |
| `/budgets` | Gerenciar orçamentos mensais e copiar para outro mês |
| `/goals` | Gerenciar metas e seus aportes |

### Anexos

| Método | Rota | Finalidade |
|---|---|---|
| `POST` | `/transactions/:id/attachments` | Enviar um arquivo no campo multipart `file` |
| `GET` | `/transactions/:id/attachments/:attachmentId` | Baixar um anexo autorizado |
| `DELETE` | `/transactions/:id/attachments/:attachmentId` | Excluir anexo e arquivo privado |

São aceitos PDF, PNG, JPEG e WebP, com limite de 5 MB por arquivo e cinco anexos por lançamento.

## Análise e produtividade

| Método | Rota | Finalidade |
|---|---|---|
| `GET` | `/dashboard/summary?month=AAAA-MM` | Indicadores e gráficos mensais |
| `GET` | `/forecasts` | Projeção de fluxo e saldos futuros |
| `GET` | `/reports/financial` | Relatório filtrável e análises comparativas |
| `GET` | `/alerts` | Avisos consolidados de vencimentos, limites e metas |
| `POST` | `/imports/transactions/preview` | Validar e pré-visualizar CSV |
| `POST` | `/imports/transactions/commit` | Confirmar linhas válidas da importação |

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
- Entradas são validadas com Zod e corpos JSON são limitados a 1 MB.
- Arquivos são validados por assinatura binária e armazenados fora do frontend público.

Para implantação, banco de dados, backup e restauração, consulte [OPERACAO.md](OPERACAO.md).
