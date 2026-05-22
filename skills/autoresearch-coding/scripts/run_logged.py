#!/usr/bin/env python3
import argparse
import subprocess
import time
from pathlib import Path

parser = argparse.ArgumentParser(description="Run a command with timeout and log output")
parser.add_argument("command", help="Shell command to run")
parser.add_argument("--log", required=True, help="Log path")
parser.add_argument("--timeout", type=int, default=600)
args = parser.parse_args()

log = Path(args.log)
log.parent.mkdir(parents=True, exist_ok=True)
start = time.time()
try:
    result = subprocess.run(args.command, shell=True, text=True, capture_output=True, timeout=args.timeout)
    seconds = time.time() - start
    log.write_text(result.stdout + result.stderr, encoding="utf-8", errors="ignore")
    print(f"exit_code={result.returncode}")
    print(f"seconds={seconds:.3f}")
    print(f"log={log}")
    raise SystemExit(result.returncode)
except subprocess.TimeoutExpired as exc:
    seconds = time.time() - start
    log.write_text((exc.stdout or "") + (exc.stderr or "") + f"\nTIMEOUT after {args.timeout}s\n", encoding="utf-8", errors="ignore")
    print("exit_code=124")
    print(f"seconds={seconds:.3f}")
    print(f"log={log}")
    raise SystemExit(124)
