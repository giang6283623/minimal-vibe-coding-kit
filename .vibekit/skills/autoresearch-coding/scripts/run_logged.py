#!/usr/bin/env python3
import argparse
import os
import re
import shlex
import signal
import subprocess
import sys
import tempfile
import threading
import time
from pathlib import Path

DEFAULT_MAX_LOG_BYTES = 1024 * 1024
MAX_ARGUMENTS = 128
MAX_ARGUMENT_BYTES = 4096
SHELL_PUNCTUATION = frozenset("()<>|&;")
ENVIRONMENT_ASSIGNMENT = re.compile(r"[A-Za-z_][A-Za-z0-9_]*=.*")


def fail(message):
    raise SystemExit(f"ERROR: {message}")


def reject_legacy_shell_syntax(raw_command):
    lexer = shlex.shlex(raw_command, posix=os.name != "nt", punctuation_chars=True)
    lexer.whitespace_split = True
    lexer.commenters = ""
    tokens = list(lexer)
    has_operator = any(token and all(character in SHELL_PUNCTUATION for character in token) for token in tokens)
    has_assignment = bool(tokens and ENVIRONMENT_ASSIGNMENT.fullmatch(tokens[0]))
    has_expansion = any(
        any(marker in token for marker in ("$", "`", "*", "?", "[")) or token.startswith("~")
        for token in tokens
    )
    if has_operator or has_assignment or has_expansion or "\n" in raw_command or "\r" in raw_command:
        fail("shell syntax is not supported in legacy command strings; pass the metric command as argv after --")


def parse_args():
    parser = argparse.ArgumentParser(description="Run an argv command with timeout and bounded redacted output")
    parser.add_argument("--log", required=True, help="Log path inside .autoresearch/logs")
    parser.add_argument("--timeout", type=int, default=600)
    parser.add_argument("--max-log-bytes", type=int, default=DEFAULT_MAX_LOG_BYTES)

    raw = sys.argv[1:]
    if "--" in raw:
        separator = raw.index("--")
        options = raw[:separator]
        command = raw[separator + 1:]
        args = parser.parse_args(options)
        legacy = False
    else:
        args, remainder = parser.parse_known_args(raw)
        if len(remainder) != 1:
            fail("pass the metric command as argv after --")
        try:
            reject_legacy_shell_syntax(remainder[0])
            command = shlex.split(remainder[0], posix=os.name != "nt")
        except ValueError as error:
            fail(f"cannot parse legacy command string: {error}")
        legacy = True

    if not 1 <= args.timeout <= 86400:
        fail("timeout must be between 1 and 86400 seconds")
    if not 1024 <= args.max_log_bytes <= 16 * 1024 * 1024:
        fail("max-log-bytes must be between 1024 and 16777216")
    if not command:
        fail("metric command is required after --")
    if len(command) > MAX_ARGUMENTS:
        fail(f"metric command exceeds {MAX_ARGUMENTS} arguments")
    for item in command:
        if not item or len(item.encode("utf-8")) > MAX_ARGUMENT_BYTES:
            fail("metric command contains an empty or oversized argument")
        if any(character in item for character in ("\x00", "\n", "\r")):
            fail("metric command arguments must not contain control line breaks")
    return args, command, legacy


def contained_log_path(raw_path):
    project_root = Path.cwd().resolve()
    state_root = project_root / ".autoresearch"
    log_root = state_root / "logs"
    for existing in (state_root, log_root):
        if existing.exists() and existing.is_symlink():
            fail(f"refusing symlinked log directory: {existing.relative_to(project_root)}")
    log_root.mkdir(parents=True, exist_ok=True)
    log_root_real = log_root.resolve()
    requested = Path(raw_path)
    lexical_candidate = requested if requested.is_absolute() else project_root / requested
    lexical_candidate = Path(os.path.abspath(lexical_candidate))
    if lexical_candidate.exists() and lexical_candidate.is_symlink():
        fail("refusing symlinked log file")
    candidate = lexical_candidate.resolve(strict=False)
    try:
        candidate.relative_to(log_root_real)
    except ValueError:
        fail("log path must stay inside .autoresearch/logs")
    if candidate == log_root_real:
        fail("log path must name a file")
    candidate.parent.mkdir(parents=True, exist_ok=True)
    try:
        lexical_relative = lexical_candidate.relative_to(log_root)
    except ValueError:
        lexical_relative = None
    if lexical_relative is not None:
        current = log_root
        for part in lexical_relative.parts[:-1]:
            current = current / part
            if current.is_symlink():
                fail("refusing symlinked log path component")
    return candidate


