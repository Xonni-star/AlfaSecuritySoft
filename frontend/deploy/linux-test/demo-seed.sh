#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="$SCRIPT_DIR/.env"
COMPOSE=(docker compose --env-file "$ENV_FILE" -f "$SCRIPT_DIR/compose.yml")

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Konfiguration fehlt. Zuerst ./install.sh ausführen." >&2
  exit 1
fi

echo "ACHTUNG: Der bestehende Seed erzeugt illustrative, personenbezogen wirkende Testdaten."
echo "Nur in einer isolierten Testinstallation verwenden; niemals mit echten Daten."
printf 'Zum Fortfahren SEED TEST DATA eingeben: '
read -r CONFIRMATION
if [[ "$CONFIRMATION" != "SEED TEST DATA" ]]; then
  echo "Abgebrochen; keine Demo-Daten angelegt."
  exit 1
fi

printf 'Testpasswort für den Demo-Benutzer a.schmidt@ffm-sec.de (mindestens 16 Zeichen): '
read -r -s DEMO_PASSWORD
echo
trap 'unset DEMO_PASSWORD' EXIT
if (( ${#DEMO_PASSWORD} < 16 )); then
  echo "Das Passwort muss mindestens 16 Zeichen lang sein." >&2
  exit 1
fi

ALFASECURITYSOFT_DEMO_USER_PASSWORD="$DEMO_PASSWORD" "${COMPOSE[@]}" run --rm -e ALFASECURITYSOFT_DEMO_USER_PASSWORD \
  --entrypoint node backend dist/seeds/seed.js
echo "Demo-Daten angelegt. Zugangsdaten nicht vergessen und nach dem Test wieder entfernen."
