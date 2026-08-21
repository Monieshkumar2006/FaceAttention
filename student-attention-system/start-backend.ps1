Write-Host "==================================================" -ForegroundColor Cyan
Write-Host " Starting FocusVision AI - FastAPI Backend Server" -ForegroundColor Green
Write-Host "==================================================" -ForegroundColor Cyan

$env:PYTHONPATH = "$PSScriptRoot\backend"
Set-Location "$PSScriptRoot\backend"

py -3.14 -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
