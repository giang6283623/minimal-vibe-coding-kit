param(
  [string]$Target = ".",
  [string]$Profile = "all",
  [switch]$Force,
  [switch]$DryRun,
  [switch]$Json
)

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ArgsList = @("install", $Target, "--profile", $Profile)
if ($Force) { $ArgsList += "--force" }
if ($DryRun) { $ArgsList += "--dry-run" }
if ($Json) { $ArgsList += "--json" }
node (Join-Path $ScriptDir "scripts/mvck.mjs") @ArgsList
