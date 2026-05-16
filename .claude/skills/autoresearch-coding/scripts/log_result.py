#!/usr/bin/env python3
"""Append one row to an autoresearch results.tsv ledger."""

from __future__ import annotations

import argparse
import csv
from pathlib import Path

HEADER = ["commit", "metric_value", "direction", "status", "seconds", "log_path", "description"]
VALID_STATUS = {"keep", "discard", "crash"}
VALID_DIRECTION = {"lower", "higher"}


def clean(value: str) -> str:
    return str(value).replace("\t", " ").replace("\n", " ").strip()


def main() -> int:
    parser = argparse.ArgumentParser(description="Append an autoresearch result row")
    parser.add_argument("--file", default="results.tsv")
    parser.add_argument("--commit", required=True)
    parser.add_argument("--metric-value", required=True)
    parser.add_argument("--direction", required=True, choices=sorted(VALID_DIRECTION))
    parser.add_argument("--status", required=True, choices=sorted(VALID_STATUS))
    parser.add_argument("--seconds", default="")
    parser.add_argument("--log-path", default="")
    parser.add_argument("--description", required=True)
    args = parser.parse_args()

    path = Path(args.file)
    needs_header = not path.exists() or path.stat().st_size == 0
    path.parent.mkdir(parents=True, exist_ok=True) if path.parent != Path(".") else None

    row = [
        clean(args.commit),
        clean(args.metric_value),
        clean(args.direction),
        clean(args.status),
        clean(args.seconds),
        clean(args.log_path),
        clean(args.description),
    ]

    with path.open("a", newline="", encoding="utf-8") as f:
        writer = csv.writer(f, delimiter="\t", lineterminator="\n")
        if needs_header:
            writer.writerow(HEADER)
        writer.writerow(row)

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
