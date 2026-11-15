#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="$SCRIPT_DIR/.env"
COMPOSE=(docker compose --env-file "$ENV_FILE" -f "$SCRIPT_DIR/compose.yml")

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Konfiguration fehlt. Zuerst ./install.sh ausführen." >&2
  exit 1
fi

echo "ACHTUNG: Das Demo-Konto erhält die systemweite Rolle Systemadministrator."
echo "Nur in dieser isolierten Testinstallation und nur mit Demo-Daten fortfahren."
printf 'Zum Fortfahren PROMOTE TEST USER TO SUPERADMIN eingeben: '
read -r CONFIRMATION
if [[ "$CONFIRMATION" != "PROMOTE TEST USER TO SUPERADMIN" ]]; then
  echo "Abgebrochen; es wurden keine Rechte geändert."
  exit 1
fi

BOOTSTRAP_SCRIPT='
const { Client } = require("pg");
(async () => {
  const client = new Client({ connectionString: process.env.DATABASE_MIGRATION_URL });
  await client.connect();
  try {
    const result = await client.query(
      "UPDATE users SET is_superadmin=true WHERE email=$1 RETURNING id",
      ["a.schmidt@ffm-sec.de"]
    );
    if (result.rowCount !== 1) throw new Error("Demo user missing; run demo-seed.sh first.");
    console.log("Test-Demo-Konto ist jetzt Systemadministrator.");
  } finally {
    await client.end();
  }
})().catch(() => {
  console.error("Systemadministrator-Bootstrap fehlgeschlagen; Details wurden unterdrückt.");
  process.exit(1);
});
'
"${COMPOSE[@]}" run --rm --entrypoint node migrate -e "$BOOTSTRAP_SCRIPT"
