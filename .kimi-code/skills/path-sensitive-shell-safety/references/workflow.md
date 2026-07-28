# Path-Sensitive Shell Safety Reference

This reference gives reusable guard patterns for shell scripts. Adapt names and allowlists to the repo, but keep the invariant: validate raw input, validate the joined path, then guard immediately before the dangerous command.

## Baseline guard functions

```bash
die() {
  printf 'ERROR: %s\n' "$*" >&2
  exit 1
}

require_nonempty() {
  local name="${1:?missing name}"
  local value="${2-}"
  [[ -n "$value" ]] || die "$name is required"
  [[ "$value" != *$'\n'* && "$value" != *$'\r'* ]] || die "$name contains a newline"
}

validate_abs_base_path() {
  local name="${1:?missing name}"
  local value="${2-}"
  require_nonempty "$name" "$value"
  [[ "$value" == /* ]] || die "$name must be an absolute path: $value"
  [[ "$value" != "/" && "$value" != "." && "$value" != ".." ]] || die "$name is too broad: $value"
  [[ "$value" != *"/../"* && "$value" != *"/./"* && "$value" != *"//"* ]] || die "$name contains unsafe traversal: $value"
  case "$value" in
    /bin|/boot|/dev|/etc|/home|/lib|/lib64|/opt|/private|/root|/sbin|/srv|/sys|/tmp|/usr|/var)
      die "$name points at a broad system directory: $value"
      ;;
  esac
}

validate_folder_segment() {
  local name="${1:?missing name}"
  local value="${2-}"
  require_nonempty "$name" "$value"
  [[ "$value" != -* ]] || die "$name must not start with '-': $value"
  [[ "$value" != "." && "$value" != ".." ]] || die "$name is unsafe: $value"
  [[ "$value" != */* && "$value" != *\\* ]] || die "$name must be one folder segment: $value"
  [[ "$value" =~ ^[A-Za-z0-9._#@+=:-]+$ ]] || die "$name contains unsupported characters: $value"
}

join_child_path() {
  local base="${1:?missing base}"
  local child="${2:?missing child}"
  printf '%s/%s\n' "${base%/}" "$child"
}
```

## Containment guard

```bash
canonical_existing_dir() {
  local path_value="${1:?missing path}"
  [[ -d "$path_value" ]] || die "not a directory: $path_value"
  [[ ! -L "$path_value" ]] || die "refusing symlink directory: $path_value"
  (cd -P -- "$path_value" && pwd) || die "cannot resolve directory: $path_value"
}

assert_child_under_parent() {
  local parent="${1:?missing parent}"
  local child="${2:?missing child}"
  [[ "$child" != "$parent" ]] || die "refusing to operate on parent directory itself: $child"
  case "$child" in
    "$parent"/*) ;;
    *) die "path escapes parent: child=$child parent=$parent" ;;
  esac
}
```

## Safer remove wrapper

Use a wrapper instead of inline deletion when a path contains variables.

```bash
safe_rm_rf_dir() {
  local label="${1:?missing label}"
  local target="${2-}"
  local allowed_parent="${3-}"

  validate_abs_base_path "$label target" "$target"
  validate_abs_base_path "$label allowed parent" "$allowed_parent"

  [[ -d "$target" ]] || die "$label target is not an existing directory: $target"
  [[ ! -L "$target" ]] || die "$label target is a symlink: $target"

  local parent_real
  parent_real="$(canonical_existing_dir "$allowed_parent")"

  local target_real
  target_real="$(canonical_existing_dir "$target")"

  assert_child_under_parent "$parent_real" "$target_real"
  rm -rf -- "$target_real"
}
```

Never call the wrapper with a broad parent such as `/`, `/opt`, `/var`, `/tmp`, or `$HOME`. Use the narrowest app-owned parent.

## Git sync guard checklist

- Validate the checkout directory is inside the approved app base.
- Validate the origin URL or host matches the expected repository.
- Fetch with bounded timeout and non-interactive credentials.
- Explicit branch:
  - require the exact remote branch;
  - fail with an actionable message if it is missing.
- Blank branch:
  - current valid upstream;
  - remote default branch;
  - `main`;
  - `master`.
- Refuse dirty, local-ahead, or diverged worktrees unless the operator chooses a guided repair command.
- After sync, verify `git rev-parse HEAD` equals `git rev-parse "origin/<branch>"`.
- Build or deploy only after the equality check passes.

## Review checklist

- Are all path variables checked with `[[ -n "$value" ]]` or a stronger helper before use?
- Are folder names validated as segments before joining?
- Is the final path canonicalized or otherwise proven inside the base?
- Is the destructive command adjacent to its guard?
- Does the command use quoted expansions and `--` where available?
- Does the code fail closed for missing explicit branches?
- Does repair preserve runtime data and keep backups instead of deleting them?
- Does validation cover empty values, traversal, symlink, wrong origin, dirty checkout, branch with `#`, and missing branch?
