#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${repo_root}"

mode="all"
if [[ "${1:-}" == "--staged" ]]; then
  mode="staged"
fi

pattern='BEGIN (RSA|DSA|EC|OPENSSH|PGP) PRIVATE KEY|ghp_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]+|gho_[A-Za-z0-9]{20,}|ghu_[A-Za-z0-9]{20,}|ghs_[A-Za-z0-9]{20,}|ghr_[A-Za-z0-9]{20,}|sk-[A-Za-z0-9]{20,}|AKIA[0-9A-Z]{16}|aws_secret_access_key|aws_access_key_id|AIza[0-9A-Za-z_-]{35}|xox[baprs]-[A-Za-z0-9-]+'

if [[ "${mode}" == "staged" ]]; then
  mapfile -d '' files < <(git diff --cached --name-only --diff-filter=ACMR -z)
else
  mapfile -d '' files < <(git ls-files -z)
fi

filtered_files=()
for file in "${files[@]}"; do
  case "${file}" in
    scripts/check-secrets.sh|scripts/check-history-secrets.sh)
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
  echo "Potential secret material detected. Remove it or move it out of the repository." >&2
  exit 1
fi

exit 0