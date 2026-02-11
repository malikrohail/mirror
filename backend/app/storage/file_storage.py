import uuid
from pathlib import Path


class FileStorage:
    """Local filesystem storage with an S3-compatible interface.

    Directory structure:
        {base_path}/studies/{study_id}/
            sessions/{session_id}/steps/step_001.png
            heatmaps/{page_hash}.png
            report.md
            report.pdf
    """

    def __init__(self, base_path: str = "./data"):
        self.base_path = Path(base_path)

    def _study_dir(self, study_id: uuid.UUID) -> Path:
        return self.base_path / "studies" / str(study_id)

    def _session_dir(self, study_id: uuid.UUID, session_id: uuid.UUID) -> Path:
        return self._study_dir(study_id) / "sessions" / str(session_id)

    # Screenshots

    def save_screenshot(
        self,
        study_id: uuid.UUID,
        session_id: uuid.UUID,
        step_number: int,
        image_bytes: bytes,
    ) -> str:
        """Save a screenshot PNG and return its relative path."""
        session_dir = self._session_dir(study_id, session_id) / "steps"
        session_dir.mkdir(parents=True, exist_ok=True)

        filename = f"step_{step_number:03d}.png"
        filepath = session_dir / filename
        filepath.write_bytes(image_bytes)

        # Return relative path for storage in DB
        return f"studies/{study_id}/sessions/{session_id}/steps/{filename}"

    def get_screenshot_url(self, path: str) -> str:
        """Convert a storage path to an API URL."""
        return f"/api/v1/screenshots/{path}"

    def get_screenshot_full_path(self, path: str) -> Path | None:
        """Get the full filesystem path for a screenshot."""
        full = self.base_path / path
        if full.exists():
            return full
        return None

    # Reports

    def save_report(self, study_id: uuid.UUID, format: str, content: str | bytes) -> str:
        """Save a report (markdown or PDF)."""
        study_dir = self._study_dir(study_id)
        study_dir.mkdir(parents=True, exist_ok=True)

        ext = "md" if format == "markdown" else format
        filepath = study_dir / f"report.{ext}"

        if isinstance(content, bytes):
            filepath.write_bytes(content)
        else:
            filepath.write_text(content, encoding="utf-8")

        return str(filepath)

    def report_exists(self, study_id: uuid.UUID, format: str) -> bool:
        ext = "md" if format == "markdown" else format
        filepath = self._study_dir(study_id) / f"report.{ext}"
        return filepath.exists()

    def get_report(self, study_id: uuid.UUID, format: str) -> str | None:
        ext = "md" if format == "markdown" else format
        filepath = self._study_dir(study_id) / f"report.{ext}"
        if filepath.exists():
            return filepath.read_text(encoding="utf-8")
        return None

    def get_report_path(self, study_id: uuid.UUID, format: str) -> Path | None:
        ext = "md" if format == "markdown" else format
        filepath = self._study_dir(study_id) / f"report.{ext}"
        if filepath.exists():
            return filepath
        return None

    # Heatmaps

    def save_heatmap(self, study_id: uuid.UUID, page_url_hash: str, image_bytes: bytes) -> str:
        """Save a heatmap PNG."""
        heatmap_dir = self._study_dir(study_id) / "heatmaps"
        heatmap_dir.mkdir(parents=True, exist_ok=True)

        filepath = heatmap_dir / f"{page_url_hash}.png"
        filepath.write_bytes(image_bytes)
        return str(filepath)
