#!/usr/bin/env python3
"""CLI entry for site bake. Implementation lives in scripts/bake.py (shared with SCF).

Run: python3 scripts/build.py
Gate: XZ_GATE=0 python3 scripts/build.py  (default ON)
"""
from __future__ import annotations
import sys
from pathlib import Path

# Allow `python3 scripts/build.py` without installing a package.
_SCRIPTS = Path(__file__).resolve().parent
if str(_SCRIPTS) not in sys.path:
    sys.path.insert(0, str(_SCRIPTS))

from bake import build  # noqa: E402


if __name__ == "__main__":
    build()
