import os
from dataclasses import dataclass
from typing import Any, Dict, List


@dataclass
class ProjectSummary:
    name: str
    brand: str
    description: str
    type: str
    status: str
    tags: List[str]


def _guess_tech_type(files: List[str]) -> str:
    if "package.json" in files:
        return "web_app"
    if "pyproject.toml" in files or "requirements.txt" in files:
        return "python_app"
    if any(name.endswith(('.sh', '.ps1')) for name in files):
        return "tool"
    return "code_project"


def _guess_records_type(files: List[str], name: str) -> str:
    lower = name.lower()
    if "album" in lower:
        return "album"
    if "ep" in lower:
        return "ep"
    if "pack" in lower:
        return "beat_pack"
    if any(f.endswith(".mid") or f.endswith(".midi") for f in files):
        return "song"
    return "song"


def _guess_records_status(files: List[str]) -> str:
    lowered = [f.lower() for f in files]
    if any("master" in f for f in lowered):
        return "ready_for_release"
    if any("mix" in f for f in lowered):
        return "mix"
    if any(f.endswith((".wav", ".mp3", ".flac")) for f in lowered):
        return "production"
    return "idea"


def _guess_tech_status(files: List[str]) -> str:
    if "README.md" in files and any("tests" in f for f in files):
        return "ready_for_demo"
    if "README.md" in files:
        return "wip"
    return "prototype"


def interpret_change(descriptor: Dict[str, Any], change_type: str) -> Dict[str, Any]:
    files = descriptor.get("files", [])
    name = descriptor.get("name")
    brand = descriptor.get("brand")

    if brand == "tech":
        project_type = _guess_tech_type(files)
        status = _guess_tech_status(files)
        tags = [project_type, "automation", "ai"]
        description = f"Tech project inferred from filesystem ({project_type})."
        tasks = []
        if "README.md" not in files:
            tasks.append(
                {
                    "title": "Add README for project",
                    "description": "Create a short README describing purpose and setup.",
                    "priority": "medium",
                }
            )
        if not any("tests" in f for f in files):
            tasks.append(
                {
                    "title": "Add minimal tests",
                    "description": "Create basic tests to validate core functionality.",
                    "priority": "medium",
                }
            )
        content_items = []
        if status == "ready_for_demo":
            content_items.append(
                {
                    "title": f"Demo: {name}",
                    "type": "case_study",
                    "status": "idea",
                    "source": "filesystem_sync",
                }
            )
    else:
        project_type = _guess_records_type(files, name)
        status = _guess_records_status(files)
        tags = [project_type, "records"]
        description = f"Records project inferred from filesystem ({project_type})."
        tasks = []
        if status in {"production", "mix"}:
            tasks.append(
                {
                    "title": "Get feedback on latest version",
                    "description": "Share mix with trusted listeners and collect notes.",
                    "priority": "medium",
                }
            )
        if status == "ready_for_release":
            tasks.append(
                {
                    "title": "Create release plan",
                    "description": "Define release date, artwork, and distribution steps.",
                    "priority": "high",
                }
            )
        content_items = []
        if status in {"production", "mix", "ready_for_release"}:
            content_items.append(
                {
                    "title": f"Teaser: {name}",
                    "type": "teaser",
                    "status": "idea",
                    "source": "filesystem_sync",
                }
            )

    summary = ProjectSummary(
        name=name,
        brand=brand,
        description=description,
        type=project_type,
        status=status,
        tags=tags,
    )

    return {
        "project_summary": summary,
        "suggested_db_changes": {
            "create_or_update_project": {
                "type": project_type,
                "status": status,
                "description": description,
                "tags": tags,
            },
            "create_tasks": tasks,
            "create_content_items": content_items,
        },
        "memory_updates": [],
        "log_message": f"{change_type}: {name} ({brand})",
    }
