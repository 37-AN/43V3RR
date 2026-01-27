from pathlib import Path

MEMORY_ROOT = Path(__file__).resolve().parents[2] / "ai" / "memory"


def read_memory(path: str) -> str:
    full_path = (MEMORY_ROOT / path).resolve()
    if not str(full_path).startswith(str(MEMORY_ROOT)):
        raise ValueError("Path outside memory root")
    return full_path.read_text(encoding="utf-8")


def write_memory(path: str, content: str) -> None:
    full_path = (MEMORY_ROOT / path).resolve()
    if not str(full_path).startswith(str(MEMORY_ROOT)):
        raise ValueError("Path outside memory root")
    full_path.parent.mkdir(parents=True, exist_ok=True)
    full_path.write_text(content, encoding="utf-8")
