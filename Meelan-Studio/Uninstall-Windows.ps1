$ErrorActionPreference = 'Stop'
try {
    Write-Host 'Meelan Studio removal leaves your saved compositions and media in place.'
    if ((Read-Host 'Close AE. Type REMOVE to uninstall this extension') -cne 'REMOVE') { exit 0 }
    if (Get-Process AfterFX -ErrorAction SilentlyContinue) { throw 'Close After Effects first.' }
    $State = Join-Path $env:LOCALAPPDATA 'MeelanStudio'
    $Target = Join-Path $env:APPDATA 'Adobe\CEP\extensions\com.meelan.studio'
    $Registry = 'HKCU:\Software\Adobe\CSXS.12'
    $Receipt = Join-Path $State 'install-receipt.json'
    if (Test-Path $Target) {
        if (!((Get-Content (Join-Path $Target 'CSXS\manifest.xml') -Raw).Contains('com.meelan.studio'))) { throw 'The destination is not a Meelan Studio extension.' }
        $Backup = Join-Path $State ('ExtensionBackups\removed-' + (Get-Date -Format 'yyyyMMdd-HHmmss-fff'))
        New-Item -ItemType Directory -Force -Path (Split-Path $Backup) | Out-Null
        Move-Item -LiteralPath $Target -Destination $Backup
    }
    if (Test-Path $Receipt) {
        $Old = Get-Content $Receipt -Raw | ConvertFrom-Json
        $Now = Get-ItemProperty -Path $Registry -Name PlayerDebugMode -ErrorAction SilentlyContinue
        if ($Now -and $Now.PlayerDebugMode -eq '1' -and (Read-Host 'Restore the previous CEP developer loading setting? This can affect other unsigned extensions. Type YES') -ceq 'YES') {
            if ($Old.existed) { New-ItemProperty -Path $Registry -Name PlayerDebugMode -Value ([string]$Old.value) -PropertyType String -Force | Out-Null }
            else { Remove-ItemProperty -Path $Registry -Name PlayerDebugMode -ErrorAction SilentlyContinue }
            Remove-Item -LiteralPath $Receipt
        }
    }
    Write-Host 'Extension removed. Your composition collection is unchanged.' -ForegroundColor Green
} catch { Write-Host $_.Exception.Message -ForegroundColor Red; exit 1 }
