#!/usr/bin/env python3
"""Inventory AgentShield-relevant AI coding-agent surfaces in a repository.

This script is intentionally read-only. It does not execute hooks, package scripts,
MCP servers, or installer commands.
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Iterable

PATTERNS = {
    "repo_instructions": ["CLAUDE.md", "AGENTS.md", ".github/copilot-instructions.md"],
    "claude": [".claude", ".claude-plugin", "agents"],
    "codex": [".codex", ".codex-plugin"],
    "shared_skills": [".vibekit/skills", ".claude/skills", ".cursor/skills", ".agents/skills", "skills"],
    "shared_commands": [".vibekit/commands"],
    "kit_scripts": [".vibekit/scripts"],
    "hooks": ["hooks", ".claude/hooks", ".agents/hooks"],
    "mcp": [".mcp.json", "mcp.json", "mcp-configs"],
    "ci": [".github/workflows"],
}

SUSPICIOUS_TEXT = [
    "Bash" + "(*)",
    "npx" + " -y",
    "curl" + " | sh",
    "wget" + " | sh",
    "||" + " true",
    "2>" + "/dev/null",
    "ignore previous" + " instructions",
    "ignore all previous" + " instructions",
    "ANTHROPIC" + "_API_KEY=",
    "OPENAI" + "_API_KEY=",
    "GITHUB" + "_TOKEN=",
]


def iter_files(path: Path) -> Iterable[Path]:
    if path.is_file():
        yield path
    elif path.is_dir():
        for child in path.rglob("*"):
            if child.is_file() and ".git" not in child.parts:
                yield child


def safe_read(path: Path, limit: int = 200_000) -> str:
    try:
        data = path.read_bytes()[:limit]
        return data.decode("utf-8", errors="ignore")
    except OSError:
        return ""


def main() -> int:
    parser = argparse.ArgumentParser(description="Inventory Claude/Codex AgentShield surfaces")
    parser.add_argument("path", nargs="?", default=".", help="Repository root")
    parser.add_argument("--json", action="store_true", help="Emit JSON")
    args = parser.parse_args()

    root = Path(args.path).resolve()
    result: dict[str, object] = {"repo_root": str(root), "surfaces": {}, "suspicious_markers": []}

    surfaces: dict[str, list[str]] = {}
    suspicious: list[dict[str, str]] = []

    for category, patterns in PATTERNS.items():
        found: list[str] = []
        for pattern in patterns:
            candidate = root / pattern
            if candidate.exists():
                found.append(str(candidate.relative_to(root)))
                for file_path in iter_files(candidate):
                    if file_path.suffix.lower() not in {".md", ".json", ".toml", ".yaml", ".yml", ".sh", ".js", ".ts"}:
                        continue
                    text = safe_read(file_path)
                    for marker in SUSPICIOUS_TEXT:
                        if marker in text:
                            suspicious.append({
                                "path": str(file_path.relative_to(root)),
                                "marker": marker,
                                "category": category,
                            })
        surfaces[category] = found

    result["surfaces"] = surfaces
    result["suspicious_markers"] = suspicious

    if args.json:
        print(json.dumps(result, indent=2, sort_keys=True))
    else:
        print(f"Repo root: {root}")
        print("\nActive-looking surfaces:")
        for category, paths in surfaces.items():
            if paths:
                print(f"- {category}: {', '.join(paths)}")
        if suspicious:
            print("\nSuspicious markers needing review:")
            for item in suspicious:
                print(f"- {item['path']} [{item['category']}]: {item['marker']}")
        else:
            print("\nNo built-in suspicious markers found by probe. Run AgentShield for full analysis.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
