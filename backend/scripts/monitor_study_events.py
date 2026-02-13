#!/usr/bin/env python3
"""Monitor Redis PubSub study events and durable live-view state."""

from __future__ import annotations

import argparse
import json
import time
from datetime import datetime
from typing import Any

import redis


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Watch study events and live-view session state in Redis."
    )
    parser.add_argument(
        "--study-id",
        default="",
        help="Specific study UUID to monitor. If omitted, monitors all study channels.",
    )
    parser.add_argument(
        "--redis-url",
        default="redis://localhost:6379/0",
        help="Redis URL (default: redis://localhost:6379/0).",
    )
    parser.add_argument(
        "--snapshot-every",
        type=int,
        default=10,
        help=(
            "Print durable live-session snapshot every N seconds per study. "
            "Set 0 to disable."
        ),
    )
    return parser.parse_args()


def now_iso() -> str:
    return datetime.now().strftime("%H:%M:%S")


def summarize_event(event: dict[str, Any]) -> str:
    msg_type = str(event.get("type", "unknown"))
    session_id = event.get("session_id")
    step_number = event.get("step_number")
    live_view = bool(event.get("live_view_url"))
    browser_active = event.get("browser_active")

    parts = [f"type={msg_type}"]
    if session_id:
        parts.append(f"session={session_id}")
    if step_number is not None:
        parts.append(f"step={step_number}")
    if "live_view_url" in event:
        parts.append(f"live={live_view}")
    if browser_active is not None:
        parts.append(f"browser_active={browser_active}")
    return " ".join(parts)


def print_snapshot(client: redis.Redis, study_id: str) -> None:
    key = f"study:{study_id}:live-sessions"
    rows = client.hgetall(key)
    print(f"[{now_iso()}] snapshot study={study_id} sessions={len(rows)}")
    for session_id, payload in rows.items():
        try:
            state = json.loads(payload)
        except json.JSONDecodeError:
            print(f"  - session={session_id} invalid_json=True")
            continue
        print(
            "  - session={session} step={step} live={live} browser_active={active}".format(
                session=session_id,
                step=state.get("step_number"),
                live=bool(state.get("live_view_url")),
                active=state.get("browser_active"),
            )
        )


def extract_study_id(channel_name: str) -> str:
    # Channel format: study:{study_id}
    if channel_name.startswith("study:"):
        return channel_name.split(":", 1)[1]
    return ""


def main() -> int:
    args = parse_args()
    client = redis.Redis.from_url(args.redis_url, decode_responses=True)
    pubsub = client.pubsub(ignore_subscribe_messages=True)

    if args.study_id:
        channel = f"study:{args.study_id}"
        pubsub.subscribe(channel)
        print(f"[{now_iso()}] monitoring channel={channel}")
    else:
        pubsub.psubscribe("study:*")
        print(f"[{now_iso()}] monitoring pattern=study:*")

    last_snapshot_at: dict[str, float] = {}
    try:
        for raw in pubsub.listen():
            msg_type = raw.get("type")
            if msg_type not in {"message", "pmessage"}:
                continue

            channel_name = str(raw.get("channel", ""))
            study_id = extract_study_id(channel_name)
            payload = raw.get("data")
            if not isinstance(payload, str):
                payload = str(payload)

            try:
                event = json.loads(payload)
            except json.JSONDecodeError:
                print(f"[{now_iso()}] study={study_id} non-json payload={payload!r}")
                continue

            print(
                f"[{now_iso()}] study={study_id} {summarize_event(event)}"
            )

            if args.snapshot_every > 0 and study_id:
                now = time.time()
                last = last_snapshot_at.get(study_id, 0)
                if now - last >= args.snapshot_every:
                    print_snapshot(client, study_id)
                    last_snapshot_at[study_id] = now
    except KeyboardInterrupt:
        print(f"\n[{now_iso()}] stopping monitor")
    finally:
        pubsub.close()
        client.close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
