#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
FRONTEND_DIR="$(cd -- "$SCRIPT_DIR/../.." && pwd)"
REPO_ROOT="$(cd -- "$FRONTEND_DIR/.." && pwd)"
OUTPUT_DIR="${1:-$REPO_ROOT/artifacts/linux-test}"
VERSION="$(node -p "require('$FRONTEND_DIR/backend/package.json').version")"
REVISION="$(git -C "$REPO_ROOT" rev-parse --short HEAD)"
PACKAGE_VERSION="${VERSION}~phase7.${REVISION}"
TMP_DIR="$(mktemp -d "${TMPDIR:-/tmp}/securityops-linux-test.XXXXXX")"
trap 'rm -rf "$TMP_DIR"' EXIT

for command in tar gzip python3 node; do
  if ! command -v "$command" >/dev/null 2>&1; then
    echo "Benötigtes Werkzeug fehlt: $command" >&2
    exit 1
  fi
done
if command -v sha256sum >/dev/null 2>&1; then
  HASH_COMMAND=(sha256sum)
elif command -v shasum >/dev/null 2>&1; then
  HASH_COMMAND=(shasum -a 256)
else
  echo "Benötigtes Werkzeug fehlt: sha256sum oder shasum" >&2
  exit 1
fi

mkdir -p "$OUTPUT_DIR" "$TMP_DIR/bundle/securityops-linux-test/app"
tar -C "$FRONTEND_DIR" \
  --exclude='./node_modules' \
  --exclude='./backend/node_modules' \
  --exclude='./dist' \
  --exclude='./backend/dist' \
  --exclude='./.git' \
  --exclude='./.env' \
  --exclude='./.env.*' \
  --exclude='./deploy/.env' \
  --exclude='./deploy/.env.*' \
  --exclude='./deploy/linux-test/.env' \
  --exclude='./deploy/linux-test/.env.*' \
  --exclude='./backend/.env' \
  --exclude='./backend/.env.*' \
  -cf - . | tar -C "$TMP_DIR/bundle/securityops-linux-test/app" -xf -

TARBALL="$OUTPUT_DIR/securityops-linux-test-${VERSION}-phase7-${REVISION}.tar.gz"
tar -C "$TMP_DIR/bundle" -czf "$TARBALL" securityops-linux-test

DEB_ROOT="$TMP_DIR/deb"
mkdir -p "$DEB_ROOT/DEBIAN" "$DEB_ROOT/opt/securityops-linux-test/app"
cp -a "$TMP_DIR/bundle/securityops-linux-test/app/." "$DEB_ROOT/opt/securityops-linux-test/app/"
cat > "$DEB_ROOT/DEBIAN/control" <<EOF
Package: securityops-linux-test
Version: $PACKAGE_VERSION
Section: admin
Priority: optional
Architecture: all
Maintainer: AlfaSecuritySoft maintainers
Depends: openssl, curl
Description: AlfaSecuritySoft non-production Linux test installation
 Isolated Docker Compose test package with local PostgreSQL, MinIO and ClamAV.
EOF
printf '2.0\n' > "$TMP_DIR/debian-binary"
python3 - "$DEB_ROOT" "$TMP_DIR/control.tar.gz" "$TMP_DIR/data.tar.gz" <<'PY'
import os
import sys
import tarfile

root, control_archive, data_archive = sys.argv[1:]

def normalize_owner(member):
    member.uid = 0
    member.gid = 0
    member.uname = "root"
    member.gname = "root"
    return member

with tarfile.open(control_archive, "w:gz", format=tarfile.USTAR_FORMAT) as archive:
    archive.add(
        os.path.join(root, "DEBIAN", "control"),
        arcname="./control",
        filter=normalize_owner,
    )

with tarfile.open(data_archive, "w:gz", format=tarfile.USTAR_FORMAT) as archive:
    archive.add(
        os.path.join(root, "opt"),
        arcname="./opt",
        recursive=True,
        filter=normalize_owner,
    )
PY
DEB="$OUTPUT_DIR/securityops-linux-test_${PACKAGE_VERSION}_all.deb"
(
  python3 - "$DEB" "$TMP_DIR/debian-binary" "$TMP_DIR/control.tar.gz" "$TMP_DIR/data.tar.gz" <<'PY'
import os
import sys
import time

output, *members = sys.argv[1:]
with open(output, "wb") as archive:
    archive.write(b"!<arch>\n")
    for member in members:
        name = os.path.basename(member)
        with open(member, "rb") as source:
            payload = source.read()
        header = (
            f"{name + '/':<16}{int(time.time()):<12}{0:<6}{0:<6}"
            f"{0o100644:<8o}{len(payload):<10}`\n"
        ).encode("ascii")
        if len(header) != 60:
            raise SystemExit(f"Invalid ar member header for {name}")
        archive.write(header)
        archive.write(payload)
        if len(payload) % 2:
            archive.write(b"\n")
PY
)

echo "Created test-only packages:"
ls -lh "$TARBALL" "$DEB"
"${HASH_COMMAND[@]}" "$TARBALL" "$DEB"
