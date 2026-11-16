param(
  [string]$Root = ""
)

$ErrorActionPreference = "Stop"

if (-not $Root) {
  $Root = Split-Path -Parent $PSScriptRoot
}
$Root = (Resolve-Path $Root).Path

# ASCII-only source: Korean names are assembled from code points so that
# PowerShell 5.1 (which reads BOM-less .ps1 as ANSI) cannot garble them.
$appName = -join @([char]0xC0AC, [char]0xC8FC, [char]0x0020, [char]0xC5ED, [char]0xC0B0)
$oldSuffix = -join @([char]0x0020, [char]0xC2E4, [char]0xD589)

$exe = Join-Path $Root ($appName + ".exe")
if (-not (Test-Path $exe)) {
  throw "Launcher executable not found: $exe"
}

$desktop = [Environment]::GetFolderPath("Desktop")
if (-not (Test-Path $desktop)) {
  throw "Desktop folder not found"
}

$lnk = Join-Path $desktop ($appName + ".lnk")
$old = Join-Path $desktop ($appName + $oldSuffix + ".lnk")
if (Test-Path $old) {
  Remove-Item $old -Force
}

$shell = New-Object -ComObject WScript.Shell
$shortcut = $shell.CreateShortcut($lnk)
$shortcut.TargetPath = $exe
$shortcut.WorkingDirectory = $Root
$shortcut.IconLocation = "$exe,0"
$shortcut.Description = "Saju Reverse"
$shortcut.Save()

Write-Output ("OK: " + $lnk)
