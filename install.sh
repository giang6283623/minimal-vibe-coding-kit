#!/usr/bin/env sh
set -eu
TARGET="${1:-.}"
if [ "$#" -gt 0 ]; then
  shift
fi
SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
node "$SCRIPT_DIR/.vbkit-scripts/mvck.mjs" install "$TARGET" --profile all "$@"
