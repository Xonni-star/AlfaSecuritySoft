#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="$SCRIPT_DIR/.env"
COMPOSE=(docker compose --env-file "$ENV_FILE" -f "$SCRIPT_DIR/compose.yml")

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Konfiguration fehlt: $ENV_FILE" >&2
  exit 1
fi

if [[ "${1:-}" == "--remove-data" ]]; then
  COMPOSE_PROJECT_NAME="$(sed -n 's/^COMPOSE_PROJECT_NAME=//p' "$ENV_FILE" | head -n 1)"
  if [[ ! "$COMPOSE_PROJECT_NAME" =~ ^[a-z0-9][a-z0-9_-]*$ ]]; then
    echo "COMPOSE_PROJECT_NAME in .env ist ungültig." >&2
    exit 1
  fi
  printf 'Dies löscht alle Volumes des Testprojekts %s unwiderruflich. Bitte Projektname eingeben: ' "$COMPOSE_PROJECT_NAME"
  read -r CONFIRMATION
  if [[ "$CONFIRMATION" != "$COMPOSE_PROJECT_NAME" ]]; then
    echo "Abgebrochen; Daten wurden nicht gelöscht."
    exit 1
  fi
  "${COMPOSE[@]}" down --volumes --remove-orphans
else
  echo "Container/Netzwerk entfernen; Datenvolumes und .env bleiben erhalten."
  "${COMPOSE[@]}" down --remove-orphans
  echo "Zum Löschen der Testdaten erneut mit --remove-data ausführen."
fi
