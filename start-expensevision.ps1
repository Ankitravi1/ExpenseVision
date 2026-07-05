# Start the ExpenseVision stack locally in the current VS Code terminal:
#   PS C:\Extrad\Project\ExpenseVision> .\start-expensevision.ps1
#
# Starts as PowerShell background jobs and streams logs into this same terminal:
#   - Backend -> http://localhost:5000/api/health
#   - Web     -> http://localhost:3000
#
# Optional:
#   - .\start-expensevision.ps1 -WithMobile
#       Also starts Expo for Android. Keep an Android emulator running first.
#   - .\start-expensevision.ps1 -MobileOnly
#       Starts only Expo for Android.
#   - .\start-expensevision.ps1 -WithPrismaStudio
#       Also starts Prisma Studio.
#
# Press Ctrl+C to stop all jobs started by this script.

param(
  [switch]$WithMobile,
  [switch]$MobileOnly,
  [switch]$WithPrismaStudio
)

$root = $PSScriptRoot
$jobs = @()

function Start-StackJob {
  param(
    [string]$Name,
    [string]$Path,
    [string]$Command
  )

  Write-Host "Starting $Name..." -ForegroundColor Cyan
  $job = Start-Job -Name $Name -ScriptBlock {
    param($JobPath, $JobCommand)
    Set-Location $JobPath
    Invoke-Expression $JobCommand
  } -ArgumentList $Path, $Command

  $script:jobs += $job
}

function Stop-StackJobs {
  if (@($jobs).Count -eq 0) { return }

  Write-Host ''
  Write-Host 'Stopping ExpenseVision services...' -ForegroundColor Yellow
  foreach ($job in $jobs) {
    Stop-Job -Job $job -ErrorAction SilentlyContinue
    Remove-Job -Job $job -Force -ErrorAction SilentlyContinue
  }
}

try {
  if (-not $MobileOnly) {
    Start-StackJob -Name 'backend' -Path "$root\backend" -Command 'npm run dev'
    Start-StackJob -Name 'web' -Path "$root\web" -Command 'npm run dev'
  }

  if ($WithMobile -or $MobileOnly) {
    Start-StackJob -Name 'mobile' -Path "$root\mobile" -Command 'npx expo start --android'
  }

  if ($WithPrismaStudio -and -not $MobileOnly) {
    Start-StackJob -Name 'prisma' -Path "$root\backend" -Command 'npx prisma studio'
  }

  Write-Host ''
  Write-Host 'Started ExpenseVision in this terminal:' -ForegroundColor Green
  if (-not $MobileOnly) {
    Write-Host '  backend  http://localhost:5000/api/health'
    Write-Host '  web      http://localhost:3000'
  }
  if ($WithMobile -or $MobileOnly) {
    Write-Host '  mobile   Expo Android (emulator required)'
  }
  if ($WithPrismaStudio -and -not $MobileOnly) {
    Write-Host '  prisma   Studio'
  }
  Write-Host ''
  Write-Host 'Press Ctrl+C to stop all started services.' -ForegroundColor Yellow
  Write-Host ''

  while ($true) {
    foreach ($job in @($jobs)) {
      $lines = Receive-Job -Job $job -ErrorAction SilentlyContinue
      foreach ($line in $lines) {
        Write-Host "[$($job.Name)] $line"
      }

      if ($job.State -in @('Failed', 'Completed', 'Stopped')) {
        $remaining = Receive-Job -Job $job -ErrorAction SilentlyContinue
        foreach ($line in $remaining) {
          Write-Host "[$($job.Name)] $line"
        }
        Write-Host "[$($job.Name)] exited with state $($job.State)" -ForegroundColor Yellow
        $jobs = @($jobs | Where-Object { $_.Id -ne $job.Id })
        Remove-Job -Job $job -Force -ErrorAction SilentlyContinue
      }
    }

    if (@($jobs).Count -eq 0) { break }
    Start-Sleep -Milliseconds 300
  }
}
finally {
  Stop-StackJobs
}