def redact(text):
    assignments = re.compile(
        r"(?i)\b([A-Z][A-Z0-9_]*(?:TOKEN|SECRET|PASSWORD|PASSWD|API_KEY|PRIVATE_KEY)[A-Z0-9_]*\s*[=:]\s*)([^\s]+)"
    )
    bearer = re.compile(r"(?i)\b(Bearer\s+)[A-Za-z0-9._~+/=-]{8,}")
    text = assignments.sub(r"\1[REDACTED]", text)
    return bearer.sub(r"\1[REDACTED]", text)


def send_group_signal(process, group_signal):
    if os.name == "posix":
        try:
            os.killpg(process.pid, group_signal)
        except ProcessLookupError:
            pass
    elif process.poll() is None:
        process.terminate()


def stop_process_tree(process):
    send_group_signal(process, signal.SIGTERM)
    try:
        process.wait(timeout=2)
    except subprocess.TimeoutExpired:
        if os.name == "posix":
            send_group_signal(process, signal.SIGKILL)
        else:
            process.kill()
        process.wait()


def bounded_capture(stream, limit, state):
    try:
        while True:
            chunk = stream.read(65536)
            if not chunk:
                break
            remaining = limit - len(state["payload"])
            if remaining > 0:
                state["payload"].extend(chunk[:remaining])
            if len(chunk) > remaining:
                state["truncated"] = True
    except OSError as error:
        state["error"] = str(error)
    finally:
        stream.close()


def write_log(log_path, content):
    descriptor, temporary_name = tempfile.mkstemp(prefix=".autoresearch-log-", dir=log_path.parent)
    try:
        os.fchmod(descriptor, 0o600)
        with os.fdopen(descriptor, "w", encoding="utf-8", errors="replace") as handle:
            handle.write(content)
            handle.flush()
            os.fsync(handle.fileno())
        os.replace(temporary_name, log_path)
        os.chmod(log_path, 0o600)
    finally:
        if os.path.exists(temporary_name):
            os.unlink(temporary_name)


args, command, legacy_command = parse_args()
log = contained_log_path(args.log)
start = time.monotonic()
exit_code = 1
timed_out = False

try:
    process = subprocess.Popen(
        command,
        stdin=subprocess.DEVNULL,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        cwd=Path.cwd(),
        start_new_session=os.name == "posix",
    )
except (FileNotFoundError, PermissionError, OSError) as error:
    write_log(log, redact(f"ERROR: cannot start metric command: {error}\n"))
    print("exit_code=127")
    print("seconds=0.000")
    print(f"log={log.relative_to(Path.cwd().resolve())}")
    raise SystemExit(127)

capture_state = {"payload": bytearray(), "truncated": False, "error": None}
capture_thread = threading.Thread(
    target=bounded_capture,
    args=(process.stdout, args.max_log_bytes, capture_state),
    daemon=True,
)
capture_thread.start()

try:
    exit_code = process.wait(timeout=args.timeout)
except subprocess.TimeoutExpired:
    timed_out = True
    stop_process_tree(process)
    exit_code = 124

capture_thread.join(timeout=2)
if capture_thread.is_alive():
    stop_process_tree(process)
    capture_thread.join(timeout=2)
if capture_thread.is_alive():
    capture_state["error"] = "output pipe did not close after process-tree termination"

payload = bytes(capture_state["payload"])
truncated = capture_state["truncated"]
output = redact(payload.decode("utf-8", errors="replace"))
if truncated:
    output += f"\nLOG TRUNCATED at {args.max_log_bytes} bytes\n"
if timed_out:
    output += f"\nTIMEOUT after {args.timeout}s\n"
if capture_state["error"]:
    output += f"\nOUTPUT CAPTURE ERROR: {capture_state['error']}\n"
write_log(log, output)

seconds = time.monotonic() - start
print(f"exit_code={exit_code}")
print(f"seconds={seconds:.3f}")
print(f"log={log.relative_to(Path.cwd().resolve())}")
if truncated:
    print("log_truncated=true")
if legacy_command:
    print("legacy_command_string=true")
raise SystemExit(exit_code)
