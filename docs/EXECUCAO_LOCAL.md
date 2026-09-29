# Executar no computador

Escolha uma das opções: **Docker Desktop**, que inicia os serviços juntos, ou **Node.js e PostgreSQL**, instalados separadamente. Os comandos abaixo partem da pasta baixada do projeto.

## Baixe o projeto

No GitHub, use **Code → Download ZIP** e extraia o arquivo. Se você usa Git, execute:

```bash
git clone https://github.com/cristianosolutions/controle-financeiro.git
cd controle-financeiro
```

## Opção 1 — Docker Desktop

Instale o [Docker Desktop](https://www.docker.com/products/docker-desktop/) e deixe-o aberto. Essa opção não exige instalar Node.js ou PostgreSQL separadamente.

### Configure

Na raiz do projeto, copie `.env.docker.example` para `.env.docker`. No PowerShell:

```powershell
Copy-Item .env.docker.example .env.docker
```

No macOS/Linux, use `cp .env.docker.example .env.docker`.

Abra `.env.docker` no editor de texto. Defina `POSTGRES_PASSWORD` e `JWT_SECRET` com valores próprios; a chave `JWT_SECRET` deve ter pelo menos 32 caracteres. Para uso somente neste computador, mantenha os endereços locais do exemplo. Uma senha de banco com letras e números evita a necessidade de codificar caracteres especiais na URL de conexão.

Não compartilhe esse arquivo. Se ele já existir e estiver configurado, preserve-o.

### Inicie

```bash
docker compose --env-file .env.docker up -d --build
```

Na primeira execução, aguarde o download e a preparação dos serviços. Depois abra **http://localhost:8080**, crie sua conta e entre.

Para conferir os serviços:

```bash
docker compose --env-file .env.docker ps
```

Para parar sem apagar os dados:

```bash
docker compose --env-file .env.docker down
```

Para iniciar novamente, execute o mesmo comando `up -d --build`. Os dados permanecem nos volumes do Docker; não acrescente `-v` ao comando `down`, pois essa opção remove os volumes.

## Opção 2 — Node.js e PostgreSQL

Instale [Node.js 22.12 ou superior](https://nodejs.org/) e [PostgreSQL](https://www.postgresql.org/download/). Mantenha o serviço PostgreSQL em execução e anote o usuário e a senha definidos na instalação.

### Prepare o banco

Crie um banco chamado `controle_financeiro`, por exemplo pelo pgAdmin: clique com o botão direito em **Databases → Create → Database**, informe o nome e salve. Quem usa um terminal SQL pode executar:

```sql
CREATE DATABASE controle_financeiro;
```

### Configure e inicie o serviço da aplicação

Abra um terminal na raiz do projeto:

```bash
cd backend
npm ci
```

Copie `.env.example` para `.env`. No PowerShell, use `Copy-Item .env.example .env`; no macOS/Linux, `cp .env.example .env`.

Edite `backend/.env` com os dados do seu banco:

```env
DATABASE_URL="postgresql://postgres:SUA_SENHA@localhost:5432/controle_financeiro?schema=public"
JWT_SECRET="SUBSTITUA_POR_UMA_CHAVE_PROPRIA_DE_32_CARACTERES_OU_MAIS"
PORT=3333
NODE_ENV="development"
CORS_ORIGIN="http://localhost:5173"
UPLOAD_DIR="./uploads"
```

Substitua `postgres` caso use outro usuário. Senhas com caracteres especiais precisam ser codificadas para uso na URL. Preserve um `.env` já configurado.

Ainda na pasta `backend`, execute:

```bash
npm run prisma:generate
npx prisma migrate deploy
npm run dev
```

Deixe esse terminal aberto. O serviço estará em **http://localhost:3333**.

### Inicie a interface

Abra um segundo terminal na raiz do projeto:

```bash
cd frontend
npm ci
```

Copie `.env.example` para `.env`, como no passo anterior. Para o uso local, mantenha:

```env
VITE_API_URL="http://localhost:3333/api"
```

Inicie a interface:

```bash
npm run dev
```

Abra **http://localhost:5173**, cadastre-se e entre. Mantenha os dois terminais abertos durante o uso. Para parar, pressione `Ctrl+C` em cada terminal. Para voltar a usar, execute `npm run dev` nas pastas `backend` e `frontend`; não é necessário repetir a instalação ou copiar os arquivos de configuração.

No Windows, se o PowerShell bloquear scripts npm, substitua `npm` por `npm.cmd` e `npx` por `npx.cmd`.

## Administrador (opcional)

Uma conta comum pode usar os recursos financeiros. Para gerenciar outros usuários ou emitir códigos de recuperação, cadastre primeiro a conta que será administradora.

Com instalação por Node.js, abra outro terminal na pasta `backend`:

```bash
npm run admin:promote -- seu-email@exemplo.com --confirm
```

Com Docker, execute na raiz do projeto:

```bash
docker compose --env-file .env.docker exec backend node dist/src/scripts/promote-admin.js seu-email@exemplo.com --confirm
```

Substitua pelo e-mail já cadastrado. Saia da aplicação e entre novamente após a promoção. Não existe senha administrativa padrão.

## Se algo não funcionar

| Situação | O que conferir |
| --- | --- |
| A página não abre | Docker ou os dois terminais precisam estar em execução; confira o endereço da opção escolhida |
| A tela abre, mas não carrega dados | Confira o serviço em `http://localhost:3333/health/ready` e a configuração `VITE_API_URL` |
| Falha ao conectar ao banco | Verifique se o PostgreSQL está ativo e se banco, usuário e senha correspondem ao `.env` |
| Porta já está em uso | Encerre a outra instância antes de iniciar novamente; as portas padrão são 3333 e 5173, ou 3333 e 8080 com Docker |
| Alterei o `.env`, mas nada mudou | Reinicie os processos; com Docker, execute novamente `up -d --build` |

Os registros financeiros ficam no PostgreSQL; comprovantes e fotos também dependem da pasta de uploads ou do volume correspondente. Preserve ambos ao fazer cópias de segurança. A configuração deste guia destina-se ao uso local.

Próximo passo: [entenda como usar a aplicação](GUIA_DE_USO.md).
