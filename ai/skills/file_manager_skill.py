from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]


def _resolve_safe(path: str) -> Path:
    full_path = (REPO_ROOT / path).resolve()
    if not str(full_path).startswith(str(REPO_ROOT)):
        raise ValueError("Path outside repo root")
    return full_path


def read_text(path: str) -> str:
    full_path = _resolve_safe(path)
    return full_path.read_text(encoding="utf-8")


def write_text(path: str, content: str) -> None:
    full_path = _resolve_safe(path)
    full_path.parent.mkdir(parents=True, exist_ok=True)
    full_path.write_text(content, encoding="utf-8")
