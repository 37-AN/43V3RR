import httpx

ALLOWED_DOMAINS = {"localhost", "127.0.0.1"}


def safe_get(url: str) -> str:
    if not any(domain in url for domain in ALLOWED_DOMAINS):
        raise ValueError("Domain not allowed")
    response = httpx.get(url, timeout=10)
    response.raise_for_status()
    return response.text
