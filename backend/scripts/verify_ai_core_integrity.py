#!/usr/bin/env python3
"""Create and verify a SHA-256 inventory for the read-only AI Core tree."""

from __future__ import annotations

import argparse
import fnmatch
import hashlib
import json
import sys
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

SNAPSHOT_VERSION = 1


def _matches_any(relative_path: str, patterns: list[str]) -> bool:
    return any(fnmatch.fnmatch(relative_path, pattern) for pattern in patterns)


def build_inventory(root: Path, ignore_patterns: list[str]) -> dict[str, dict[str, Any]]:
    if not root.is_dir():
        raise FileNotFoundError(f"AI Core directory does not exist: {root}")

    inventory: dict[str, dict[str, Any]] = {}
    for candidate in sorted(root.rglob("*")):
        if not candidate.is_file():
            continue
        relative_path = candidate.relative_to(root).as_posix()
        if _matches_any(relative_path, ignore_patterns):
            continue

        digest = hashlib.sha256()
        with candidate.open("rb") as source:
            for chunk in iter(lambda: source.read(1024 * 1024), b""):
                digest.update(chunk)
        inventory[relative_path] = {
            "sha256": digest.hexdigest(),
            "size": candidate.stat().st_size,
        }
    return inventory


def create_snapshot(root: Path, output: Path, ignore_patterns: list[str]) -> int:
    if output == root or root in output.parents:
        raise ValueError("Integrity snapshots must be stored outside the AI Core tree")
    files = build_inventory(root, ignore_patterns)
    payload: dict[str, Any] = {
        "version": SNAPSHOT_VERSION,
        "createdAt": datetime.now(UTC).isoformat(),
        "rootName": root.name,
        "ignorePatterns": ignore_patterns,
        "files": files,
    }
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(payload, indent=2, sort_keys=True), encoding="utf-8")
    print(f"Snapshot created: {output} ({len(files)} files)")
    return 0


def verify_snapshot(root: Path, snapshot_path: Path) -> int:
    if not snapshot_path.is_file():
        raise FileNotFoundError(f"Snapshot does not exist: {snapshot_path}")

    payload = json.loads(snapshot_path.read_text(encoding="utf-8"))
    if payload.get("version") != SNAPSHOT_VERSION:
        raise ValueError(f"Unsupported snapshot version: {payload.get('version')}")

    expected: dict[str, dict[str, Any]] = payload.get("files", {})
    ignore_patterns: list[str] = payload.get("ignorePatterns", [])
    actual = build_inventory(root, ignore_patterns)

    expected_paths = set(expected)
    actual_paths = set(actual)
    added = sorted(actual_paths - expected_paths)
    removed = sorted(expected_paths - actual_paths)
    modified = sorted(
        path
        for path in expected_paths & actual_paths
        if expected[path].get("sha256") != actual[path].get("sha256")
        or expected[path].get("size") != actual[path].get("size")
    )

    report = {"added": added, "removed": removed, "modified": modified}
    if any(report.values()):
        print(json.dumps(report, indent=2, ensure_ascii=False))
        print("AI Core integrity verification failed.", file=sys.stderr)
        return 1

    print(f"AI Core integrity verified: {len(actual)} files unchanged.")
    return 0


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__)
    subparsers = parser.add_subparsers(dest="command", required=True)

    snapshot_parser = subparsers.add_parser("snapshot", help="Create a baseline inventory")
    snapshot_parser.add_argument("--path", required=True, type=Path)
    snapshot_parser.add_argument("--output", required=True, type=Path)
    snapshot_parser.add_argument(
        "--ignore",
        action="append",
        default=[],
        help="Explicit glob to omit; may be supplied more than once",
    )

    verify_parser = subparsers.add_parser("verify", help="Compare a tree with a baseline")
    verify_parser.add_argument("--path", required=True, type=Path)
    verify_parser.add_argument("--snapshot", required=True, type=Path)
    return parser


def main() -> int:
    args = build_parser().parse_args()
    try:
        if args.command == "snapshot":
            return create_snapshot(args.path.resolve(), args.output.resolve(), args.ignore)
        return verify_snapshot(args.path.resolve(), args.snapshot.resolve())
    except (OSError, ValueError, json.JSONDecodeError) as exc:
        print(f"Integrity check error: {exc}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
