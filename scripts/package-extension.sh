#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
EXT_DIR="$ROOT_DIR/extension"
MANIFEST_PATH="$EXT_DIR/manifest.json"
DIST_DIR="$ROOT_DIR/dist"

if [[ ! -f "$MANIFEST_PATH" ]]; then
  echo "Error: manifest not found at $MANIFEST_PATH" >&2
  exit 1
fi

MANIFEST_INFO="$(node -e '
const fs = require("node:fs");
const manifestPath = process.argv[1];
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));

if (!manifest.version) {
  console.error("Error: manifest.version is required.");
  process.exit(1);
}

const safeName = (manifest.name || "chrome-extension")
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, "-")
  .replace(/^-+|-+$/g, "") || "chrome-extension";

process.stdout.write(`${manifest.version}\n${safeName}`);
' "$MANIFEST_PATH")"

mapfile -t MANIFEST_LINES <<< "$MANIFEST_INFO"
VERSION="${MANIFEST_LINES[0]:-}"
SAFE_NAME="${MANIFEST_LINES[1]:-chrome-extension}"

if [[ -z "$VERSION" ]]; then
  echo "Error: failed to read version from manifest." >&2
  exit 1
fi

mkdir -p "$DIST_DIR"
ZIP_PATH="$DIST_DIR/${SAFE_NAME}-v${VERSION}.zip"
rm -f "$ZIP_PATH"

TMP_DIR="$(mktemp -d)"
cleanup() {
  rm -rf "$TMP_DIR"
}
trap cleanup EXIT

cp -R "$EXT_DIR"/. "$TMP_DIR"/

(
  cd "$TMP_DIR"
  if command -v zip >/dev/null 2>&1; then
    zip -qr "$ZIP_PATH" .
  elif command -v python3 >/dev/null 2>&1; then
    python3 - "$ZIP_PATH" <<'PY'
import os
import sys
import zipfile

zip_path = sys.argv[1]

with zipfile.ZipFile(zip_path, "w", compression=zipfile.ZIP_DEFLATED) as archive:
    for root, _, files in os.walk("."):
        for filename in files:
            path = os.path.join(root, filename)
            archive.write(path, arcname=os.path.relpath(path, "."))
PY
  else
    echo "Error: neither 'zip' nor 'python3' is available to create archive." >&2
    exit 1
  fi
)

echo "Packaged extension: $ZIP_PATH"
