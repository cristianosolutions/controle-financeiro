# Fluxo — Controle Financeiro

Aplicação web para controle financeiro pessoal, composta por uma API REST e uma interface responsiva. Cada usuário possui suas próprias categorias e movimentações, com autenticação, visão mensal de receitas e despesas e histórico paginado.

## Funcionalidades

### Autenticação

- Cadastro com nome, e-mail e senha.
- Login com JWT válido por sete dias.
- Senhas protegidas com hash bcrypt.
- Consulta do usuário autenticado.
- Limite de tentativas nas rotas de cadastro e login.
- Isolamento dos dados por usuário.

### Categorias

- Criação e listagem de categorias.
- Categoria específica para receita, despesa ou ambos os tipos.
- Paleta visual de cores.
- Contagem de lançamentos por categoria.
- Edição e exclusão.
- Uma categoria com lançamentos não pode ser excluída.
- Não podem existir duas categorias com o mesmo nome para o mesmo usuário.

### Lançamentos financeiros

- Cadastro de receitas e despesas.
- Descrição, valor, data, categoria e observação opcional.
- Edição e exclusão de lançamentos.
- Listagem paginada.
- Filtros por tipo, categoria e intervalo de datas.
- Validação entre o tipo da categoria e o tipo do lançamento.
- Valores monetários armazenados como `Decimal(14,2)`.

### Dashboard

- Seleção de mês e ano em português brasileiro.
- Total de receitas do mês.
- Total de despesas do mês.
- Saldo mensal.
- Quantidade de lançamentos.
- Relação percentual entre despesas e receitas.
- Lista dos cinco lançamentos mais recentes.

### Interface

- Layout responsivo para computador, tablet e celular.
- Sessão persistida no navegador.
- Navegação entre visão geral, lançamentos e categorias.
- Feedback de erros retornados pela API.
- Identidade visual por categoria.

## Tecnologias

### Backend

| Tecnologia | Finalidade |
|---|---|
| Node.js | Ambiente de execução |
| TypeScript | Tipagem e compilação |
| Express 5 | API HTTP |
| Prisma ORM 7 | Schema, migrations e acesso ao banco |
| PostgreSQL | Banco de dados relacional |
| `@prisma/adapter-pg` e `pg` | Adapter PostgreSQL do Prisma 7 |
| Zod | Validação de variáveis, body, params e query |
| JSON Web Token | Autenticação |
| bcryptjs | Hash de senhas |
| Helmet | Headers HTTP de segurança |
| express-rate-limit | Proteção contra excesso de tentativas |
| CORS | Controle das origens do frontend |
| Vitest e Supertest | Testes automatizados da API |

### Frontend

| Tecnologia | Finalidade |
|---|---|
| React | Construção da interface |
| TypeScript | Tipagem do frontend |
| Vite | Servidor de desenvolvimento e build |
| Lucide React | Ícones |
| CSS responsivo | Layout, componentes e identidade visual |

## Arquitetura

```text
controle-financeiro/
├── backend/
│   ├── prisma/
│   │   ├── migrations/          # Histórico versionado do banco
│   │   └── schema.prisma        # Modelos do banco
│   ├── src/
│   │   ├── config/              # Variáveis de ambiente
│   │   ├── errors/              # Erros da aplicação
│   │   ├── lib/                 # Instância do Prisma Client
│   │   ├── middleware/          # Autenticação, segurança e erros
│   │   ├── routes/              # Rotas REST
│   │   ├── types/               # Extensões de tipos
│   │   ├── app.ts               # Configuração do Express
│   │   └── server.ts            # Inicialização do servidor
│   ├── .env.example
│   ├── package.json
│   └── prisma.config.ts
├── frontend/
│   ├── src/
│   │   ├── components/          # Telas e componentes
│   │   ├── lib/                 # Cliente HTTP
│   │   ├── App.tsx              # Sessão e navegação principal
│   │   ├── styles.css           # Estilos globais
│   │   └── types.ts             # Tipos da API
│   ├── .env.example
│   ├── package.json
│   └── vite.config.ts
├── .gitignore
└── README.md
```

## Modelo de dados

```text
User 1 ─── N Category
User 1 ─── N Transaction
Category 1 ─── N Transaction
```

- Ao excluir um usuário, suas categorias e transações são removidas em cascata.
- Uma categoria vinculada a transações utiliza exclusão restrita.
- IDs são UUIDs.
- E-mails são únicos.
- O índice `userId + date` otimiza consultas mensais.

## Pré-requisitos

- Node.js 20.19 ou superior.
- npm.
- PostgreSQL em execução.
- Git para versionamento e manutenção em outros computadores.

Confirme as instalações:

```powershell
node --version
npm.cmd --version
git --version
psql --version
```

No PowerShell, use `npm.cmd` caso a política de execução impeça o comando `npm`.

## Instalação inicial

### 1. Banco PostgreSQL

Crie um banco chamado `controle_financeiro`. Pelo `psql`:

```sql
CREATE DATABASE controle_financeiro;
```

Também é possível criá-lo com pgAdmin ou outra ferramenta PostgreSQL.

