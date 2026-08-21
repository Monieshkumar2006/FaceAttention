Write-Host "==================================================" -ForegroundColor Cyan
Write-Host " Starting FocusVision AI - React + Vite Frontend" -ForegroundColor Green
Write-Host "==================================================" -ForegroundColor Cyan

$env:PATH = "C:\Program Files\nodejs;$env:PATH"
Set-Location "$PSScriptRoot\frontend"

& "C:\Program Files\nodejs\npm.cmd" run dev
