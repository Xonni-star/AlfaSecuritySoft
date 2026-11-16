#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR/.."

CONTAINER="$(docker run --rm -d -p 127.0.0.1::5432 --label securityops.browser-test=true \
    -e POSTGRES_DB=securityops_browser -e POSTGRES_USER=secops_admin \
    -e POSTGRES_HOST_AUTH_METHOD=trust postgres:16-alpine)"
cleanup() {
    docker stop --time 10 "$CONTAINER" >/dev/null
    if docker inspect "$CONTAINER" >/dev/null 2>&1; then
        echo "Fehler: Isolierter Browser-Testcontainer wurde nicht entfernt." >&2
        exit 1
    fi
    echo "[TEST] Isolierter Browser-Testcontainer entfernt."
}
trap cleanup EXIT

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
