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
docker compose --env-file .env.docker ps
```

- Aplicação: `http://localhost:8080`
- API: `http://localhost:3333`
- Prontidão: `http://localhost:3333/health/ready`

As migrations são aplicadas automaticamente quando o container do backend inicia. PostgreSQL e comprovantes usam volumes persistentes.

Em uma instalação nova, cadastre a primeira conta pela interface e promova-a sem criar credenciais padrão:

A imagem de runtime contém o JavaScript compilado, mas não a pasta `src` usada pelo script npm. Dentro do container, execute a versão compilada:

```powershell
docker compose --env-file .env.docker exec backend node dist/src/scripts/promote-admin.js administrador@exemplo.com --confirm
```

A promoção é idempotente e fica registrada na trilha de auditoria. O comando `npm run admin:promote` aplica-se à instalação local com código-fonte disponível.

Para acompanhar logs:

```powershell
docker compose --env-file .env.docker logs -f backend
docker compose --env-file .env.docker logs -f database
```

Para encerrar sem apagar dados:

```powershell
docker compose --env-file .env.docker down
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

Os scripts PowerShell chamam `docker compose` sem `--env-file`. Antes de usá-los, configure o arquivo de ambiente para a sessão atual (a partir da raiz do projeto):

```powershell
$env:COMPOSE_ENV_FILES = (Resolve-Path .env.docker).Path
```

Essa configuração também permite executar os comandos de logs, `ps` e `down` sem repetir `--env-file`; alternativamente, informe `--env-file .env.docker` em cada comando manual.

Com os containers em execução:

```powershell
.\scripts\backup-docker.ps1
```

O resultado fica em `backups/AAAAmmdd-HHmmss/` e contém:

- `database.dump`: banco PostgreSQL em formato próprio do `pg_dump`;
- `uploads/`: comprovantes anexados e fotos de perfil;
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
docker compose --env-file .env.docker ps
```

Antes de atualizar em produção, gere um backup. Nunca altere migrations já aplicadas; novas mudanças devem criar uma nova migration.

### Dependências com versão controlada

- O manifesto atual fixa `pg` em `8.18.0` e o override de `deepmerge-ts` em `8.0.0`. Consulte `backend/package.json` e o lockfile como fonte das versões efetivamente instaladas.
- Não altere essas versões sem validar a compatibilidade do adapter PostgreSQL e repetir as verificações abaixo.
- Toda atualização deve passar por `npm audit`, testes, typecheck, Prisma validate e build antes da publicação.

## CI no GitHub

O workflow `.github/workflows/ci.yml` executa em pushes e pull requests:

1. instalação reproduzível com `npm ci`;
2. validação e geração do Prisma Client;
3. aplicação das migrations em PostgreSQL temporário;
4. auditoria de dependências, tipagem, testes e build do backend;
5. auditoria de dependências, testes unitários, validação PWA e build do frontend;
6. construção das duas imagens Docker.

O workflow não executa o roteiro adicional `backend/scripts/qa-api.ts` nem QA visual em navegador. Um CI aprovado não elimina as falhas registradas no [relatório de 28/09/2026](QA_2026-09-28.md).

## Verificações antes de disponibilizar uma versão

Consulte o [guia de testes](TESTES.md), execute o QA em banco descartável e confira o relatório de falhas conhecidas. A rodada de 28/09/2026 não validou backup/restauração, carga, concorrência ou instalação da PWA; essas operações não devem ser apresentadas como homologadas por aquela rodada.

`VITE_API_URL` é incorporada durante o build do frontend. Em um servidor acessado por outros dispositivos, configure uma URL que esses dispositivos consigam alcançar e ajuste `CORS_ORIGIN` para a origem real da interface. Depois reconstrua a imagem do frontend. `localhost` refere-se ao dispositivo em que o navegador está aberto.
