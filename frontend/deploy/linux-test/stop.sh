#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
COMPOSE=(docker compose --env-file "$SCRIPT_DIR/.env" -f "$SCRIPT_DIR/compose.yml")

if [[ ! -f "$SCRIPT_DIR/.env" ]]; then
  echo "Konfiguration fehlt: $SCRIPT_DIR/.env" >&2
  exit 1
fi
"${COMPOSE[@]}" stop
