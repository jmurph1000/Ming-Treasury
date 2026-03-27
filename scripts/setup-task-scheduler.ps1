# setup-task-scheduler.ps1
# Registers a Windows Task Scheduler task to run daily-cash-ingest.mjs
# at 9:30 AM ET every weekday (Mon-Fri).
#
# Usage (run as Administrator):
#   powershell -ExecutionPolicy Bypass -File scripts\setup-task-scheduler.ps1

$TaskName = "GustoTreasury-DailyCashIngest"
$ProjectRoot = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$ScriptPath = Join-Path $ProjectRoot "scripts\daily-cash-ingest.mjs"
$NodePath = (Get-Command node -ErrorAction SilentlyContinue).Source

if (-not $NodePath) {
    Write-Error "Node.js not found in PATH. Install Node.js first."
    exit 1
}

Write-Host "=== Gusto Treasury - Task Scheduler Setup ===" -ForegroundColor Green
Write-Host "Task Name:    $TaskName"
Write-Host "Script:       $ScriptPath"
Write-Host "Node:         $NodePath"
Write-Host "Schedule:     Weekdays at 9:30 AM ET"
Write-Host ""

# Remove existing task if present
$existing = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
if ($existing) {
    Write-Host "Removing existing task..." -ForegroundColor Yellow
    Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
}

# Create the action: node scripts/daily-cash-ingest.mjs
$action = New-ScheduledTaskAction `
    -Execute $NodePath `
    -Argument "`"$ScriptPath`"" `
    -WorkingDirectory $ProjectRoot

# Create the trigger: weekdays at 9:30 AM
# Note: Task Scheduler uses local time. ET = Eastern Time.
# If this machine is in a different timezone, adjust accordingly.
$trigger = New-ScheduledTaskTrigger `
    -Weekly `
    -DaysOfWeek Monday,Tuesday,Wednesday,Thursday,Friday `
    -At "9:30AM"

# Settings: run whether user is logged in or not, don't stop on battery
$settings = New-ScheduledTaskSettingsSet `
    -AllowStartIfOnBatteries `
    -DontStopIfGoingOnBatteries `
    -StartWhenAvailable `
    -ExecutionTimeLimit (New-TimeSpan -Minutes 10)

# Register the task
Register-ScheduledTask `
    -TaskName $TaskName `
    -Action $action `
    -Trigger $trigger `
    -Settings $settings `
    -Description "Daily ingestion of Treasury Flash cash balance data from Google Sheets into treasury.db" `
    -RunLevel Highest

Write-Host ""
Write-Host "Task registered successfully!" -ForegroundColor Green
Write-Host "To verify: Get-ScheduledTask -TaskName '$TaskName'"
Write-Host "To run now: Start-ScheduledTask -TaskName '$TaskName'"
Write-Host "To remove:  Unregister-ScheduledTask -TaskName '$TaskName'"
