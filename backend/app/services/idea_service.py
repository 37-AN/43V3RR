from sqlalchemy.orm import Session
from ..models import Idea


def create_idea(db: Session, payload: dict) -> Idea:
    idea = Idea(**payload)
    db.add(idea)
    db.commit()
    db.refresh(idea)
    return idea
