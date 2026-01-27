import json
from datetime import datetime


def structured_log(message: str, **kwargs) -> str:
    payload = {"message": message, "timestamp": datetime.utcnow().isoformat()}
    payload.update(kwargs)
    return json.dumps(payload)
