import hashlib
import json
import os
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Tuple

from sqlalchemy.orm import Session

from ..config import settings
from ..models import Project, Task, ContentItem
from ..services.audit_service import write_audit_log
from ..services.ai_run_service import start_ai_run, complete_ai_run
from ..services.brand_service import get_brand_by_slug
from ..ai.filesystem_sync_agent import interpret_change, ProjectSummary


SNAPSHOT_PATH = Path("/app/logs/filesystem_snapshot.json")
ALLOWED_ROOT = Path(settings.fs_sync_root).resolve()
REPO_ROOT = Path(__file__).resolve().parents[2]
PROJECTS_OVERVIEW = REPO_ROOT / "ai" / "memory" / "systems" / "projects_overview.md"


def _ensure_snapshot_dir():
    SNAPSHOT_PATH.parent.mkdir(parents=True, exist_ok=True)


def _load_snapshot() -> Dict[str, Any]:
    if not SNAPSHOT_PATH.exists():
        return {}
    try:
        return json.loads(SNAPSHOT_PATH.read_text(encoding="utf-8"))
    except Exception:
        return {}


def _save_snapshot(snapshot: Dict[str, Any]) -> None:
    _ensure_snapshot_dir()
    SNAPSHOT_PATH.write_text(json.dumps(snapshot, indent=2), encoding="utf-8")


def _append_project_overview(entry: str) -> bool:
    try:
        PROJECTS_OVERVIEW.parent.mkdir(parents=True, exist_ok=True)
        if not PROJECTS_OVERVIEW.exists():
            PROJECTS_OVERVIEW.write_text("# Projects Overview\n\n", encoding="utf-8")
        with PROJECTS_OVERVIEW.open("a", encoding="utf-8") as handle:
            handle.write(entry + "\n")
        return True
    except Exception:
        return False


def _fingerprint(files: List[Dict[str, Any]]) -> str:
    hasher = hashlib.sha256()
    for entry in sorted(files, key=lambda x: x["path"]):
        hasher.update(entry["path"].encode("utf-8"))
        hasher.update(str(entry.get("size", 0)).encode("utf-8"))
        hasher.update(str(entry.get("mtime", 0)).encode("utf-8"))
    return hasher.hexdigest()


def _scan_project_dir(project_path: Path, brand: str) -> Dict[str, Any]:
    files: List[Dict[str, Any]] = []
    total_size = 0
    last_modified = 0.0

    for root, _, filenames in os.walk(project_path):
        for filename in filenames:
            full_path = Path(root) / filename
            try:
                stat = full_path.stat()
            except FileNotFoundError:
                continue
            rel_path = str(full_path.relative_to(project_path))
            files.append({"path": rel_path, "size": stat.st_size, "mtime": int(stat.st_mtime)})
            total_size += stat.st_size
            last_modified = max(last_modified, stat.st_mtime)

    descriptor = {
        "path": str(project_path),
        "brand": brand,
        "name": project_path.name,
        "files": [f["path"] for f in files],
        "file_count": len(files),
        "total_size": total_size,
        "last_modified": int(last_modified),
        "fingerprint": _fingerprint(files),
    }
    return descriptor


def _scan_root(root: Path) -> Dict[str, Dict[str, Any]]:
    if not root.exists():
        return {}
    if not str(root.resolve()).startswith(str(ALLOWED_ROOT)):
        raise ValueError("Filesystem sync root outside allowed directory")

    projects: Dict[str, Dict[str, Any]] = {}
    for brand_folder in ["tech", "records"]:
        brand_path = root / brand_folder
        if not brand_path.exists():
            continue
        for child in brand_path.iterdir():
            if child.is_dir():
                descriptor = _scan_project_dir(child, brand_folder)
                projects[str(child)] = descriptor
    return projects


def _detect_changes(current: Dict[str, Dict[str, Any]], snapshot: Dict[str, Any]) -> List[Tuple[str, Dict[str, Any]]]:
    changes: List[Tuple[str, Dict[str, Any]]] = []
    prev = snapshot.get("projects", {})

    for path, descriptor in current.items():
        if path not in prev:
            changes.append(("new_project", descriptor))
        else:
            if descriptor.get("fingerprint") != prev[path].get("fingerprint"):
                changes.append(("updated_project", descriptor))

    for path, descriptor in prev.items():
        if path not in current:
            changes.append(("deleted_project", descriptor))

    return changes


def _find_project_by_path(db: Session, filesystem_path: str) -> Project | None:
    projects = db.query(Project).all()
    for project in projects:
        meta = project.meta or {}
        if meta.get("filesystem_path") == filesystem_path:
            return project
    return None


