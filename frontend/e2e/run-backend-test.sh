#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR/.."

CONTAINERS=""
cleanup() {
    local container remaining cleanup_failed=0
    for container in $CONTAINERS; do
        if ! remaining="$(docker ps -aq --no-trunc --filter "id=$container")"; then
            echo "Fehler: Testcontainerstatus konnte nicht geprüft werden: $container" >&2
            cleanup_failed=1
            continue
        fi
        [ -z "$remaining" ] && continue
        if ! docker stop --time 10 "$container" >/dev/null; then
            echo "Fehler: Testcontainer konnte nicht gestoppt werden: $container" >&2
            cleanup_failed=1
        fi
        for _ in $(seq 1 10); do
            if ! remaining="$(docker ps -aq --no-trunc --filter "id=$container")"; then
                echo "Fehler: Testcontainerentfernung konnte nicht geprüft werden: $container" >&2
                cleanup_failed=1
                break
            fi
            [ -z "$remaining" ] && break
            sleep 1
        done
        if [ -n "$remaining" ]; then
            echo "Fehler: Isolierter Browser-Testcontainer wurde nicht entfernt: $container" >&2
            cleanup_failed=1
        fi
    done
    [ "$cleanup_failed" -eq 0 ] || exit 1
    echo "[TEST] Isolierte Browser-Testcontainer entfernt."
}
trap cleanup EXIT

CONTAINER="$(docker run --rm -d -p 127.0.0.1::5432 --label securityops.browser-test=true \
    -e POSTGRES_DB=securityops_browser -e POSTGRES_USER=secops_admin \
    -e POSTGRES_HOST_AUTH_METHOD=trust postgres:16-alpine)"
CONTAINERS="$CONTAINER"
DMS_S3_ACCESS_KEY="$(openssl rand -hex 16)"
DMS_S3_SECRET_KEY="$(openssl rand -hex 32)"
DMS_S3_BUCKET="browser-$(openssl rand -hex 12)"
export DMS_S3_ACCESS_KEY DMS_S3_SECRET_KEY DMS_S3_BUCKET
STORAGE_CONTAINER="$(docker run --rm -d -p 127.0.0.1::9000 --label securityops.browser-test=true \
    -e MINIO_ROOT_USER="$DMS_S3_ACCESS_KEY" -e MINIO_ROOT_PASSWORD="$DMS_S3_SECRET_KEY" \
    ghcr.io/disaster37/minio@sha256:282ffcd2e0a3906086ab49cd70765617b20ce5c24ccf7d788043eb9b4ae59e6f \
    server /data)"
CONTAINERS="$CONTAINERS $STORAGE_CONTAINER"
SCANNER_CONTAINER="$(docker run --rm -d -p 127.0.0.1::3310 --label securityops.browser-test=true \
    clamav/clamav:1.4.3)"
CONTAINERS="$CONTAINERS $SCANNER_CONTAINER"
export DMS_S3_ENDPOINT="http://127.0.0.1:$(docker port "$STORAGE_CONTAINER" 9000/tcp | cut -d: -f2)"
export DMS_S3_REGION=us-east-1 DMS_S3_FORCE_PATH_STYLE=true
export DMS_SCANNER_PROVIDER=clamav DMS_SCAN_REQUIRED=true DMS_CLAMAV_HOST=127.0.0.1
export DMS_CLAMAV_PORT="$(docker port "$SCANNER_CONTAINER" 3310/tcp | cut -d: -f2)"
export DMS_CLAMAV_TIMEOUT_MS=30000

READY=false
for _ in $(seq 1 60); do
    if docker exec "$CONTAINER" pg_isready -U secops_admin -d securityops_browser >/dev/null 2>&1; then
        READY=true
        break
    fi
    sleep 1
done
if [ "$READY" != true ]; then
    echo "Fehler: Isoliertes Browser-Test-PostgreSQL wurde nicht bereit." >&2
    docker logs "$CONTAINER" >&2
    exit 1
fi

READY=false
for _ in $(seq 1 60); do
    if curl --fail --silent --max-time 2 "$DMS_S3_ENDPOINT/minio/health/ready" >/dev/null &&
        docker exec "$SCANNER_CONTAINER" clamdcheck.sh >/dev/null 2>&1; then
        READY=true
        break
    fi
    sleep 2
done
if [ "$READY" != true ]; then
    echo "Fehler: Isoliertes S3/ClamAV wurde nicht bereit." >&2
    docker logs "$STORAGE_CONTAINER" >&2
    docker logs "$SCANNER_CONTAINER" >&2
    exit 1
fi
docker exec "$STORAGE_CONTAINER" mc alias set browser http://127.0.0.1:9000 \
    "$DMS_S3_ACCESS_KEY" "$DMS_S3_SECRET_KEY"
docker exec "$STORAGE_CONTAINER" mc mb "browser/$DMS_S3_BUCKET"

DB_PORT="$(docker port "$CONTAINER" 5432/tcp | cut -d: -f2)"
export NODE_ENV=test PORT=4181 CORS_ORIGIN=http://127.0.0.1:4173
JWT_SECRET="$(openssl rand -hex 32)"
SECOPS_DEMO_USER_PASSWORD="$(openssl rand -hex 24)"
export JWT_SECRET SECOPS_DEMO_USER_PASSWORD
export DATABASE_MIGRATION_URL="postgresql://secops_admin@127.0.0.1:$DB_PORT/securityops_browser"
export DATABASE_URL="postgresql://secops_app_user@127.0.0.1:$DB_PORT/securityops_browser"
unset RATE_LIMIT_REDIS_URL

npm run migrate --prefix backend
npm run seed --prefix backend
node e2e/seed-browser-accounts.cjs
npx playwright test --config playwright.backend.config.js
