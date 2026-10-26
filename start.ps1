$backendDir = Join-Path $PSScriptRoot "backend"
$frontendDir = Join-Path $PSScriptRoot "frontend"

Write-Host "Starting Backend on http://localhost:8000..." -ForegroundColor Green
Start-Process powershell -WorkingDirectory $backendDir -ArgumentList "-NoExit -Command `"if (Test-Path venv\Scripts\python.exe) { .\venv\Scripts\python.exe -m uvicorn main:app --reload --port 8000 } else { python -m uvicorn main:app --reload --port 8000 }`""

Write-Host "Starting Frontend on http://localhost:5173..." -ForegroundColor Green
Start-Process powershell -WorkingDirectory $frontendDir -ArgumentList "-NoExit -Command `"npm run dev`""

Write-Host "EduFocus AI started successfully!" -ForegroundColor Cyan
Write-Host "Frontend: http://localhost:5173" -ForegroundColor Yellow
Write-Host "Backend API: http://localhost:8000" -ForegroundColor Yellow
