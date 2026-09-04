@echo off
REM Chimere - lance l'enrichissement BoardGameGeek (Windows : double-clic)
cd /d "%~dp0"
echo Chimere - enrichissement BoardGameGeek
echo Compter 10 a 15 minutes. Le script est reprenable : s'il s'arrete, relancez-le.
echo.
where python >nul 2>&1
if errorlevel 1 (
  echo Python est introuvable. Installez Python 3 depuis https://www.python.org/downloads/
  echo en cochant "Add Python to PATH", puis relancez ce fichier.
  pause
  exit /b 1
)
python enrichir_chimere.py
echo.
echo Termine. Ouvrez chimere_tirage_enrichi.html par double-clic.
pause
