#!/bin/zsh

set -eu

SCRIPT_DIR="${0:A:h}"
REPO_ROOT="${SCRIPT_DIR:h}"
readonly ENV_FILE="${SHARED_MEMORY_ENV_FILE:-${REPO_ROOT}/.env}"

if [[ ! -f "$ENV_FILE" || -L "$ENV_FILE" ]]; then
  print -u2 -- "Shared Memory environment file is missing or is a symbolic link."
  exit 1
fi

file_owner=$(/usr/bin/stat -f '%Su' "$ENV_FILE")
file_mode=$(/usr/bin/stat -f '%OLp' "$ENV_FILE")
if [[ "$file_owner" != "$USER" || "$file_mode" != "600" ]]; then
  print -u2 -- "Shared Memory environment file must be owned by $USER with mode 600."
  exit 1
fi

set -a
source "$ENV_FILE"
set +a

if [[ -z "${SHARED_MEMORY_COMPOSER_KEY-}" ]]; then
  print -u2 -- "SHARED_MEMORY_COMPOSER_KEY is missing or empty."
  exit 1
fi

npx_bin=$(command -v npx)
if [[ -z "$npx_bin" ]]; then
  print -u2 -- "npx is required to start the Shared Memory Cursor MCP proxy."
  exit 1
fi

# mcp-remote interpolates ${SHARED_MEMORY_COMPOSER_KEY}; keep the token out of argv.
exec "$npx_bin" -y mcp-remote@0.8.1 "http://127.0.0.1:8787/mcp" \
  --allow-http \
  --header 'Authorization: Bearer ${SHARED_MEMORY_COMPOSER_KEY}'