### 2. Backend

```powershell
cd backend
npm.cmd install
Copy-Item .env.example .env
```

Configure `backend/.env`:

```env
DATABASE_URL="postgresql://usuario:senha@localhost:5432/controle_financeiro?schema=public"
JWT_SECRET="uma-chave-secreta-forte-com-no-minimo-32-caracteres"
PORT=3333
NODE_ENV="development"
CORS_ORIGIN="http://localhost:5173"
```

Se a senha do PostgreSQL possuir caracteres especiais, eles precisam estar codificados para URL.

Aplique as migrations e gere o Prisma Client:

```powershell
npx.cmd prisma migrate deploy
npm.cmd run prisma:generate
```

Inicie a API:

```powershell
npm.cmd run dev
```

A API estará disponível em `http://localhost:3333`. Teste:

```powershell
Invoke-RestMethod http://localhost:3333/health
```

### 3. Frontend

Em outro terminal:

```powershell
cd frontend
npm.cmd install
Copy-Item .env.example .env
npm.cmd run dev
```

O `frontend/.env` deve conter:

```env
VITE_API_URL="http://localhost:3333/api"
```

Acesse `http://localhost:5173`.

## Variáveis de ambiente

### Backend

| Variável | Obrigatória | Exemplo | Descrição |
|---|---:|---|---|
| `DATABASE_URL` | Sim | `postgresql://...` | Conexão PostgreSQL |
| `JWT_SECRET` | Sim em produção | chave com 32+ caracteres | Assinatura dos tokens |
| `PORT` | Não | `3333` | Porta da API |
| `NODE_ENV` | Não | `development` | Ambiente de execução |
| `CORS_ORIGIN` | Não | `http://localhost:5173` | Origens permitidas, separadas por vírgula |

### Frontend

| Variável | Obrigatória | Exemplo | Descrição |
|---|---:|---|---|
| `VITE_API_URL` | Não | `http://localhost:3333/api` | Endereço base da API |

Nunca envie arquivos `.env` para o GitHub. Apenas os `.env.example` devem ser versionados.

## API REST

Base local: `http://localhost:3333/api`.

Rotas protegidas exigem:

```http
Authorization: Bearer SEU_TOKEN
```

### Autenticação

| Método | Rota | Protegida | Descrição |
|---|---|---:|---|
| `POST` | `/auth/register` | Não | Cadastra usuário |
| `POST` | `/auth/login` | Não | Autentica e retorna token |
| `GET` | `/auth/me` | Sim | Retorna o usuário atual |

Cadastro:

```json
{
  "name": "Maria",
  "email": "maria@exemplo.com",
  "password": "senha-segura"
}
```

### Categorias

| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/categories` | Lista categorias |
| `POST` | `/categories` | Cria categoria |
| `PUT` | `/categories/:id` | Atualiza categoria |
| `DELETE` | `/categories/:id` | Exclui categoria sem lançamentos |

```json
{
  "name": "Alimentação",
  "color": "#ea580c",
  "type": "EXPENSE"
}
```

`type` aceita `INCOME`, `EXPENSE` ou `null` para ambos.

### Lançamentos

| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/transactions` | Lista e filtra lançamentos |
| `POST` | `/transactions` | Cria lançamento |
| `PUT` | `/transactions/:id` | Atualiza lançamento |
| `DELETE` | `/transactions/:id` | Exclui lançamento |

Parâmetros opcionais da listagem:

- `type=INCOME|EXPENSE`
- `categoryId=UUID`
- `from=AAAA-MM-DD`
- `to=AAAA-MM-DD`
- `page=1`
- `limit=20`, com máximo de 100

```json
{
  "description": "Supermercado",
  "amount": 250.75,
  "type": "EXPENSE",
  "date": "2026-08-21",
  "categoryId": "UUID_DA_CATEGORIA",
  "notes": "Compras do mês"
}
```

### Dashboard

| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/dashboard/summary?month=2026-08` | Resumo do mês informado |

### Saúde

| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/health` | Confirma que a API está respondendo |

## Scripts

### Backend

| Comando | Ação |
|---|---|
| `npm.cmd run dev` | Executa API com recarregamento |
| `npm.cmd run build` | Compila para `dist` |
| `npm.cmd start` | Executa o build compilado |
| `npm.cmd test` | Executa os testes |
| `npm.cmd run test:watch` | Testes em modo observação |
| `npm.cmd run typecheck` | Verifica tipos |
| `npm.cmd run prisma:validate` | Valida o schema |
| `npm.cmd run prisma:format` | Formata o schema |
| `npm.cmd run prisma:generate` | Gera o client |
| `npm.cmd run prisma:migrate -- --name nome` | Cria migration de desenvolvimento |
| `npm.cmd run prisma:studio` | Abre o Prisma Studio |

### Frontend

| Comando | Ação |
|---|---|
| `npm.cmd run dev` | Servidor Vite |
| `npm.cmd run build` | Build de produção |
| `npm.cmd run preview` | Visualiza o build |
| `npm.cmd run typecheck` | Verifica tipos |

