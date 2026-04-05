#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${repo_root}"

mapfile -d '' staged_files < <(git diff --cached --name-only --diff-filter=ACMR -z)

if [[ ${#staged_files[@]} -eq 0 ]]; then
  exit 0
fi

bash scripts/check-secrets.sh --staged
bash scripts/check-risky-patterns.sh --staged

biome_files=()
shell_files=()
package_filters=()
declare -A seen_filters=()
needs_full_workspace_checks=0
needs_root_tests=0

for file in "${staged_files[@]}"; do
  case "${file}" in
    *.ts|*.tsx|*.js|*.jsx|*.json|*.md|*.mdx|*.yaml|*.yml)
      biome_files+=("${file}")
      ;;
  esac

  case "${file}" in
    *.sh|.husky/*)
      shell_files+=("${file}")
      ;;
  esac

  case "${file}" in
    apps/*/*|packages/*/*)
      package_dir="$(printf '%s' "${file}" | cut -d/ -f1-2)"
      if [[ -z "${seen_filters[${package_dir}]:-}" ]]; then
        seen_filters["${package_dir}"]=1
        package_filters+=("--filter=./${package_dir}")
      fi
      ;;
  esac

  case "${file}" in
    package.json|bunfig.toml|tsconfig.json|turbo.json|biome.json)
      needs_full_workspace_checks=1
      ;;
  esac

  case "${file}" in
    apps/cli/*|packages/*|tests/*|boards/*|configs/*|constraints/*|examples/*|testbenches/*|scripts/*)
      needs_root_tests=1
      ;;
  esac
done

if [[ ${#biome_files[@]} -gt 0 ]]; then
  bunx biome format --write -- "${biome_files[@]}"
  git add -- "${biome_files[@]}"
  bunx biome check -- "${biome_files[@]}"
fi

if [[ ${#shell_files[@]} -gt 0 ]]; then
  bash -n "${shell_files[@]}"
fi

if [[ ${needs_full_workspace_checks} -eq 1 ]]; then
  bun run typecheck
  bun run lint
  bun run test
elif [[ ${#package_filters[@]} -gt 0 ]]; then
  bunx turbo run typecheck "${package_filters[@]}"
  bunx turbo run lint "${package_filters[@]}"
  bunx turbo run test "${package_filters[@]}"
fi

if [[ ${needs_root_tests} -eq 1 ]]; then
  bun run test:root
fi