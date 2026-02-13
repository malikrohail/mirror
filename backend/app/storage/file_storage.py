import io
import logging
import os
import uuid
from pathlib import Path

logger = logging.getLogger(__name__)


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

    # Generic read/write

    async def read(self, path: str) -> bytes:
        """Read raw bytes from a storage path."""
        full = self.base_path / path
        if not full.exists():
            raise FileNotFoundError(f"File not found: {path}")
        return full.read_bytes()

    async def write(self, path: str, data: bytes) -> None:
        """Write raw bytes to a storage path."""
        full = self.base_path / path
        full.parent.mkdir(parents=True, exist_ok=True)
        full.write_bytes(data)

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


class R2Storage(FileStorage):
    """S3-compatible storage using Cloudflare R2.

    Zero egress fees — critical for session replays that load many screenshots.
    Falls back to local FileStorage for any unsupported operations.
    """

    def __init__(self, base_path: str = "./data") -> None:
        super().__init__(base_path)
        self._client = None
        self._bucket = os.getenv("R2_BUCKET_NAME", "mirror-screenshots")

    def _get_client(self):
        """Lazily initialize the boto3 S3 client for R2."""
        if self._client is None:
            try:
                import boto3
                self._client = boto3.client(
                    "s3",
                    endpoint_url=os.getenv("R2_ENDPOINT_URL"),
                    aws_access_key_id=os.getenv("R2_ACCESS_KEY_ID"),
                    aws_secret_access_key=os.getenv("R2_SECRET_ACCESS_KEY"),
                    region_name="auto",
                )
            except Exception as e:
                logger.warning("Failed to initialize R2 client: %s", e)
                return None
        return self._client

    def save_screenshot(
        self,
        study_id: uuid.UUID,
        session_id: uuid.UUID,
        step_number: int,
        image_bytes: bytes,
    ) -> str:
        """Save a screenshot to R2, falling back to local storage."""
        relative_path = f"studies/{study_id}/sessions/{session_id}/steps/step_{step_number:03d}.png"

        client = self._get_client()
        if client:
            try:
                client.put_object(
                    Bucket=self._bucket,
                    Key=relative_path,
                    Body=image_bytes,
                    ContentType="image/png",
                )
                logger.debug("Saved screenshot to R2: %s", relative_path)
                return relative_path
            except Exception as e:
                logger.warning("R2 upload failed, falling back to local: %s", e)

        # Fallback to local storage
        return super().save_screenshot(study_id, session_id, step_number, image_bytes)

    def get_screenshot_full_path(self, path: str) -> Path | None:
        """Try local first, then R2."""
        local = super().get_screenshot_full_path(path)
        if local:
            return local

        # Try downloading from R2 to local cache
        client = self._get_client()
        if client:
            try:
                response = client.get_object(Bucket=self._bucket, Key=path)
                image_bytes = response["Body"].read()

                # Cache locally
                local_path = self.base_path / path
                local_path.parent.mkdir(parents=True, exist_ok=True)
                local_path.write_bytes(image_bytes)
                return local_path
            except Exception:
                pass

        return None

    def save_report(self, study_id: uuid.UUID, format: str, content: str | bytes) -> str:
        """Save report to both R2 and local storage."""
        local_path = super().save_report(study_id, format, content)

        # Also upload to R2
        client = self._get_client()
        if client:
            ext = "md" if format == "markdown" else format
            key = f"studies/{study_id}/report.{ext}"
            try:
                body = content if isinstance(content, bytes) else content.encode("utf-8")
                content_type = "application/pdf" if format == "pdf" else "text/markdown"
                client.put_object(
                    Bucket=self._bucket,
                    Key=key,
                    Body=body,
                    ContentType=content_type,
                )
            except Exception as e:
                logger.warning("R2 report upload failed: %s", e)

        return local_path


def create_storage() -> FileStorage:
    """Factory function to create the appropriate storage backend.

    Uses R2 if configured, otherwise falls back to local FileStorage.
    """
    storage_path = os.getenv("STORAGE_PATH", "./data")

    if os.getenv("R2_ENDPOINT_URL") and os.getenv("R2_ACCESS_KEY_ID"):
        logger.info("Using Cloudflare R2 storage")
        return R2Storage(base_path=storage_path)

    logger.info("Using local file storage")
    return FileStorage(base_path=storage_path)
