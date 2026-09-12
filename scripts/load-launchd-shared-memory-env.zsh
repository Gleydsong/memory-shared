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

key_names=("${(@f)$(LC_ALL=C /usr/bin/sed -nE \
  's/^[[:space:]]*(SHARED_MEMORY_[A-Z0-9_]+_KEY)[[:space:]]*=.*/\1/p' \
  "$ENV_FILE")}")

typeset -A seen_keys
typeset -a validated_names validated_values
for key_name in "${key_names[@]}"; do
  if [[ -n "${seen_keys[$key_name]-}" ]]; then
    continue
  fi
  seen_keys[$key_name]=1

  if ! typeset -p "$key_name" >/dev/null 2>&1 || [[ -z "${(P)key_name}" ]]; then
    print -u2 -- "Shared Memory key $key_name is missing or empty."
    exit 1
  fi

  validated_names+=("$key_name")
  validated_values+=("${(P)key_name}")
done

if (( ${#validated_names[@]} == 0 )); then
  print -u2 -- "No SHARED_MEMORY_*_KEY entries were found."
  exit 1
fi

for index in {1..${#validated_names[@]}}; do
  /bin/launchctl setenv "${validated_names[$index]}" "${validated_values[$index]}"
done
