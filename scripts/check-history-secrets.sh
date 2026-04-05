#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${repo_root}"

pattern='BEGIN (RSA|DSA|EC|OPENSSH|PGP) PRIVATE KEY|ghp_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]+|gho_[A-Za-z0-9]{20,}|ghu_[A-Za-z0-9]{20,}|ghs_[A-Za-z0-9]{20,}|ghr_[A-Za-z0-9]{20,}|sk-[A-Za-z0-9]{20,}|AKIA[0-9A-Z]{16}|aws_secret_access_key|aws_access_key_id|AIza[0-9A-Za-z_-]{35}|xox[baprs]-[A-Za-z0-9-]+'

if git --no-pager grep -n -I -E "${pattern}" $(git rev-list --all) -- \
  ':(exclude)scripts/check-secrets.sh' \
  ':(exclude)scripts/check-history-secrets.sh'; then
  echo "Potential secret material detected in git history." >&2
  exit 1
fi

echo "No matching secret patterns found in git history."