#!/usr/bin/env python3
import argparse
from pathlib import Path

HEADER = "commit\tmetric_value\tdirection\tstatus\tseconds\tlog_path\tdescription\n"

parser = argparse.ArgumentParser(description="Append an autoresearch result row")
parser.add_argument("--file", default="results.tsv")
parser.add_argument("--commit", required=True)
parser.add_argument("--metric", required=True)
parser.add_argument("--direction", required=True, choices=["lower", "higher"])
parser.add_argument("--status", required=True, choices=["keep", "discard", "crash"])
parser.add_argument("--seconds", required=True)
parser.add_argument("--log", required=True)
parser.add_argument("--description", required=True)
args = parser.parse_args()

path = Path(args.file)
if not path.exists():
    path.write_text(HEADER, encoding="utf-8")
row = "\t".join([args.commit, args.metric, args.direction, args.status, args.seconds, args.log, args.description.replace("\t", " ")]) + "\n"
with path.open("a", encoding="utf-8") as f:
    f.write(row)
print(f"logged {args.status} -> {path}")
