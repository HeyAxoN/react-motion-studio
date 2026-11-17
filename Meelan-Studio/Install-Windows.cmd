@echo off
rem ExecutionPolicy applies only to this installer process; managed policy still takes precedence.
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0Install-Windows.ps1"
pause
