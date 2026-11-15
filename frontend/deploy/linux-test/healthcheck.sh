#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="$SCRIPT_DIR/.env"
COMPOSE=(docker compose --env-file "$ENV_FILE" -f "$SCRIPT_DIR/compose.yml")

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Konfiguration fehlt: $ENV_FILE" >&2
  exit 1
fi

APP_ORIGIN="$(sed -n 's/^APP_ORIGIN=//p' "$ENV_FILE" | head -n 1)"
if [[ ! "$APP_ORIGIN" =~ ^https?://[A-Za-z0-9.-]+(:[0-9]{1,5})?$ ]]; then
  echo "APP_ORIGIN in .env ist ungültig." >&2
  exit 1
fi

curl --fail --silent --show-error "${APP_ORIGIN}/api/v1/health"
echo
"${COMPOSE[@]}" ps
