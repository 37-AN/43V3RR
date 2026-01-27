import httpx


def trigger_webhook(url: str, payload: dict) -> dict:
    response = httpx.post(url, json=payload, timeout=10)
    response.raise_for_status()
    return response.json()
