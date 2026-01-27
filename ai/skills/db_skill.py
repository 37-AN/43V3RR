from typing import Any, Dict
import sys
from pathlib import Path
from sqlalchemy.orm import Session

REPO_ROOT = Path(__file__).resolve().parents[2]
if str(REPO_ROOT) not in sys.path:
    sys.path.append(str(REPO_ROOT))

from backend.app.models import Task, Project, Idea, ContentItem, AIRun, AuditLog


def create_task(db: Session, payload: Dict[str, Any]) -> Task:
    task = Task(**payload)
    db.add(task)
    db.commit()
    db.refresh(task)
    return task


def create_project(db: Session, payload: Dict[str, Any]) -> Project:
    project = Project(**payload)
    db.add(project)
    db.commit()
    db.refresh(project)
    return project


def create_idea(db: Session, payload: Dict[str, Any]) -> Idea:
    idea = Idea(**payload)
    db.add(idea)
    db.commit()
    db.refresh(idea)
    return idea


def create_content_item(db: Session, payload: Dict[str, Any]) -> ContentItem:
    item = ContentItem(**payload)
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


def create_ai_run(db: Session, payload: Dict[str, Any]) -> AIRun:
    run = AIRun(**payload)
    db.add(run)
    db.commit()
    db.refresh(run)
    return run


def create_audit_log(db: Session, payload: Dict[str, Any]) -> AuditLog:
    entry = AuditLog(**payload)
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return entry
