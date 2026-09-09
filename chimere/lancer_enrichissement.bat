@echo off
setlocal
chcp 65001 >nul 2>&1
cd /d "%~dp0"
title Chimere - enrichissement BoardGameGeek
echo ============================================
echo  Chimere - enrichissement BoardGameGeek
echo ============================================
echo.
echo Dossier : %CD%
echo.

set "PY="
where py    >nul 2>&1 && set "PY=py -3"
if not defined PY where python >nul 2>&1 && set "PY=python"
if not defined PY where python3 >nul 2>&1 && set "PY=python3"

if not defined PY (
  echo [X] Python est introuvable sur cet ordinateur.
  echo.
  echo     Installez-le depuis le Microsoft Store ^(cherchez "Python 3.12"^),
  echo     ou sur https://www.python.org/downloads/ en cochant
  echo     "Add python.exe to PATH". Puis relancez ce fichier.
  goto fin
)
echo Python detecte : %PY%

if not exist "enrichir_chimere.py" (
  echo [X] enrichir_chimere.py est absent de ce dossier.
  echo     Ce lanceur doit etre range a cote du script.
  goto fin
)
if not exist "chimere_tirage.html" (
  echo [X] chimere_tirage.html est absent de ce dossier.
  echo     Si vos fichiers sont encore dans un ZIP, faites d'abord
  echo     clic droit puis "Extraire tout".
  goto fin
)

echo.
echo Lancement... ne fermez pas cette fenetre.
echo.
%PY% -X utf8 "enrichir_chimere.py"
set "CODE=%ERRORLEVEL%"
echo.
if "%CODE%"=="0" (
  echo [OK] Termine. Ouvrez chimere_tirage_enrichi.html par double-clic.
) else (
  echo [!] Le script s'est arrete avant la fin ^(code %CODE%^).
  echo     Le fichier journal_chimere.txt contient le detail :
  echo     envoyez-le a Claude.
)

:fin
echo.
echo ---------------------------------------------------------
echo  Cette fenetre reste ouverte. Fermez-la quand vous voulez.
echo ---------------------------------------------------------
echo.
cmd /k
