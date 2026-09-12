#!/bin/sh
set -eu

PROJECT_SKILL_DIR=$(CDPATH= cd -- "$(dirname -- "$0")/../skills/shared-memory" && pwd)
HOME_DIR=${HOME:?}
UNIVERSAL_DIR="${HOME_DIR}/.agents/skills"

install_link() {
  target=$1
  if [ -e "$target" ] || [ -L "$target" ]; then
    resolved=$(readlink "$target" 2>/dev/null || true)
    if [ "$resolved" = "$PROJECT_SKILL_DIR" ] || [ "$resolved" = "$UNIVERSAL_DIR/shared-memory" ]; then
      return
    fi
    printf 'Refusing to overwrite existing path: %s\n' "$target" >&2
    exit 1
  fi
  mkdir -p "$(dirname -- "$target")"
  ln -s "$2" "$target"
}

install_link "$UNIVERSAL_DIR/shared-memory" "$PROJECT_SKILL_DIR"
install_link "${HOME_DIR}/.codex/skills/shared-memory" "$UNIVERSAL_DIR/shared-memory"
install_link "${HOME_DIR}/.cursor/skills/shared-memory" "$UNIVERSAL_DIR/shared-memory"
install_link "${HOME_DIR}/.grok/skills/shared-memory" "$UNIVERSAL_DIR/shared-memory"

printf '%s\n' 'shared-memory skill installed for universal, Codex, Cursor, and Grok discovery.'
