#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
RECIPES_DIR="$ROOT_DIR/recipes"
OUT_JSON="$RECIPES_DIR/index.json"
OUT_JS="$RECIPES_DIR/index.js"

mapfile -t files < <(find "$RECIPES_DIR" -maxdepth 1 -type f -name "*.cook" -printf "%f\n" | LC_ALL=C sort)

{
  echo "["
  for i in "${!files[@]}"; do
    printf '  "%s"' "${files[$i]}"
    if [[ $i -lt $((${#files[@]} - 1)) ]]; then
      echo ","
    else
      echo
    fi
  done
  echo "]"
} > "$OUT_JSON"

{
  echo "window.RECIPES_INDEX = ["
  for i in "${!files[@]}"; do
    printf '  "%s"' "${files[$i]}"
    if [[ $i -lt $((${#files[@]} - 1)) ]]; then
      echo ","
    else
      echo
    fi
  done
  echo "];"
} > "$OUT_JS"

printf "Wrote %s and %s with %s entries\n" "$OUT_JSON" "$OUT_JS" "${#files[@]}"
