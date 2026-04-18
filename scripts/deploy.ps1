<#
.SYNOPSIS
  Deploy storage-upload to Azure Static Web Apps (production).

.DESCRIPTION
  Deterministic deployment using SWA CLI with a deployment token.
  The token is read from (in priority order):
    1. $env:SWA_CLI_DEPLOYMENT_TOKEN (already set in shell)
    2. .azure/storage-upload/.env file (gitignored, safe for local dev)

.EXAMPLE
  # Using env var directly:
  $env:SWA_CLI_DEPLOYMENT_TOKEN = "<token>"
  .\scripts\deploy.ps1

  # Using .azure env file (auto-loaded):
  .\scripts\deploy.ps1
#>
param(
    [string]$Environment = "production"
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot

# Ensure node.exe is on PATH (support nvm-windows)
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    $nvmNode = Get-ChildItem "$env:LOCALAPPDATA\nvm" -Filter "node.exe" -Recurse -Depth 1 -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($nvmNode) {
        $env:Path += ";$($nvmNode.DirectoryName)"
    } else {
        Write-Error "node.exe not found. Install Node.js or configure nvm-windows."
        exit 1
    }
}

# Load token from .azure env file if not already set
if (-not $env:SWA_CLI_DEPLOYMENT_TOKEN) {
    $envFile = Join-Path $root ".azure\storage-upload\.env"
    if (Test-Path $envFile) {
        Get-Content $envFile | ForEach-Object {
            if ($_ -match '^\s*SWA_CLI_DEPLOYMENT_TOKEN\s*=\s*"?([^"]+)"?\s*$') {
                $env:SWA_CLI_DEPLOYMENT_TOKEN = $Matches[1]
            }
        }
    }
}

if (-not $env:SWA_CLI_DEPLOYMENT_TOKEN) {
    Write-Error "SWA_CLI_DEPLOYMENT_TOKEN is not set. Provide it via environment variable or .azure/storage-upload/.env"
    exit 1
}

Write-Host "Deploying to environment: $Environment" -ForegroundColor Cyan

swa deploy `
    --output-location (Join-Path $root "src") `
    --api-location (Join-Path $root "api") `
    --api-language node `
    --api-version 18 `
    --env $Environment

if ($LASTEXITCODE -ne 0) {
    Write-Error "Deployment failed with exit code $LASTEXITCODE"
    exit $LASTEXITCODE
}

Write-Host "Deployment to '$Environment' completed successfully." -ForegroundColor Green
