#!/usr/bin/env bash
set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-/var/backups}"

if [ -e "$BACKUP_DIR/.backup_failed" ]; then
    echo "[BACKUP HEALTH] Der letzte Sicherungsversuch ist fehlgeschlagen." >&2
    exit 1
fi

if ! find "$BACKUP_DIR" -maxdepth 1 -type f -name 'secops_backup_*.tar.gz.enc' \
    -size +0c -mmin -1500 -print -quit | grep -q .; then
    echo "[BACKUP HEALTH] Kein abgeschlossenes, nicht leeres Datenbankarchiv der letzten 25 Stunden." >&2
    exit 1
fi
