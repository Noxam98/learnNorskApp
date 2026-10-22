#!/usr/bin/env bash
# Выпуск APK для самообновления (src/native/apkUpdate.js): собрать и выложить в GitHub Release
# ПАРОЙ — learnnorsk.apk + app.json { versionCode, versionName, apk, sha256 }. Приложение читает
# app.json последнего релиза, поэтому манифест не может опередить сам файл.
#
# Перед запуском: поднять versionCode/versionName в android/app/build.gradle (одинаковый
# versionCode установщик не примет как обновление) и закоммитить.
# Сборка — debug-вариант: все раздававшиеся APK подписаны ключом ~/.android/debug.keystore,
# а обновление встаёт поверх только с тем же ключом. Сменить ключ = всем переустановить вручную.
#
# usage: npm run release:apk -- "что нового (необязательно)"
set -euo pipefail
cd "$(dirname "$0")/.."

REPO=Noxam98/learnNorskApp
GRADLE=android/app/build.gradle
code=$(sed -n 's/^[[:space:]]*versionCode \([0-9][0-9]*\).*/\1/p' "$GRADLE" | head -1)
name=$(sed -n 's/^[[:space:]]*versionName "\([^"]*\)".*/\1/p' "$GRADLE" | head -1)
if [ -z "$code" ] || [ -z "$name" ]; then echo "не нашёл versionCode/versionName в $GRADLE" >&2; exit 1; fi

# уже выпущенный versionCode повторно не выпускаем — приложения его не примут как новый
released=$(curl -fsSL "https://github.com/$REPO/releases/latest/download/app.json" 2>/dev/null \
    | sed -n 's/.*"versionCode":[[:space:]]*\([0-9][0-9]*\).*/\1/p' || true)
if [ -n "$released" ] && [ "$code" -le "$released" ]; then
    echo "versionCode $code не больше выпущенного ($released) — подними его в $GRADLE" >&2; exit 1
fi
tag="apk-v${name}-${code}"
if gh release view "$tag" -R "$REPO" >/dev/null 2>&1; then echo "релиз $tag уже есть" >&2; exit 1; fi
if [ -n "$(git status --porcelain -- src android capacitor.config.json package.json)" ]; then
    echo "внимание: есть незакоммиченные изменения — они попадут в APK" >&2
fi

npm run android:sync
(cd android && ./gradlew assembleDebug -q)

tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT
cp android/app/build/outputs/apk/debug/app-debug.apk "$tmp/learnnorsk.apk"
sha=$(sha256sum "$tmp/learnnorsk.apk" | cut -d' ' -f1)
url="https://github.com/$REPO/releases/download/$tag/learnnorsk.apk"
printf '{"versionCode":%s,"versionName":"%s","apk":"%s","sha256":"%s"}\n' "$code" "$name" "$url" "$sha" > "$tmp/app.json"

gh release create "$tag" "$tmp/learnnorsk.apk" "$tmp/app.json" -R "$REPO" \
    --title "Norsk $name ($code)" --notes "${1:-APK $name ($code)}" --latest
echo "выпущено: $url"
