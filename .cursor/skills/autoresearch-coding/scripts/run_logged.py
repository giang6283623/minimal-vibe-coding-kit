#!/usr/bin/env python3
"""Run a shell command with timeout and write combined stdout/stderr to a log."""

from __future__ import annotations

import argparse
import subprocess
import time
from pathlib import Path


def main() -> int:
    parser = argparse.ArgumentParser(description="Run a command and save output to a log")
    parser.add_argument("--log", required=True, help="Log file path")
    parser.add_argument("--timeout", type=float, default=600.0, help="Timeout in seconds")
    parser.add_argument("command", nargs=argparse.REMAINDER, help="Command to run after --")
    args = parser.parse_args()

    if not args.command:
        raise SystemExit("missing command")
    command = args.command
    if command and command[0] == "--":
        command = command[1:]
    if not command:
        raise SystemExit("missing command after --")

    log_path = Path(args.log)
    log_path.parent.mkdir(parents=True, exist_ok=True)

    started = time.monotonic()
    timed_out = False
    return_code = 0

    with log_path.open("w", encoding="utf-8", errors="replace") as f:
        f.write("$ " + " ".join(command) + "\n")
        f.write("---\n")
        f.flush()
        try:
            proc = subprocess.run(
                command,
                stdout=f,
                stderr=subprocess.STDOUT,
                timeout=args.timeout,
                text=True,
                check=False,
            )
            return_code = proc.returncode
        except subprocess.TimeoutExpired:
            timed_out = True
            return_code = 124
            f.write(f"\n---\nTIMEOUT after {args.timeout:.1f}s\n")

        elapsed = time.monotonic() - started
        f.write("\n---\n")
        f.write(f"return_code: {return_code}\n")
        f.write(f"timed_out: {str(timed_out).lower()}\n")
        f.write(f"elapsed_seconds: {elapsed:.1f}\n")

    print(f"log_path: {log_path}")
    print(f"return_code: {return_code}")
    print(f"timed_out: {str(timed_out).lower()}")
    print(f"elapsed_seconds: {elapsed:.1f}")
    return return_code


if __name__ == "__main__":
    raise SystemExit(main())
