#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${repo_root}"

mode="all"
if [[ "${1:-}" == "--staged" ]]; then
  mode="staged"
fi

pattern='sudo chmod a\+rw /dev/ttyUSB|curl[^\n|>]*\|[[:space:]]*(bash|sh|zsh)|wget[^\n|>]*\|[[:space:]]*(bash|sh|zsh)|(^|[[:space:]])mkfs(\.[A-Za-z0-9_+-]+)?([[:space:]]|$)|(^|[[:space:]])wipefs([[:space:]]|$)|(^|[[:space:]])fdisk([[:space:]]|$)|(^|[[:space:]])parted([[:space:]]|$)|(^|[[:space:]])shred([[:space:]]|$)|dd[[:space:]].*of=/dev/'

if [[ "${mode}" == "staged" ]]; then
  mapfile -d '' files < <(git diff --cached --name-only --diff-filter=ACMR -z)
else
  mapfile -d '' files < <(git ls-files -z)
fi

filtered_files=()
for file in "${files[@]}"; do
  case "${file}" in
    scripts/check-risky-patterns.sh)
      ;;
    *)
      filtered_files+=("${file}")
      ;;
  esac
done

if [[ ${#filtered_files[@]} -eq 0 ]]; then
  exit 0
fi

if rg --color=never --line-number --with-filename --pcre2 "${pattern}" -- "${filtered_files[@]}"; then
  echo "Risky host or device command pattern detected. Replace it with a safer workflow or document why it is required." >&2
  exit 1
fi

exit 0