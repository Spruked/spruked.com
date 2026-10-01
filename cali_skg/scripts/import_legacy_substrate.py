#!/usr/bin/env python3
"""Import CALI legacy substrate into the local WSL runtime mirror.

Usage:
    python -m cali_skg.scripts.import_legacy_substrate
    python -m cali_skg.scripts.import_legacy_substrate --overwrite
    python -m cali_skg.scripts.import_legacy_substrate --status

The source archive is never modified. This command copies declared assets into
cali_skg, verifies them by SHA-256, and rebuilds the local searchable indexes.
"""
from __future__ import annotations

import argparse
import json

from cali_skg.core.cali_unified_substrate import get_unified_substrate


def main() -> None:
    parser = argparse.ArgumentParser(description="Import CALI legacy substrate")
    parser.add_argument("--overwrite", action="store_true", help="refresh changed local mirrors from canonical archive")
    parser.add_argument("--status", action="store_true", help="show current substrate/index status without importing")
    args = parser.parse_args()

    substrate = get_unified_substrate()
    result = substrate.status() if args.status else substrate.bootstrap(overwrite=args.overwrite)
    print(json.dumps(result, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
