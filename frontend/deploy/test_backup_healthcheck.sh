#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKUP_DIR="$(mktemp -d)"
export BACKUP_DIR
trap 'rm -rf -- "$BACKUP_DIR"' EXIT

expect_unhealthy() {
    if bash "$SCRIPT_DIR/backup_healthcheck.sh" >"$BACKUP_DIR/health.log" 2>&1; then
        echo "Fehler: Unvollständige, alte oder fehlgeschlagene Sicherung wurde als gesund gemeldet." >&2
        exit 1
    fi
}

expect_unhealthy
printf 'unfinished' > "$BACKUP_DIR/secops_backup_test.tar.gz.enc.partial"
expect_unhealthy
: > "$BACKUP_DIR/secops_backup_test.tar.gz.enc"
expect_unhealthy
printf 'completed archive fixture' > "$BACKUP_DIR/secops_backup_test.tar.gz.enc"
bash "$SCRIPT_DIR/backup_healthcheck.sh"
touch -t 200001010000 "$BACKUP_DIR/secops_backup_test.tar.gz.enc"
expect_unhealthy
touch "$BACKUP_DIR/secops_backup_test.tar.gz.enc"
touch "$BACKUP_DIR/.backup_failed"
expect_unhealthy
rm "$BACKUP_DIR/.backup_failed"
bash "$SCRIPT_DIR/backup_healthcheck.sh"
echo "[TEST] Backup-Health: fehlend, partiell, leer, veraltet, letzter Fehler und erfolgreicher Zustand geprüft."
