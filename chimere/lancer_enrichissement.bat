@echo off
chcp 65001 >nul
cd /d "%~dp0"
title Chimere - enrichissement BoardGameGeek
echo ============================================
echo  Chimere - enrichissement BoardGameGeek
echo ============================================
echo.
echo Compter 10 a 15 minutes. Ne fermez pas cette fenetre.
echo Si le script s'arrete, relancez-le : il reprend ou il en etait.
echo.

set PY=
where py >nul 2>&1 && set PY=py -3
if "%PY%"=="" ( where python >nul 2>&1 && set PY=python )

if "%PY%"=="" (
  echo Python est introuvable.
  echo.
  echo Installez Python 3 depuis le Microsoft Store ^(cherchez "Python 3.12"^),
  echo ou depuis https://www.python.org/downloads/ en cochant
  echo "Add python.exe to PATH" pendant l'installation.
  echo Relancez ensuite ce fichier.
  echo.
  pause
  exit /b 1
)

if not exist "chimere_tirage.html" (
  echo Fichier chimere_tirage.html introuvable dans ce dossier :
  echo   %CD%
  echo.
  echo Ce lanceur doit se trouver dans le meme dossier que chimere_tirage.html
  echo et enrichir_chimere.py. Si vos fichiers sont encore dans un ZIP,
  echo faites d'abord clic droit -^> Extraire tout.
  echo.
  pause
  exit /b 1
)

%PY% -X utf8 enrichir_chimere.py
set CODE=%ERRORLEVEL%
echo.
if "%CODE%"=="0" (
  echo Termine. Ouvrez chimere_tirage_enrichi.html par double-clic.
) else (
  echo Le script s'est arrete avant la fin ^(code %CODE%^).
  echo Lisez le message ci-dessus : il indique quoi faire.
)
echo.
pause
