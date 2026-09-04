#!/bin/bash
# Chimère — lance l'enrichissement BoardGameGeek (macOS/Linux : double-clic)
cd "$(dirname "$0")" || exit 1
echo "Chimère · enrichissement BoardGameGeek"
echo "Compter 10 à 15 minutes. Le script est reprenable : s'il s'arrête, relancez-le."
echo
if ! command -v python3 >/dev/null 2>&1; then
  echo "python3 est introuvable. Installez Python 3 depuis https://www.python.org/downloads/ puis relancez."
  read -r -p "Appuyez sur Entrée pour fermer."
  exit 1
fi
python3 enrichir_chimere.py
echo
echo "Terminé. Ouvrez chimere_tirage_enrichi.html par double-clic."
read -r -p "Appuyez sur Entrée pour fermer."
