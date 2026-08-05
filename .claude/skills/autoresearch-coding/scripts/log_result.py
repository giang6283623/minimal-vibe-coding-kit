#!/usr/bin/env python3
import argparse
import math
import os
import re
import stat
from pathlib import Path

HEADER = "commit\tmetric_value\tdirection\tstatus\tseconds\tlog_path\tdescription\n"
MAX_FIELD_LENGTH = 500


def fail(message):
    raise SystemExit(f"ERROR: {message}")


def field(name, value, maximum=MAX_FIELD_LENGTH):
    if not value or len(value) > maximum:
        fail(f"{name} must contain 1 to {maximum} characters")
    if any(ord(character) < 32 or ord(character) == 127 for character in value):
        fail(f"{name} must not contain tabs, newlines, or control characters")
    return value


def project_path(raw, label, allowed_parents):
    project_root = Path.cwd().resolve()
    requested = Path(raw)
    lexical_candidate = requested if requested.is_absolute() else project_root / requested
    lexical_candidate = Path(os.path.abspath(lexical_candidate))
    if lexical_candidate.exists() and lexical_candidate.is_symlink():
        fail(f"refusing symlinked {label}")
    candidate = lexical_candidate.resolve(strict=False)
    try:
        candidate.relative_to(project_root)
    except ValueError:
        fail(f"{label} must stay inside the project root")
    if candidate.parent not in allowed_parents:
        fail(f"{label} must be in the project root or .autoresearch")
    return candidate


def lock(handle):
    if os.name == "nt":
        import msvcrt
        handle.seek(0)
        msvcrt.locking(handle.fileno(), msvcrt.LK_LOCK, 1)
    else:
        import fcntl
        fcntl.flock(handle.fileno(), fcntl.LOCK_EX)


def unlock(handle):
    if os.name == "nt":
        import msvcrt
        handle.seek(0)
        msvcrt.locking(handle.fileno(), msvcrt.LK_UNLCK, 1)
    else:
        import fcntl
        fcntl.flock(handle.fileno(), fcntl.LOCK_UN)


parser = argparse.ArgumentParser(description="Append one validated autoresearch result row")
parser.add_argument("--file", default="results.tsv")
parser.add_argument("--commit", required=True)
parser.add_argument("--metric", required=True)
parser.add_argument("--direction", required=True, choices=["lower", "higher"])
parser.add_argument("--status", required=True, choices=["keep", "discard", "crash"])
parser.add_argument("--seconds", required=True)
parser.add_argument("--log", required=True)
parser.add_argument("--description", required=True)
args = parser.parse_args()

project_root = Path.cwd().resolve()
state_root = project_root / ".autoresearch"
if state_root.exists() and state_root.is_symlink():
    fail("refusing symlinked .autoresearch directory")
state_root.mkdir(parents=True, exist_ok=True)

ledger = project_path(args.file, "result file", {project_root, state_root.resolve()})
if ledger.suffix != ".tsv":
    fail("result file must use the .tsv extension")

log_root = state_root / "logs"
if log_root.exists() and log_root.is_symlink():
    fail("refusing symlinked .autoresearch/logs directory")
log_root.mkdir(parents=True, exist_ok=True)
requested_log_path = Path(args.log)
lexical_log_path = requested_log_path if requested_log_path.is_absolute() else project_root / requested_log_path
lexical_log_path = Path(os.path.abspath(lexical_log_path))
if lexical_log_path.exists() and lexical_log_path.is_symlink():
    fail("refusing symlinked log path")
log_path = lexical_log_path.resolve(strict=False)
try:
    normalized_log = log_path.relative_to(log_root.resolve()).as_posix()
except ValueError:
    fail("log path must stay inside .autoresearch/logs")
if not log_path.is_file():
    fail("log path must be an existing regular file, not a symlink")

commit = field("commit", args.commit, 128)
if not re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9._/-]{0,127}", commit):
    fail("commit contains unsupported characters")
metric = field("metric", args.metric, 128)
try:
    metric_number = float(metric)
except ValueError:
    fail("metric must be a finite number")
if not math.isfinite(metric_number):
    fail("metric must be a finite number")
description = field("description", args.description)
try:
    seconds_number = float(args.seconds)
except ValueError:
    fail("seconds must be a finite non-negative number")
if not math.isfinite(seconds_number) or seconds_number < 0:
    fail("seconds must be a finite non-negative number")
seconds = format(seconds_number, ".6f").rstrip("0").rstrip(".")
row = "\t".join([
    commit,
    metric,
    args.direction,
    args.status,
    seconds,
    f".autoresearch/logs/{normalized_log}",
    description,
]) + "\n"

flags = os.O_RDWR | os.O_CREAT | os.O_APPEND
if hasattr(os, "O_NOFOLLOW"):
    flags |= os.O_NOFOLLOW
try:
    descriptor = os.open(ledger, flags, 0o600)
except OSError as error:
    fail(f"cannot open result file safely: {error}")

with os.fdopen(descriptor, "r+", encoding="utf-8", newline="") as handle:
    lock(handle)
    try:
        metadata = os.fstat(handle.fileno())
        if not stat.S_ISREG(metadata.st_mode):
            fail("result file must be a regular file")
        os.fchmod(handle.fileno(), 0o600)
        handle.seek(0)
        existing = handle.read()
        if existing and not existing.startswith(HEADER):
            fail("result file has an unsupported header")
        handle.seek(0, os.SEEK_END)
        if not existing:
            handle.write(HEADER)
        handle.write(row)
        handle.flush()
        os.fsync(handle.fileno())
    finally:
        unlock(handle)

print(f"logged {args.status} -> {ledger.relative_to(project_root)}")
