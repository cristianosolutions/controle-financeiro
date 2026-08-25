# Operação do Control Finance

Este guia cobre o ambiente Docker, verificações de saúde, backups e restauração. Arquivos `.env`, volumes e backups não devem ser enviados ao GitHub.

## Ambiente completo com Docker

Pré-requisito: Docker Desktop com Docker Compose.

```powershell
Copy-Item .env.docker.example .env.docker
```

Edite `.env.docker` e use senhas fortes. Depois execute:

```powershell
docker compose --env-file .env.docker up -d --build
docker compose ps
```

- Aplicação: `http://localhost:8080`
- API: `http://localhost:3333`
- Prontidão: `http://localhost:3333/health/ready`

As migrations são aplicadas automaticamente quando o container do backend inicia. PostgreSQL e comprovantes usam volumes persistentes.

Em uma instalação nova, cadastre a primeira conta pela interface e promova-a sem criar credenciais padrão:

```powershell
docker compose --env-file .env.docker exec backend npm run admin:promote -- administrador@exemplo.com --confirm
```

A promoção é idempotente e fica registrada na trilha de auditoria.

Para acompanhar logs:

```powershell
docker compose logs -f backend
docker compose logs -f database
```

Para encerrar sem apagar dados:

```powershell
docker compose down
```

Não use `docker compose down -v` em um ambiente com dados importantes, pois a opção `-v` remove os volumes.

## Health checks

| Rota | Finalidade |
|---|---|
| `/health` | Compatibilidade e disponibilidade básica |
| `/health/live` | Confirma que o processo está respondendo |
| `/health/ready` | Confere conexão com PostgreSQL e escrita na pasta de anexos |

Orquestradores e monitores devem usar `/health/ready` para decidir se a API pode receber tráfego.

## Backup

Com os containers em execução:

```powershell
.\scripts\backup-docker.ps1
```

O resultado fica em `backups/AAAAmmdd-HHmmss/` e contém:

- `database.dump`: banco PostgreSQL em formato próprio do `pg_dump`;
- `uploads/`: comprovantes anexados;
- `manifest.json`: data e conteúdo do backup.

Copie backups importantes para um local externo e criptografado. Faça pelo menos um backup diário e mantenha versões semanais e mensais.

## Restauração

A restauração substitui o conteúdo atual do banco. Faça um backup antes e confirme o diretório escolhido:

```powershell
.\scripts\restore-docker.ps1 -BackupPath .\backups\20260825-120000 -ConfirmRestore
```

O script aceita somente diretórios dentro da pasta `backups` do projeto. Ao terminar, confira `/health/ready`, faça login e valide contas, lançamentos e anexos.

## Atualizações

```powershell
git pull
docker compose --env-file .env.docker up -d --build
docker compose ps
```

Antes de atualizar em produção, gere um backup. Nunca altere migrations já aplicadas; novas mudanças devem criar uma nova migration.

### Dependências com versão controlada

- `pg` permanece fixado em `8.18.0` enquanto o aviso de concorrência do `@prisma/adapter-pg` estiver aberto no [Prisma #29407](https://github.com/prisma/prisma/issues/29407). Não atualize isoladamente para `pg` 9.
- `deepmerge-ts` usa override `8.0.0`, versão que corrige o [GHSA-ggr8-5vv4-36mx](https://github.com/advisories/GHSA-ggr8-5vv4-36mx), sem regredir o Prisma 7.
- Toda atualização deve passar por `npm audit`, testes, typecheck, Prisma validate e build antes da publicação.

## CI no GitHub

O workflow `.github/workflows/ci.yml` executa em pushes e pull requests:

1. instalação reproduzível com `npm ci`;
2. validação e geração do Prisma Client;
3. aplicação das migrations em PostgreSQL temporário;
4. auditoria de dependências, tipagem, testes e build do backend;
5. auditoria de dependências, testes unitários, validação PWA e build do frontend;
6. construção das duas imagens Docker.