## Alterações no banco de dados

Para alterar um model, edite `backend/prisma/schema.prisma` e execute no backend:

```powershell
npm.cmd run prisma:format
npm.cmd run prisma:validate
npm.cmd run prisma:migrate -- --name descricao_da_alteracao
npm.cmd run prisma:generate
```

Revise e versione a nova pasta criada em `backend/prisma/migrations`.

Em produção ou em outro computador que apenas precisa aplicar migrations existentes:

```powershell
npx.cmd prisma migrate deploy
```

Não use `prisma migrate reset`, `db push --force-reset` ou `--accept-data-loss` em um banco com dados importantes.

## Verificação antes de publicar alterações

No backend:

```powershell
npm.cmd test
npm.cmd run typecheck
npm.cmd run build
npm.cmd run prisma:validate
```

No frontend:

```powershell
npm.cmd run typecheck
npm.cmd run build
```

## GitHub

### Primeiro envio

Crie um repositório vazio no GitHub e execute na raiz:

```powershell
git init
git add .
git status
git commit -m "feat: versão inicial do controle financeiro"
git branch -M main
git remote add origin https://github.com/SEU-USUARIO/controle-financeiro.git
git push -u origin main
```

Antes do commit, confirme com `git status` que nenhum `.env`, `node_modules`, `dist` ou client gerado está incluído.

### Atualizações futuras

```powershell
git pull
git add .
git commit -m "feat: descreva a alteração"
git push
```

Use mensagens como `feat:`, `fix:`, `docs:`, `refactor:` e `test:` para explicar a natureza da alteração.

## Manutenção em outro computador

### Clonar e preparar

```powershell
git clone https://github.com/SEU-USUARIO/controle-financeiro.git
cd controle-financeiro

cd backend
npm.cmd install
Copy-Item .env.example .env
# Configure o backend/.env
npx.cmd prisma migrate deploy
npm.cmd run prisma:generate

cd ..\frontend
npm.cmd install
Copy-Item .env.example .env
# Configure o frontend/.env quando necessário
```

Depois, inicie backend e frontend em terminais separados.

### Rotina recomendada de manutenção

1. Atualize a branch local com `git pull`.
2. Crie uma branch: `git switch -c feature/nome-da-alteracao`.
3. Instale dependências se `package-lock.json` mudou: `npm.cmd install`.
4. Faça as alterações.
5. Se o schema mudou, crie e gere a migration.
6. Execute testes, typecheck e build.
7. Confira `git status` e `git diff`.
8. Faça commit e push da branch.
9. Abra um Pull Request no GitHub.

```powershell
git switch -c feature/minha-alteracao
git add .
git commit -m "feat: implementa minha alteração"
git push -u origin feature/minha-alteracao
```

## Dados do PostgreSQL em outro computador

Git transporta código, schema e migrations, mas não transporta os registros do banco.

Para começar com banco vazio, crie o banco e execute `prisma migrate deploy`.

Para transportar dados existentes, gere um backup fora do Git:

```powershell
pg_dump -U usuario -d controle_financeiro -F c -f controle_financeiro.backup
```

No outro computador:

```powershell
pg_restore -U usuario -d controle_financeiro controle_financeiro.backup
```

Backups podem conter dados pessoais e financeiros. Não os publique em repositórios públicos.

## Segurança

- Não versionar `.env`, tokens, senhas ou backups.
- Usar `JWT_SECRET` longo e aleatório em produção.
- Configurar `CORS_ORIGIN` com os domínios reais do frontend.
- Usar HTTPS em produção.
- Manter Node.js e dependências atualizados.
- Revisar migrations antes de aplicá-las.
- Fazer backup do banco antes de alterações estruturais importantes.
- Não executar correções automáticas com `npm audit fix --force` sem revisar mudanças incompatíveis.

## Solução de problemas

### PowerShell bloqueia `npm.ps1`

Use `npm.cmd` e `npx.cmd`:

```powershell
npm.cmd install
npx.cmd prisma generate
```

### Prisma não encontra o schema

Execute comandos dentro de `backend`:

```powershell
cd backend
npm.cmd run prisma:validate
```

### Prisma Client desatualizado

```powershell
cd backend
npm.cmd run prisma:generate
```

### Banco não conecta

- Confirme usuário, senha, host, porta e nome do banco em `DATABASE_URL`.
- Confirme se o PostgreSQL está em execução.
- Verifique se caracteres especiais da senha estão codificados na URL.

### Frontend não acessa a API

- Confirme se o backend está na porta 3333.
- Confirme `VITE_API_URL`.
- Confirme se a URL do frontend está em `CORS_ORIGIN`.
- Reinicie o Vite após alterar arquivos `.env`.

## Estado atual

- Backend funcional e compilando.
- Frontend funcional e compilando.
- Schema Prisma válido.
- Migration inicial criada.
- Testes automatizados básicos da API disponíveis.
- Interface responsiva integrada à API.

## Licença

O backend está configurado com licença ISC. Ajuste este tópico caso o projeto adote outra licença formal.
