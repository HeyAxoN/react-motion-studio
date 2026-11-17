#!/bin/bash
set -euo pipefail
MS_TARGET="$HOME/Library/Application Support/Adobe/CEP/extensions/com.meelan.studio"
MS_STATE="$HOME/Library/Application Support/MeelanStudio"
read -r -p 'Close AE. Type REMOVE to uninstall Meelan Studio (saved compositions stay): ' MS_ANSWER
[[ "$MS_ANSWER" == REMOVE ]] || exit 0
if pgrep -f '/Adobe After Effects.*\.app/Contents/MacOS/' >/dev/null; then echo 'Close After Effects first.'; exit 1; fi
if [[ -d "$MS_TARGET" ]]; then
  /usr/bin/grep -q 'com.meelan.studio' "$MS_TARGET/CSXS/manifest.xml" || { echo 'Unexpected destination.'; exit 1; }
  mkdir -p "$MS_STATE/ExtensionBackups"
  mv "$MS_TARGET" "$MS_STATE/ExtensionBackups/removed-$(date +%Y%m%d-%H%M%S)"
fi
if [[ -f "$MS_STATE/cep-previous.txt" ]]; then
  read -r -p 'Restore previous CEP developer loading setting? This can affect other unsigned extensions. Type YES: ' MS_RESTORE
  if [[ "$MS_RESTORE" == YES ]] && [[ "$(defaults read com.adobe.CSXS.12 PlayerDebugMode 2>/dev/null || true)" == 1 ]]; then
    MS_PREVIOUS=$(cat "$MS_STATE/cep-previous.txt")
    if [[ "$MS_PREVIOUS" == __ABSENT__ ]]; then defaults delete com.adobe.CSXS.12 PlayerDebugMode; else defaults write com.adobe.CSXS.12 PlayerDebugMode "$MS_PREVIOUS"; fi
    rm "$MS_STATE/cep-previous.txt"
  fi
fi
echo 'Extension removed. Your compositions and media remain in place.'
read -r -p 'Press Return to close.' MS_DONE
