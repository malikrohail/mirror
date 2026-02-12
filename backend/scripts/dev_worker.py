"""Auto-reloading arq worker for development."""

import subprocess
import sys

from watchfiles import run_process


def run_worker():
    """Run the arq worker."""
    subprocess.run(
        [
            sys.executable,
            "-m",
            "arq",
            "app.workers.settings.WorkerSettings",
        ],
        cwd=".",
    )


if __name__ == "__main__":
    print("[dev_worker] Starting arq worker with auto-reload...")
    run_process(
        "app",
        target=run_worker,
        callback=lambda changes: print(
            f"[dev_worker] Detected changes: {changes}, restarting..."
        ),
    )
