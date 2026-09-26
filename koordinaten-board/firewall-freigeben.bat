@echo off
rem Firewall fuer das Koordinaten-Board freigeben (fragt einmal nach Admin-Rechten)
set "PORT_NR=%PORT%"
if "%PORT_NR%"=="" set "PORT_NR=3000"

net session >nul 2>&1
if %errorlevel% neq 0 (
  echo Frage nach Administrator-Rechten fuer die Firewall-Freigabe ...
  powershell -NoProfile -Command "Start-Process powershell -Verb RunAs -ArgumentList '-NoProfile -ExecutionPolicy Bypass -File \"%~dp0werkzeuge\firewall-freigeben.ps1\" -Port %PORT_NR%'"
  exit /b
)
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0werkzeuge\firewall-freigeben.ps1" -Port %PORT_NR%
