<div align="center">

# Control Finance

### Controle financeiro pessoal, simples e visual

Organize receitas e despesas, acompanhe seu saldo e entenda para onde seu dinheiro está indo.

[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-7-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-22.12%2B-5FA04E?logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Database-4169E1?logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Prisma](https://img.shields.io/badge/Prisma-ORM-2D3748?logo=prisma&logoColor=white)](https://www.prisma.io/)

</div>

## Sobre a aplicação

O **Control Finance** ajuda a organizar as finanças pessoais em um só lugar. Cada usuário tem seu próprio cadastro, contas, categorias e movimentações. A interface se adapta ao computador, tablet e celular.

Os registros são feitos manualmente ou importados de uma planilha CSV. A aplicação não se conecta automaticamente a bancos ou administradoras de cartão.

## O que você pode fazer

- Registrar receitas e despesas e acompanhar o resumo de cada mês.
- Organizar contas e carteiras e transferir valores entre elas.
- Cadastrar cartões, acompanhar faturas e registrar compras parceladas.
- Criar categorias e compromissos recorrentes.
- Definir limites de gastos por categoria e metas de economia.
- Consultar previsões, relatórios e avisos de vencimentos.
- Importar lançamentos de CSV, anexar comprovantes e exportar relatórios.
- Gerenciar sua senha, foto de perfil e sessões de acesso.

## Comece por aqui

| Quero… | Onde encontrar |
| --- | --- |
| Entender como usar a aplicação | [Guia de uso](docs/GUIA_DE_USO.md) |
| Baixar e executar no meu computador | [Instalação local](docs/EXECUCAO_LOCAL.md) |
| Conhecer as ferramentas utilizadas | [Tecnologias](#tecnologias) |

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

## Executar no computador

Você pode executar a aplicação com **Docker Desktop** ou instalar **Node.js e PostgreSQL** separadamente. O [guia de instalação local](docs/EXECUCAO_LOCAL.md) explica as duas opções, desde o download até a criação da primeira conta.

Depois de iniciar, abra o endereço indicado no navegador, faça seu cadastro e siga o [guia de uso](docs/GUIA_DE_USO.md).

---

<div align="center">
  Desenvolvido para tornar o acompanhamento financeiro mais claro e acessível.
</div>
