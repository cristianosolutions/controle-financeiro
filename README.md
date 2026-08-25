<div align="center">

# Control Finance

### Controle financeiro pessoal, simples e visual

Organize receitas e despesas, acompanhe seu saldo e entenda para onde seu dinheiro está indo — em qualquer dispositivo.

[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-7-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-20%2B-5FA04E?logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Database-4169E1?logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Prisma](https://img.shields.io/badge/Prisma-ORM-2D3748?logo=prisma&logoColor=white)](https://www.prisma.io/)

</div>

---

## Sobre o projeto

O **Control Finance** é uma aplicação web responsiva para gestão financeira pessoal. Cada usuário possui um ambiente privado para registrar movimentações, criar categorias, consultar relatórios e acompanhar a evolução mensal de suas finanças.

O projeto é dividido em uma API REST e uma interface React, com autenticação JWT, persistência em PostgreSQL e isolamento de dados por usuário.

## Principais recursos

- **Dashboard mensal:** receitas, despesas, saldo, quantidade e movimentações recentes.
- **Receitas e despesas:** criação, edição, exclusão, filtros e paginação.
- **Pagamentos:** PIX, dinheiro, cartões, boleto, transferência e outras formas.
- **Parcelamentos:** registro e identificação de compras parceladas.
- **Categorias personalizadas:** tipo, cor e vínculo com movimentações.
- **Relatórios financeiros:** filtros por período, tipo e categoria, com exportação CSV e impressão em PDF.
- **Administração de usuários:** controle de perfis, funções e status de acesso.
- **Autenticação segura:** senhas protegidas, JWT e limite de tentativas.
- **Layout responsivo:** experiência adaptada para computador, tablet e celular.

## Interface

### Visão geral

![Dashboard do Control Finance](docs/screenshots/02-dashboard.png)

<details>
<summary><strong>Ver mais telas</strong></summary>

### Login e cadastro

![Tela de login do Control Finance](docs/screenshots/01-login.png)

### Lançamentos

![Histórico de lançamentos](docs/screenshots/03-lancamentos.png)

### Categorias

![Gerenciamento de categorias](docs/screenshots/04-categorias.png)

### Novo lançamento

![Formulário de novo lançamento](docs/screenshots/05-novo-lancamento.png)

### Relatórios

![Relatórios financeiros com filtros e exportação](docs/screenshots/07-relatorios.png)

### Administração de usuários

![Gerenciamento administrativo de usuários](docs/screenshots/08-administracao.png)

### Versão mobile

<p align="center">
  <img src="docs/screenshots/06-versao-mobile.png" width="360" alt="Control Finance em um celular" />
</p>

</details>

## Tecnologias

| | Tecnologia | Uso no projeto |
|:---:|---|---|
| <img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/react/react-original.svg" width="28" alt="React" /> | **React** | Componentes e interface do usuário |
| <img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/typescript/typescript-original.svg" width="28" alt="TypeScript" /> | **TypeScript** | Tipagem do frontend e backend |
| <img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/vitejs/vitejs-original.svg" width="28" alt="Vite" /> | **Vite** | Desenvolvimento e build do frontend |
| <img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/nodejs/nodejs-original.svg" width="28" alt="Node.js" /> | **Node.js** | Ambiente de execução da API |
| <img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/express/express-original.svg" width="28" alt="Express" /> | **Express** | Rotas e serviços HTTP |
| <img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/prisma/prisma-original.svg" width="28" alt="Prisma" /> | **Prisma ORM** | Modelagem, migrations e acesso aos dados |
| <img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/postgresql/postgresql-original.svg" width="28" alt="PostgreSQL" /> | **PostgreSQL** | Banco de dados relacional |
| <img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/vitest/vitest-original.svg" width="28" alt="Vitest" /> | **Vitest** | Testes automatizados da API |

Outras bibliotecas importantes: **Zod**, **JWT**, **bcryptjs**, **Helmet**, **Lucide React**, **CORS** e **Supertest**.

## Arquitetura

```text
controle-financeiro/
├── backend/
│   ├── prisma/          # Schema e migrations
│   ├── generated/       # Prisma Client gerado
│   └── src/             # API, rotas e middlewares
├── frontend/
│   └── src/             # Componentes, estilos e cliente HTTP
├── docs/screenshots/    # Imagens da aplicação
└── README.md            # Apresentação e início rápido
```

```text
React + Vite  ──HTTP/JSON──▶  Express + Prisma  ──▶  PostgreSQL
     :5173                       :3333
```

## Como executar

### Pré-requisitos

- [Node.js 20.19 ou superior](https://nodejs.org/)
- [PostgreSQL](https://www.postgresql.org/download/)
- [Git](https://git-scm.com/downloads)

### 1. Clone o projeto

```bash
git clone https://github.com/cristianosolutions/controle-financeiro.git
cd controle-financeiro
```

### 2. Configure o backend

Crie no PostgreSQL um banco chamado `controle_financeiro`. Depois:

```bash
cd backend
npm install
cp .env.example .env
```

Configure o arquivo `backend/.env`:

```env
DATABASE_URL="postgresql://postgres:SUA_SENHA@localhost:5432/controle_financeiro?schema=public"
JWT_SECRET="uma-chave-local-com-pelo-menos-32-caracteres"
PORT=3333
NODE_ENV="development"
CORS_ORIGIN="http://localhost:5173"
```

Prepare o banco e inicie a API:

```bash
npx prisma migrate deploy
npm run prisma:generate
npm run dev
```

### 3. Configure o frontend

Em outro terminal:

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

Acesse **http://localhost:5173**. A API estará disponível em **http://localhost:3333** e poderá ser verificada em `/health`.

> No PowerShell, use `Copy-Item .env.example .env` para copiar os arquivos de ambiente. Caso scripts `.ps1` estejam bloqueados, execute `npm.cmd` e `npx.cmd`.

## Scripts úteis

| Comando | Pasta | Descrição |
|---|---|---|
| `npm run dev` | `backend` | Inicia a API com recarregamento automático |
| `npm test` | `backend` | Executa os testes automatizados |
| `npm run prisma:generate` | `backend` | Gera o Prisma Client |
| `npm run prisma:migrate` | `backend` | Cria e aplica uma migration em desenvolvimento |
| `npm run dev` | `frontend` | Inicia a interface com Vite |
| `npm run build` | `frontend` | Valida e gera o build de produção |

## Segurança

- Não envie arquivos `.env`, senhas, tokens ou backups ao GitHub.
- Use um `JWT_SECRET` forte e exclusivo em produção.
- Configure corretamente o CORS, backups e HTTPS antes de armazenar dados reais.

---

<div align="center">
  Desenvolvido para tornar o acompanhamento financeiro mais claro e acessível.
</div>
