"""CLI entrypoint — scan AWS and write snapshot JSON."""

from __future__ import annotations

import json
import os
from pathlib import Path

from dotenv import load_dotenv

from scanner.aws_scanner import AwsScanner

DATA_DIR = Path(__file__).resolve().parent.parent / "data"


def main() -> None:
    load_dotenv()
    scanner = AwsScanner()
    snapshot = scanner.scan()
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    out = DATA_DIR / "latest_scan.json"
    out.write_text(snapshot.model_dump_json(indent=2))
    print(f"Scanned {len(snapshot.nodes)} nodes, {len(snapshot.edges)} edges")
    print(f"Snapshot: {out}")


if __name__ == "__main__":
    main()
