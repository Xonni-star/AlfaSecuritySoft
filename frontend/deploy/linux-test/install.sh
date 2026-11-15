#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="$SCRIPT_DIR/.env"

if ! command -v docker >/dev/null 2>&1 || ! docker compose version >/dev/null 2>&1; then
  echo "Docker Engine und Docker Compose v2 werden benötigt." >&2
  exit 1
fi
if ! command -v openssl >/dev/null 2>&1; then
  echo "openssl wird zum sicheren Erzeugen der Test-Zugangsdaten benötigt." >&2
  exit 1
fi

if [[ -e "$ENV_FILE" ]]; then
  if [[ -L "$ENV_FILE" || ! -f "$ENV_FILE" ]]; then
    echo ".env muss eine reguläre Datei sein; Symlinks und andere Dateitypen werden abgelehnt." >&2
    exit 1
  fi
  chmod 600 "$ENV_FILE"
  echo "Vorhandene .env bleibt unverändert: $ENV_FILE"
  echo "Zum Starten ./start.sh ausführen; Konfiguration bei Bedarf manuell bearbeiten."
  exit 0
fi

APP_ORIGIN="${APP_ORIGIN:-http://127.0.0.1:8080}"
WEB_BIND_ADDRESS="${WEB_BIND_ADDRESS:-127.0.0.1}"
WEB_PORT="${WEB_PORT:-8080}"

if [[ ! "$APP_ORIGIN" =~ ^https?://[A-Za-z0-9.-]+(:[0-9]{1,5})?$ ]]; then
  echo "APP_ORIGIN muss eine reine HTTP(S)-Origin ohne Pfad sein." >&2
  exit 1
fi
if [[ ! "$WEB_BIND_ADDRESS" =~ ^[0-9.]+$ ]] || [[ ! "$WEB_PORT" =~ ^[0-9]{1,5}$ ]] || (( WEB_PORT < 1 || WEB_PORT > 65535 )); then
  echo "WEB_BIND_ADDRESS muss eine IPv4-Adresse und WEB_PORT eine gültige Portnummer sein." >&2
  exit 1
fi

umask 077
PROJECT_NAME="secops-test-$(openssl rand -hex 5)"
POSTGRES_PASSWORD="$(openssl rand -hex 24)"
POSTGRES_APP_PASSWORD="$(openssl rand -hex 24)"
JWT_SECRET="$(openssl rand -hex 32)"
DMS_S3_ACCESS_KEY="$(openssl rand -hex 16)"
DMS_S3_SECRET_KEY="$(openssl rand -hex 32)"

cat > "$ENV_FILE" <<EOF
COMPOSE_PROJECT_NAME=$PROJECT_NAME
POSTGRES_DB=securityops_test
POSTGRES_PASSWORD=$POSTGRES_PASSWORD
POSTGRES_APP_PASSWORD=$POSTGRES_APP_PASSWORD
JWT_SECRET=$JWT_SECRET
JWT_EXPIRES_IN=8h
APP_ORIGIN=$APP_ORIGIN
WEB_BIND_ADDRESS=$WEB_BIND_ADDRESS
WEB_PORT=$WEB_PORT
DMS_S3_BUCKET=securityops-documents-test
DMS_S3_ACCESS_KEY=$DMS_S3_ACCESS_KEY
DMS_S3_SECRET_KEY=$DMS_S3_SECRET_KEY
DMS_MAX_FILE_SIZE_BYTES=10485760
EOF
chmod 600 "$ENV_FILE"

echo "Testkonfiguration erzeugt: $ENV_FILE (Rechte 600)"
echo "Eindeutiger Compose-Projektname: $PROJECT_NAME"
echo "Noch keine Dienste gestartet. Konfiguration prüfen und dann ./start.sh ausführen."
