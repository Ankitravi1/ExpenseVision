# Start the ExpenseVision stack, each service in its OWN separate terminal.
#
#   PS C:\Extrad\Project\ExpenseVision> .\start-expensevision.ps1
#       Opens backend + web, each in its own terminal.
#
#   .\start-expensevision.ps1 -WithMobile     # also opens Expo (Android emulator required)
#   .\start-expensevision.ps1 -MobileOnly     # only Expo
#   .\start-expensevision.ps1 -WithPrismaStudio
#
# ── Want them as VS Code INTEGRATED terminal tabs instead? ──────────────────
# A script can't create VS Code integrated terminals, but a task can:
#   Ctrl+Shift+P → "Tasks: Run Task" → "Start ExpenseVision (all)"
# That opens backend/web/mobile as three separate (unsplit) terminal tabs.
# See .vscode/tasks.json.
# ────────────────────────────────────────────────────────────────────────────
#
# This script opens each service in a separate window. It uses Windows Terminal
# (wt) tabs when available, otherwise separate PowerShell windows. Close a
# window (or Ctrl+C inside it) to stop that service.

param(
  [switch]$WithMobile,
  [switch]$MobileOnly,
  [switch]$WithPrismaStudio
)

$root = $PSScriptRoot

# Build the list of services to launch: name, working dir, command.
$services = @()
if (-not $MobileOnly) {
  $services += [pscustomobject]@{ Name = 'backend'; Path = "$root\backend"; Command = 'npm run dev' }
  $services += [pscustomobject]@{ Name = 'web';     Path = "$root\web";     Command = 'npm run dev' }
}
if ($WithMobile -or $MobileOnly) {
  $services += [pscustomobject]@{ Name = 'mobile';  Path = "$root\mobile";  Command = 'npx expo start --android' }
}
if ($WithPrismaStudio -and -not $MobileOnly) {
  $services += [pscustomobject]@{ Name = 'prisma';  Path = "$root\backend"; Command = 'npx prisma studio' }
}

# Prefer Windows Terminal so the services land as tabs in one window.
$wt = Get-Command wt.exe -ErrorAction SilentlyContinue

if ($wt) {
  # First service opens a new window; the rest attach as new tabs.
  $first = $services[0]
  Write-Host "Opening $($first.Name) ..." -ForegroundColor Cyan
  Start-Process wt.exe -ArgumentList @(
    'new-tab', '--title', $first.Name, '-d', $first.Path,
    'powershell', '-NoExit', '-Command', $first.Command
  )
  Start-Sleep -Milliseconds 600

  foreach ($svc in $services[1..($services.Count - 1)]) {
    Write-Host "Opening $($svc.Name) ..." -ForegroundColor Cyan
    Start-Process wt.exe -ArgumentList @(
      '-w', '0', 'new-tab', '--title', $svc.Name, '-d', $svc.Path,
      'powershell', '-NoExit', '-Command', $svc.Command
    )
    Start-Sleep -Milliseconds 400
  }
}
else {
  # Fallback: a separate PowerShell window per service.
  foreach ($svc in $services) {
    Write-Host "Opening $($svc.Name) ..." -ForegroundColor Cyan
    Start-Process powershell -ArgumentList @(
      '-NoExit', '-Command',
      "Set-Location '$($svc.Path)'; `$host.UI.RawUI.WindowTitle = '$($svc.Name)'; $($svc.Command)"
    )
    Start-Sleep -Milliseconds 300
  }
}

Write-Host ''
Write-Host 'Started ExpenseVision (each service in its own terminal):' -ForegroundColor Green
if (-not $MobileOnly) {
  Write-Host '  backend  http://localhost:5000/api/health   docs: http://localhost:5000/api/docs'
  Write-Host '  web      http://localhost:3000'
}
if ($WithMobile -or $MobileOnly) {
  Write-Host '  mobile   Expo Android (emulator required)'
}
if ($WithPrismaStudio -and -not $MobileOnly) {
  Write-Host '  prisma   Studio'
}
Write-Host ''
Write-Host 'Close a terminal (or Ctrl+C inside it) to stop that service.' -ForegroundColor Yellow
Write-Host 'Tip: for VS Code integrated terminals, run the "Start ExpenseVision (all)" task.' -ForegroundColor DarkGray
