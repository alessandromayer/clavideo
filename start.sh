#!/bin/bash
echo ""
echo "🎬  Iniciando VIRADA-VIDEO..."
echo ""

# Build frontend if dist doesn't exist
if [ ! -d "frontend/dist" ]; then
  echo "📦  Compilando frontend..."
  cd frontend && npm install && npm run build && cd ..
fi

# Start backend (serves frontend too)
cd backend
npm start
