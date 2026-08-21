# Guia do Usuário — Fluxo Controle Financeiro

Este guia apresenta o funcionamento do sistema de forma simples. Ele é indicado para quem encontrou o projeto no GitHub e deseja entender suas funcionalidades ou executá-lo no próprio computador.

## O que é o Fluxo?

O Fluxo é um sistema de controle financeiro pessoal. Nele, cada usuário cria sua própria conta e registra receitas e despesas para acompanhar o resultado de cada mês.

O sistema permite:

- Criar uma conta pessoal.
- Entrar com e-mail e senha.
- Criar categorias personalizadas.
- Identificar categorias por cores.
- Registrar receitas e despesas.
- Editar ou excluir lançamentos.
- Consultar o histórico financeiro.
- Navegar entre diferentes meses e anos.
- Visualizar receitas, despesas e saldo mensal.

Cada conta possui dados separados. Um usuário não pode visualizar categorias ou lançamentos pertencentes a outro usuário.

## Como navegar pelo sistema

Depois de entrar, o menu principal apresenta três áreas:

```text
Visão geral
Lançamentos
Categorias
```

Em telas menores, como celulares, o menu pode ser aberto pelo botão localizado no topo da página.

## Cadastro e acesso

Na primeira utilização:

1. Clique em **Cadastre-se**.
2. Informe seu nome.
3. Informe um e-mail válido.
4. Crie uma senha com pelo menos oito caracteres.
5. Clique em **Criar conta**.

Após o cadastro, o sistema realiza o acesso automaticamente.

Nas próximas utilizações:

1. Informe seu e-mail.
2. Informe sua senha.
3. Clique em **Entrar**.

Para encerrar a sessão, utilize o botão de saída localizado ao lado dos dados do usuário no menu lateral.

> Esta versão ainda não possui recuperação de senha por e-mail. Ao experimentar o sistema, guarde a senha utilizada.

## Visão geral

A página **Visão geral** apresenta um resumo do mês selecionado.

Nessa tela você encontra:

- **Saldo do mês:** diferença entre receitas e despesas.
- **Receitas:** soma dos valores recebidos.
- **Despesas:** soma dos valores gastos.
- **Balanço mensal:** comparação entre entradas e saídas.
- **Últimos lançamentos:** movimentações mais recentes do período.

### Alterar o período

No topo da página existem seletores de mês e ano.

1. Selecione o mês desejado.
2. Selecione o ano.
3. O resumo será atualizado automaticamente.

## Categorias

Antes de registrar uma receita ou despesa, crie pelo menos uma categoria.

Exemplos de categorias:

- Alimentação
- Moradia
- Transporte
- Saúde
- Lazer
- Salário
- Investimentos

### Criar uma categoria

1. Abra **Categorias** no menu.
2. Clique em **Nova categoria**.
3. Informe um nome.
4. Escolha o tipo:
   - **Despesa:** utilizada apenas em gastos.
   - **Receita:** utilizada apenas em valores recebidos.
   - **Receita e despesa:** pode ser utilizada nos dois tipos.
5. Escolha uma cor na paleta.
6. Clique em **Adicionar**.

A cor é utilizada para identificar visualmente a categoria nos lançamentos e resumos. Internamente ela é armazenada como um código de cor, mas o usuário seleciona apenas a opção visual.

### Excluir uma categoria

Clique no ícone de lixeira presente no cartão da categoria.

Uma categoria que já possui lançamentos não pode ser excluída. Nesse caso, exclua ou altere os lançamentos relacionados primeiro.

## Lançamentos

Um lançamento representa uma movimentação financeira.

Existem dois tipos:

- **Receita:** dinheiro que entrou.
- **Despesa:** dinheiro que saiu.

### Criar um lançamento

1. Clique em **Novo lançamento**.
2. Escolha entre **Despesa** e **Receita**.
3. Informe uma descrição.
4. Informe o valor.
5. Escolha a data.
6. Selecione uma categoria compatível.
7. Opcionalmente, escreva uma observação.
8. Clique em **Salvar lançamento**.

Exemplo de despesa:

```text
Descrição: Supermercado
Valor: R$ 250,75
Data: 21/08/2026
Categoria: Alimentação
Observação: Compras do mês
```

Exemplo de receita:

```text
Descrição: Salário
Valor: R$ 3.500,00
Data: 05/08/2026
Categoria: Salário
```

### Editar um lançamento

1. Abra **Lançamentos**.
2. Localize a movimentação.
3. Clique no ícone de lápis.
4. Altere os dados desejados.
5. Clique em **Salvar lançamento**.

### Excluir um lançamento

1. Abra **Lançamentos**.
2. Clique no ícone de lixeira.
3. Confirme a exclusão.

A exclusão é permanente.

## Tecnologias utilizadas

O projeto foi construído com tecnologias amplamente utilizadas no desenvolvimento web:

### Interface

- **React:** construção das páginas e componentes.
- **TypeScript:** ajuda a evitar erros durante o desenvolvimento.
- **Vite:** inicialização e construção do frontend.
- **Lucide React:** ícones da interface.
- **CSS:** aparência e adaptação para celulares e computadores.

### Servidor e banco de dados

- **Node.js:** execução do servidor.
- **Express:** rotas e comunicação entre frontend e backend.
- **PostgreSQL:** armazenamento dos usuários, categorias e lançamentos.
- **Prisma ORM:** comunicação segura e organizada com o banco.
- **JWT e bcrypt:** autenticação e proteção das senhas.
- **Zod:** validação dos dados informados.

