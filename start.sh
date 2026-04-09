#!/bin/bash
# Budget Duo - Script de démarrage

set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "======================================"
echo "  💑  Budget Duo - Suivi de dépenses"
echo "======================================"
echo ""

# Install backend deps if needed
cd "$SCRIPT_DIR/backend"
if ! python3 -c "import fastapi" 2>/dev/null; then
  echo "[0/3] Installation des dépendances backend..."
  pip install -r requirements.txt -q
fi

# Install frontend deps if needed
cd "$SCRIPT_DIR/frontend"
if [ ! -d "node_modules" ]; then
  echo "[0/3] Installation des dépendances frontend..."
  npm install -q
fi

# Start backend
echo "[1/2] Démarrage du backend sur http://localhost:8000"
cd "$SCRIPT_DIR/backend"
uvicorn main:app --host 0.0.0.0 --port 8000 --reload &
BACKEND_PID=$!

# Wait for backend
sleep 2

# Start frontend
echo "[2/2] Démarrage du frontend sur http://localhost:3000"
cd "$SCRIPT_DIR/frontend"
npm run dev &
FRONTEND_PID=$!

echo ""
echo "✅ App disponible sur :"
echo ""
IP=$(hostname -I 2>/dev/null | awk '{print $1}' || echo "VOTRE_IP")
echo "  👉 Local :   http://localhost:3000"
echo "  👉 Réseau :  http://${IP}:3000  (partagez cette URL avec votre iPhone)"
echo ""
echo "📱 Sur iPhone :"
echo "  1. Ouvrez Safari → http://${IP}:3000"
echo "  2. Appuyez sur Partager → 'Sur l'écran d'accueil'"
echo "  3. L'app apparaît comme une vraie app !"
echo ""
echo "API docs : http://localhost:8000/docs"
echo ""
echo "Ctrl+C pour arrêter"

trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit 0" INT TERM

wait
