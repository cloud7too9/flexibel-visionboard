@echo off
rem Koordinaten-Board starten: Server + Anzeige im Vollbild (Edge-Kiosk)
cd /d "%~dp0"

if not exist server\node_modules (
  echo Installiere Abhaengigkeiten ...
  call npm run installieren || goto fehler
)
if not exist client\dist (
  echo Baue Oberflaeche ...
  call npm run build || goto fehler
)

rem Anzeige nach kurzer Wartezeit im Vollbild oeffnen
start "" cmd /c "timeout /t 3 >nul && start msedge --kiosk http://localhost:3000/anzeige --edge-kiosk-type=fullscreen --no-first-run"

node server\src\server.js
goto :eof

:fehler
echo.
echo Fehler beim Vorbereiten. Ist Node.js installiert und im PATH?
pause
