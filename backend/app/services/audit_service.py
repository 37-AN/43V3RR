from sqlalchemy.orm import Session
from ..models import AuditLog


def write_audit_log(
    db: Session,
    actor_type: str,
    action: str,
    entity_type: str,
    entity_id: str,
    details: dict,
    actor_id: str | None = None,
):
    entry = AuditLog(
        actor_type=actor_type,
        actor_id=actor_id,
        action=action,
        entity_type=entity_type,
        entity_id=str(entity_id),
        details=details,
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return entry
