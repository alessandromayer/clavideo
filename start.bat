@echo off
echo.
echo 🎬  Iniciando VIRADA-VIDEO...
echo.

IF NOT EXIST "frontend\dist" (
  echo 📦  Compilando frontend...
  cd frontend && npm install && npm run build && cd ..
)

cd backend
npm start
