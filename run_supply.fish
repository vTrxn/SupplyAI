#!/bin/bash
echo "Iniciando SupplyAI..."

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"

cd "$SCRIPT_DIR/backend"
source venv/bin/activate
uvicorn app.main:app --reload --port 8000 &
BACKEND_PID=$!

cd "$SCRIPT_DIR/frontend"
npm run dev &
FRONTEND_PID=$!

echo "Servidores en línea."
echo "Frontend: http://localhost:5173"
echo "Backend: http://localhost:8000"
echo "Presiona Ctrl+C para apagar ambos."

trap "echo -e '\nApagando SupplyAI...'; kill $BACKEND_PID $FRONTEND_PID; exit" SIGINT

wait
