"""Auto-reloading arq worker for development.

Uses asyncio.run() directly to avoid the Python 3.12+ deprecation of
asyncio.get_event_loop() in threads without a running loop (which breaks
the `arq` CLI entrypoint on Python 3.14+).
"""

import asyncio
import logging
import os
import sys

logger = logging.getLogger(__name__)


def _configure_logging() -> None:
    """Enable structured INFO logs so worker failures are visible in dev."""
    level_name = os.getenv("LOG_LEVEL", "INFO").upper()
    level = getattr(logging, level_name, logging.INFO)
    logging.basicConfig(
        level=level,
        format="%(asctime)s %(levelname)s [%(name)s] %(message)s",
        force=True,
    )


def _clear_stale_jobs() -> None:
    """Clear stale arq in-progress markers left by a previously killed worker.

    When the dev worker is killed (e.g. Ctrl+C, kill signal), arq may leave
    behind in-progress markers that prevent jobs from being re-picked-up.
    This runs at startup to clean them up.
    """
    import redis

    try:
        r = redis.Redis()
        stale = r.keys("arq:in-progress:*")
        if stale:
            for key in stale:
                r.delete(key)
            # Also clear retry counters so jobs get a fresh start
            for key in r.keys("arq:retry:*"):
                r.delete(key)
            print(f"[dev_worker] Cleared {len(stale)} stale in-progress job(s)")
        r.close()
    except Exception as e:
        print(f"[dev_worker] Warning: could not clear stale jobs: {e}")


def run_worker():
    """Run the arq worker via asyncio.run (avoids get_event_loop deprecation).

    Python 3.14 removed the implicit event loop creation in get_event_loop().
    arq 0.27 calls get_event_loop() in Worker.__init__, so we must ensure a
    running loop exists before the Worker is instantiated.
    """
    from arq.worker import create_worker

    from app.workers.settings import WorkerSettings

    _configure_logging()
    _clear_stale_jobs()

    # Set a current event loop so arq's Worker.__init__ can find it
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)

    logger.info("[dev_worker] Starting arq worker (pid=%s)", os.getpid())
    worker = create_worker(WorkerSettings)
    worker.run()


if __name__ == "__main__":
    # Simple direct launch (no auto-reload) when run standalone
    if "--watch" in sys.argv:
        from watchfiles import run_process

        print("[dev_worker] Starting arq worker with auto-reload...")
        run_process(
            "app",
            target=run_worker,
            callback=lambda changes: print(
                f"[dev_worker] Detected changes: {changes}, restarting..."
            ),
        )
    else:
        print("[dev_worker] Booting worker process...")
        run_worker()
