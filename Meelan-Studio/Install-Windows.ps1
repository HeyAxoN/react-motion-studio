$ErrorActionPreference = 'Stop'
try {
    Write-Host "`nMEELAN STUDIO 2.1.0 - After Effects 2026" -ForegroundColor Magenta
    Write-Host 'Close After Effects before installing.'
    Write-Host 'This unsigned local build uses Adobe CEP developer loading (CSXS.12 PlayerDebugMode).'
    Write-Host 'This allows unsigned CEP extensions for your Windows account. Uninstall can restore the previous value.'
    Write-Host 'No administrator access is needed. Your composition collection stays in Documents.'
    if ((Read-Host 'Install and enable developer loading? Type INSTALL') -cne 'INSTALL') { exit 0 }
    if (Get-Process AfterFX -ErrorAction SilentlyContinue) { throw 'Close After Effects, then run this installer again.' }
    $Payload = Join-Path $PSScriptRoot 'extension'
    $Manifest = Join-Path $Payload 'CSXS\manifest.xml'
    if (!(Test-Path $Manifest)) { throw 'Extract the entire ZIP first. The extension folder is missing.' }
    $Checks = Get-Content (Join-Path $PSScriptRoot 'checksums.json') -Raw | ConvertFrom-Json
    foreach ($Item in $Checks) {
        $File = Join-Path $PSScriptRoot $Item.path
        if (!(Test-Path $File) -or (Get-FileHash -LiteralPath $File -Algorithm SHA256).Hash.ToLowerInvariant() -ne $Item.sha256) { throw ('Package integrity check failed: ' + $Item.path) }
    }
    $State = Join-Path $env:LOCALAPPDATA 'MeelanStudio'
    $Target = Join-Path $env:APPDATA 'Adobe\CEP\extensions\com.meelan.studio'
    $Registry = 'HKCU:\Software\Adobe\CSXS.12'
    New-Item -ItemType Directory -Force -Path $State | Out-Null
    $Receipt = Join-Path $State 'install-receipt.json'
    if (!(Test-Path $Receipt)) {
        $Previous = Get-ItemProperty -Path $Registry -Name PlayerDebugMode -ErrorAction SilentlyContinue
        @{ existed = ($null -ne $Previous); value = $(if ($Previous) { $Previous.PlayerDebugMode } else { $null }); target = $Target } | ConvertTo-Json | Set-Content -LiteralPath $Receipt -Encoding UTF8
    }
    $Backup = $null
    if (Test-Path $Target) {
        $Existing = Join-Path $Target 'CSXS\manifest.xml'
        if (!(Test-Path $Existing) -or !((Get-Content $Existing -Raw).Contains('com.meelan.studio'))) { throw 'The destination exists but does not identify as Meelan Studio. Installation stopped.' }
        $Backup = Join-Path $State ('ExtensionBackups\' + (Get-Date -Format 'yyyyMMdd-HHmmss-fff'))
        New-Item -ItemType Directory -Force -Path (Split-Path $Backup) | Out-Null
        Move-Item -LiteralPath $Target -Destination $Backup
    }
    try {
        New-Item -ItemType Directory -Force -Path (Split-Path $Target) | Out-Null
        Copy-Item -LiteralPath $Payload -Destination $Target -Recurse
        if (!(Test-Path $Registry)) { New-Item -Path $Registry -Force | Out-Null }
        New-ItemProperty -Path $Registry -Name PlayerDebugMode -Value '1' -PropertyType String -Force | Out-Null
    } catch {
        if (Test-Path $Target) { Remove-Item -LiteralPath $Target -Recurse -Force }
        if ($Backup) { Move-Item -LiteralPath $Backup -Destination $Target }
        throw
    }
    Write-Host "`nInstalled. Open AE > Window > Extensions > Meelan Studio." -ForegroundColor Green
    Write-Host 'In AE Preferences > Scripting & Expressions, enable Allow Scripts to Write Files and Access Network.'
    Write-Host 'The current extension runs offline and does not send footage to a server.'
    Write-Host ('Installed at: ' + $Target)
} catch { Write-Host ("`nInstallation failed: " + $_.Exception.Message) -ForegroundColor Red; exit 1 }
