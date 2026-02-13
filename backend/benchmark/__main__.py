"""Entry point for running the benchmark pipeline as a module.

Usage:
    cd backend && python -m benchmark <command> [options]
"""

from __future__ import annotations

from benchmark.cli import main

main()
