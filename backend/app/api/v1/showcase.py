"""Showcase endpoint: returns pre-built demo study data for new users."""

import json
from pathlib import Path

from fastapi import APIRouter

router = APIRouter()

_DATA_PATH = Path(__file__).resolve().parent.parent.parent / "data" / "showcase_study.json"
_cached_data: dict | None = None


def _load_showcase_data() -> dict:
    """Load and cache the showcase study JSON."""
    global _cached_data
    if _cached_data is None:
        with open(_DATA_PATH) as f:
            _cached_data = json.load(f)
    return _cached_data


@router.get("/showcase")
async def get_showcase_study() -> dict:
    """Return pre-built showcase study data for demo purposes.

    Returns a complete study response with realistic mock data including
    sessions, issues, and insights so new users can explore what Mirror
    produces without running their own study.
    """
    return _load_showcase_data()
