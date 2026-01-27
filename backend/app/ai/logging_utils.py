import json
from datetime import datetime
from pathlib import Path
from typing import Any, Dict

LOG_PATH = Path("/app/logs/agent_activity.jsonl")


def append_activity(entry: Dict[str, Any]) -> None:
    LOG_PATH.parent.mkdir(parents=True, exist_ok=True)
    payload = {"timestamp": datetime.utcnow().isoformat()} | entry
    with LOG_PATH.open("a", encoding="utf-8") as handle:
        handle.write(json.dumps(payload) + "\n")
