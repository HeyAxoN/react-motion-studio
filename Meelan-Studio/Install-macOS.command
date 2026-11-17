#!/bin/bash
set -euo pipefail
MS_PACKAGE="$(cd "$(dirname "$0")" && pwd)"
MS_TARGET="$HOME/Library/Application Support/Adobe/CEP/extensions/com.meelan.studio"
MS_STATE="$HOME/Library/Application Support/MeelanStudio"
echo 'MEELAN STUDIO 2.1.0 - After Effects 2026'
echo 'Close After Effects first. This unsigned local build enables Adobe CEP developer loading.'
echo 'This allows unsigned CEP extensions for your account. Uninstall can restore the previous setting.'
read -r -p 'Type INSTALL to install and enable developer loading: ' MS_ANSWER
[[ "$MS_ANSWER" == INSTALL ]] || exit 0
if pgrep -f '/Adobe After Effects.*\.app/Contents/MacOS/' >/dev/null; then echo 'Close After Effects and try again.'; exit 1; fi
[[ -f "$MS_PACKAGE/extension/CSXS/manifest.xml" ]] || { echo 'Extract the entire ZIP first.'; exit 1; }
(cd "$MS_PACKAGE" && shasum -a 256 -c checksums.sha256) || { echo 'Package integrity check failed.'; exit 1; }
mkdir -p "$MS_STATE" "$(dirname "$MS_TARGET")"
if [[ ! -f "$MS_STATE/cep-previous.txt" ]]; then
  if MS_PREVIOUS=$(defaults read com.adobe.CSXS.12 PlayerDebugMode 2>/dev/null); then printf '%s\n' "$MS_PREVIOUS" > "$MS_STATE/cep-previous.txt"; else echo __ABSENT__ > "$MS_STATE/cep-previous.txt"; fi
fi
MS_BACKUP=''
if [[ -d "$MS_TARGET" ]]; then
  [[ -f "$MS_TARGET/CSXS/manifest.xml" ]] && /usr/bin/grep -q 'com.meelan.studio' "$MS_TARGET/CSXS/manifest.xml" || { echo 'Unexpected destination folder. Installation stopped.'; exit 1; }
  MS_BACKUP="$MS_STATE/ExtensionBackups/$(date +%Y%m%d-%H%M%S)"
  mkdir -p "$(dirname "$MS_BACKUP")"
  mv "$MS_TARGET" "$MS_BACKUP"
fi
if ! ditto "$MS_PACKAGE/extension" "$MS_TARGET"; then
  [[ ! -d "$MS_TARGET" ]] || mv "$MS_TARGET" "$MS_STATE/failed-$(date +%s)"
  [[ -z "$MS_BACKUP" ]] || mv "$MS_BACKUP" "$MS_TARGET"
  echo 'Copy failed. The previous installation was restored.'; exit 1
fi
defaults write com.adobe.CSXS.12 PlayerDebugMode 1
echo 'Installed. Open After Effects > Window > Extensions > Meelan Studio.'
echo 'AE Preferences > Scripting & Expressions: enable Allow Scripts to Write Files and Access Network.'
read -r -p 'Press Return to close.' MS_DONE
