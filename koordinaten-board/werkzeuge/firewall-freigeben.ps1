# Koordinaten-Board: Firewall-Freigabe für Handys im eigenen Netz (Windows)
#
# 1. Entfernt Blockier-Regeln für node.exe. Windows legt die automatisch an, wenn man
#    die Firewall-Abfrage beim ersten Start wegklickt – und Blockieren schlägt Erlauben.
# 2. Erlaubt eingehende Verbindungen auf dem Board-Port – nur aus dem lokalen Netz
#    (remoteip=LocalSubnet), in allen Profilen, damit es auch klappt, wenn Windows
#    das WLAN als „Öffentlich“ eingestuft hat.
param([int]$Port = 3000)

$Name = 'Koordinaten-Board'
Write-Host ''
Write-Host "  Firewall-Freigabe für $Name (Port $Port)" -ForegroundColor Cyan
Write-Host ''

# 1. Blockier-Regeln für node.exe finden und entfernen
$blockiert = Get-NetFirewallRule -Direction Inbound -Action Block -ErrorAction SilentlyContinue |
  Where-Object { ($_ | Get-NetFirewallApplicationFilter).Program -like '*node.exe' }
if ($blockiert) {
  $blockiert | ForEach-Object { Write-Host "  Entferne Blockade: $($_.DisplayName) [$($_.Profile)]" }
  $blockiert | Remove-NetFirewallRule
} else {
  Write-Host '  Keine Blockier-Regel für node.exe gefunden.'
}

# 2. Alte eigene Regel ersetzen, neue anlegen
Get-NetFirewallRule -DisplayName $Name -ErrorAction SilentlyContinue | Remove-NetFirewallRule
New-NetFirewallRule -DisplayName $Name -Direction Inbound -Action Allow -Protocol TCP `
  -LocalPort $Port -RemoteAddress LocalSubnet -Profile Any | Out-Null
Write-Host "  Regel '$Name' angelegt: TCP $Port, nur lokales Netz." -ForegroundColor Green

# Hinweis zum Netzwerkprofil
$profile = Get-NetConnectionProfile -ErrorAction SilentlyContinue | Select-Object -First 1
if ($profile) {
  Write-Host "  Netzwerk: $($profile.Name) – Profil: $($profile.NetworkCategory)"
}

Write-Host ''
Write-Host '  Fertig. Das Fenster kann geschlossen werden.'
Start-Sleep -Seconds 4
