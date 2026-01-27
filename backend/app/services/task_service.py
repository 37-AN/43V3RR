from sqlalchemy.orm import Session
from ..models import Task


def create_task(db: Session, payload: dict) -> Task:
    task = Task(**payload)
    db.add(task)
    db.commit()
    db.refresh(task)
    return task
