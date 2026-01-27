import httpx
from typing import Optional
from ..config import settings


def generate(prompt: str, model: Optional[str] = None) -> str:
    payload = {
        "model": model or settings.ollama_model,
        "prompt": prompt,
        "stream": False,
    }
    try:
        response = httpx.post(f"{settings.ollama_host}/api/generate", json=payload, timeout=20)
        response.raise_for_status()
        data = response.json()
        return data.get("response", "")
    except Exception:
        return ""
