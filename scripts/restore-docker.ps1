param(
  [Parameter(Mandatory = $true)][string]$BackupPath,
  [switch]$ConfirmRestore
)
$ErrorActionPreference = "Stop"
if (-not $ConfirmRestore) { throw "Restauração cancelada. Execute novamente com -ConfirmRestore para confirmar a substituição do banco atual." }
$ProjectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$AllowedRoot = [System.IO.Path]::GetFullPath((Join-Path $ProjectRoot "backups"))
$Source = (Resolve-Path -LiteralPath $BackupPath).Path
if (-not ($Source.StartsWith($AllowedRoot + [System.IO.Path]::DirectorySeparatorChar))) { throw "O backup deve estar dentro de $AllowedRoot" }
$Dump = Join-Path $Source "database.dump"
$Uploads = Join-Path $Source "uploads"
if (-not (Test-Path -LiteralPath $Dump -PathType Leaf)) { throw "Arquivo database.dump não encontrado." }
if (-not (Test-Path -LiteralPath $Uploads -PathType Container)) { throw "Pasta uploads não encontrada." }

Push-Location $ProjectRoot
try {
  docker compose cp $Dump database:/tmp/control-finance.dump
  docker compose exec -T database pg_restore -U controle -d controle_financeiro --clean --if-exists --no-owner /tmp/control-finance.dump
  docker compose exec -T database rm -f /tmp/control-finance.dump
  docker compose cp "$Uploads/." backend:/app/uploads
  docker compose restart backend
  Write-Host "Restauração concluída. Verifique http://localhost:3333/health/ready" -ForegroundColor Green
} finally { Pop-Location }
