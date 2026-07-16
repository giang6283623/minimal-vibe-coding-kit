#!/usr/bin/env sh
set -eu
# Target is the first argument only when it is not an option; flags may come in any position.
TARGET="."
if [ "$#" -gt 0 ] && [ "${1#-}" = "$1" ]; then
  TARGET="$1"
  shift
fi
SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
node "$SCRIPT_DIR/.vibekit/scripts/mvck.mjs" install "$TARGET" --profile all "$@"