def _ensure_task(db: Session, project_id: int, brand_id: int, task_payload: Dict[str, Any]) -> Task:
    existing = (
        db.query(Task)
        .filter(Task.project_id == project_id)
        .filter(Task.title == task_payload["title"])
        .filter(Task.source == "filesystem_sync")
        .first()
    )
    if existing:
        return existing
    task = Task(
        project_id=project_id,
        brand_id=brand_id,
        title=task_payload["title"],
        description=task_payload.get("description"),
        status="open",
        priority=task_payload.get("priority", "medium"),
        source="filesystem_sync",
        created_by="agent",
        assigned_to="human",
        meta=task_payload.get("meta", task_payload.get("metadata", {})),
    )
    db.add(task)
    db.commit()
    db.refresh(task)
    return task


def _ensure_content_item(db: Session, brand_id: int, project: Project, item_payload: Dict[str, Any]) -> ContentItem:
    existing = (
        db.query(ContentItem)
        .filter(ContentItem.title == item_payload["title"])
        .filter(ContentItem.source == "filesystem_sync")
        .first()
    )
    if existing:
        return existing
    item = ContentItem(
        brand_id=brand_id,
        title=item_payload["title"],
        type=item_payload.get("type", "post"),
        status=item_payload.get("status", "idea"),
        source="filesystem_sync",
        meta={"project_id": project.id},
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


def run_filesystem_sync(db: Session, root_override: str | None = None) -> Dict[str, Any]:
    root = Path(root_override or settings.fs_sync_root).resolve()
    if not str(root).startswith(str(ALLOWED_ROOT)):
        raise ValueError("Filesystem sync root outside allowed directory")

    run = start_ai_run(db, agent_name="filesystem_sync_agent", input_summary=str(root))
    snapshot = _load_snapshot()
    current = _scan_root(root)
    changes = _detect_changes(current, snapshot)

    updates_applied = 0
    for change_type, descriptor in changes:
        if change_type == "deleted_project":
            write_audit_log(
                db,
                actor_type="agent",
                actor_id="filesystem_sync_agent",
                action="project_deleted",
                entity_type="project",
                entity_id=descriptor.get("name"),
                details={"path": descriptor.get("path")},
            )
            continue

        result = interpret_change(descriptor, change_type)
        summary: ProjectSummary = result["project_summary"]
        brand_slug = "43v3r_technology" if summary.brand == "tech" else "43v3r_records"
        brand = get_brand_by_slug(db, brand_slug)
        if not brand:
            continue

        project = _find_project_by_path(db, descriptor["path"])
        meta = {
            "filesystem_path": descriptor["path"],
            "tags": summary.tags,
            "last_scan_time": datetime.utcnow().isoformat(),
            "inferred_properties": {
                "file_count": descriptor["file_count"],
                "total_size": descriptor["total_size"],
                "last_modified": descriptor["last_modified"],
            },
        }

        if project is None:
            project = Project(
                brand_id=brand.id,
                name=summary.name,
                type=summary.type,
                status=summary.status,
                priority="medium",
                meta=meta,
            )
            db.add(project)
            db.commit()
            db.refresh(project)
            updates_applied += 1
            write_audit_log(
                db,
                actor_type="agent",
                actor_id="filesystem_sync_agent",
                action="new_project_detected",
                entity_type="project",
                entity_id=str(project.id),
                details={"path": descriptor["path"], "brand": summary.brand},
            )
            entry = (
                f"- {datetime.utcnow().date()}: New {summary.brand} project '{summary.name}' "
                f"— stage: {summary.status}"
            )
            if _append_project_overview(entry):
                write_audit_log(
                    db,
                    actor_type="agent",
                    actor_id="filesystem_sync_agent",
                    action="memory_updated",
                    entity_type="memory",
                    entity_id="projects_overview",
                    details={"entry": entry},
                )
        else:
            project.type = summary.type
            project.status = summary.status
            project.meta = meta
            db.add(project)
            db.commit()
            db.refresh(project)
            updates_applied += 1
            write_audit_log(
                db,
                actor_type="agent",
                actor_id="filesystem_sync_agent",
                action="project_updated",
                entity_type="project",
                entity_id=str(project.id),
                details={"path": descriptor["path"], "brand": summary.brand},
            )

        for task_payload in result["suggested_db_changes"].get("create_tasks", []):
            _ensure_task(db, project.id, brand.id, task_payload)
        for item_payload in result["suggested_db_changes"].get("create_content_items", []):
            _ensure_content_item(db, brand.id, project, item_payload)

    snapshot = {
        "last_scan": datetime.utcnow().isoformat(),
        "projects": current,
    }
    _save_snapshot(snapshot)

    complete_ai_run(
        db,
        run,
        output_summary=f"projects_scanned={len(current)}, changes={len(changes)}, updates={updates_applied}",
    )

    write_audit_log(
        db,
        actor_type="agent",
        actor_id="filesystem_sync_agent",
        action="filesystem_scan_completed",
        entity_type="system",
        entity_id="filesystem_sync",
        details={
            "projects_scanned": len(current),
            "changes_detected": len(changes),
            "updates_applied": updates_applied,
        },
    )

    return {
        "projects_scanned": len(current),
        "changes_detected": len(changes),
        "updates_applied": updates_applied,
    }
