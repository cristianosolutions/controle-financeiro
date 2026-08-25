param(
  [string]$BackupDirectory = ""
)
$ErrorActionPreference = "Stop"
$ProjectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
if (-not $BackupDirectory) { $BackupDirectory = Join-Path $ProjectRoot "backups" }
$BackupRoot = [System.IO.Path]::GetFullPath($BackupDirectory)
New-Item -ItemType Directory -Force -Path $BackupRoot | Out-Null
$Timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$Target = Join-Path $BackupRoot $Timestamp
New-Item -ItemType Directory -Path $Target | Out-Null

Push-Location $ProjectRoot
try {
  docker compose ps --status running | Out-Null
  docker compose exec -T database pg_dump -U controle -d controle_financeiro -Fc -f /tmp/control-finance.dump
  docker compose cp database:/tmp/control-finance.dump (Join-Path $Target "database.dump")
  docker compose exec -T database rm -f /tmp/control-finance.dump
  New-Item -ItemType Directory -Path (Join-Path $Target "uploads") | Out-Null
  docker compose cp backend:/app/uploads/. (Join-Path $Target "uploads")
  $Manifest = [ordered]@{
    createdAt = (Get-Date).ToString("o")
    database = "database.dump"
    uploads = "uploads"
    project = "Control Finance"
  }
  $Manifest | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $Target "manifest.json") -Encoding UTF8
  Write-Host "Backup concluído em: $Target" -ForegroundColor Green
} finally { Pop-Location }
