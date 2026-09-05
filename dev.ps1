# Development startup script for Sign Language Interpreter
# Run with: powershell -ExecutionPolicy Bypass -File dev.ps1

Write-Host "Starting Sign Language Interpreter development servers..." -ForegroundColor Green

# Start backend in background
Write-Host "Starting FastAPI backend on http://localhost:8000" -ForegroundColor Cyan
cd backend
Start-Process powershell -ArgumentList "-NoExit", "-Command", "python main.py" -WindowStyle Normal

# Wait a moment for backend to start
Start-Sleep -Seconds 3

# Start frontend
Write-Host "Starting Vite frontend on http://localhost:5173" -ForegroundColor Cyan
cd ..\frontend
npm run dev