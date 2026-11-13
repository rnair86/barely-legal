Set-Location (Split-Path $PSScriptRoot -Parent)
docker compose up -d --build
Write-Host "Running at http://localhost:8000"