Não é necessário dominar essas tecnologias para experimentar o sistema. Elas precisam apenas estar corretamente instaladas e configuradas.

## Como baixar pelo GitHub

Existem duas formas de baixar o projeto.

### Opção 1 — Clonar com Git

Na página do projeto no GitHub:

1. Clique no botão verde **Code**.
2. Copie a URL HTTPS.
3. Abra o PowerShell ou terminal.
4. Execute:

```powershell
git clone URL_COPIADA_DO_GITHUB
cd controle-financeiro
```

Exemplo:

```powershell
git clone https://github.com/SEU-USUARIO/controle-financeiro.git
cd controle-financeiro
```

### Opção 2 — Baixar ZIP

1. Na página do projeto, clique em **Code**.
2. Clique em **Download ZIP**.
3. Extraia o arquivo em uma pasta do computador.
4. Abra a pasta extraída no VS Code.

Usar Git é recomendado caso você queira receber atualizações futuras com `git pull`.

## O que instalar no computador

Antes de executar o projeto, instale:

- [Node.js](https://nodejs.org/)
- [PostgreSQL](https://www.postgresql.org/download/)
- [Git](https://git-scm.com/downloads), se utilizar a opção de clonagem
- [Visual Studio Code](https://code.visualstudio.com/), opcional

Durante a instalação do PostgreSQL, guarde a senha criada para o usuário `postgres`.

Confirme o Node.js no terminal:

```powershell
node --version
npm.cmd --version
```

## Como executar localmente

O sistema possui três partes:

1. Banco PostgreSQL.
2. Backend.
3. Frontend.

### 1. Criar o banco

Abra o pgAdmin, conecte-se ao PostgreSQL e crie um banco chamado:

```text
controle_financeiro
```

No pgAdmin:

1. Expanda o servidor PostgreSQL.
2. Clique com o botão direito em **Databases**.
3. Selecione **Create → Database**.
4. Digite `controle_financeiro`.
5. Salve.

### 2. Preparar o backend

Abra um terminal na pasta do projeto:

```powershell
cd backend
npm.cmd install
Copy-Item .env.example .env
```

Abra `backend/.env` e configure:

```env
DATABASE_URL="postgresql://postgres:SUA_SENHA@localhost:5432/controle_financeiro?schema=public"
JWT_SECRET="uma-chave-local-com-pelo-menos-32-caracteres"
PORT=3333
NODE_ENV="development"
CORS_ORIGIN="http://localhost:5173"
```

Substitua `SUA_SENHA` pela senha criada durante a instalação do PostgreSQL.

Prepare as tabelas:

```powershell
npx.cmd prisma migrate deploy
npm.cmd run prisma:generate
```

Inicie o backend:

```powershell
npm.cmd run dev
```

Mantenha esse terminal aberto.

### 3. Preparar o frontend

Abra um segundo terminal na pasta do projeto:

```powershell
cd frontend
npm.cmd install
Copy-Item .env.example .env
npm.cmd run dev
```

Mantenha o segundo terminal aberto.

### 4. Abrir o sistema

Acesse no navegador:

```text
http://localhost:5173
```

Agora você pode criar uma conta e experimentar o sistema.

## Como encerrar

Para parar o sistema:

1. Vá ao terminal do frontend.
2. Pressione `Ctrl + C`.
3. Vá ao terminal do backend.
4. Pressione `Ctrl + C`.

Os dados permanecerão armazenados no PostgreSQL para a próxima execução.

## Como executar novamente

Não é necessário repetir a instalação ou as migrations toda vez.

Abra dois terminais.

Terminal do backend:

```powershell
cd controle-financeiro\backend
npm.cmd run dev
```

Terminal do frontend:

```powershell
cd controle-financeiro\frontend
npm.cmd run dev
```

Depois acesse `http://localhost:5173`.

## Como receber atualizações futuras

Se o projeto foi clonado com Git:

```powershell
cd controle-financeiro
git pull
```

Caso os arquivos `package-lock.json` tenham sido alterados, atualize as dependências:

```powershell
cd backend
npm.cmd install

cd ..\frontend
npm.cmd install
```

Se houver novas alterações no banco:

```powershell
cd ..\backend
npx.cmd prisma migrate deploy
npm.cmd run prisma:generate
```

## Problemas comuns

### O comando npm foi bloqueado pelo PowerShell

Use `npm.cmd` no lugar de `npm` e `npx.cmd` no lugar de `npx`.

### O backend não conecta ao banco

Confira:

- Se o PostgreSQL está em execução.
- Se o banco `controle_financeiro` foi criado.
- Se usuário e senha estão corretos em `DATABASE_URL`.
- Se a porta do PostgreSQL é `5432`.

### A página abre, mas não carrega os dados

Confira se o backend está aberto em outro terminal e se responde em:

```text
http://localhost:3333/health
```

### A porta já está sendo utilizada

Encerre outra execução do sistema ou altere a porta no `.env`. Se mudar a porta da API, atualize também `VITE_API_URL` no frontend.

### O Prisma Client está ausente

Execute:

```powershell
cd backend
npm.cmd run prisma:generate
```

## Observações

- Este é um projeto de controle financeiro pessoal e educacional.
- Antes de utilizar informações financeiras importantes, configure hospedagem, backups e segurança adequadamente.
- Não compartilhe arquivos `.env`, senhas, tokens ou backups do banco.
- Os dados do banco local não são enviados para o GitHub.

Para informações sobre arquitetura, API, migrations, segurança e manutenção técnica, consulte o [README principal](README.md).
