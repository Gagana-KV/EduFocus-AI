Write-Host "Starting Backend..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit -Command `"cd backend; if (Test-Path venv\Scripts\activate.ps1) { .\venv\Scripts\activate.ps1 }; uvicorn main:app --reload`""

Write-Host "Starting Frontend..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit -Command `"cd frontend; npm run dev`""

Write-Host "EduFocus AI started successfully! Terminals have been opened for both services." -ForegroundColor Cyan
