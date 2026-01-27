from datetime import datetime, timedelta
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import AuditLog
from ..auth.deps import require_admin

router = APIRouter(prefix="/summary", tags=["summary"])


@router.get("/daily")
def daily(db: Session = Depends(get_db), user=Depends(require_admin)):
    since = datetime.utcnow() - timedelta(days=1)
    logs = (
        db.query(AuditLog)
        .filter(AuditLog.created_at >= since)
        .order_by(AuditLog.created_at.desc())
        .all()
    )
    return {
        "since": since.isoformat(),
        "count": len(logs),
        "recent": [
            {
                "action": log.action,
                "entity_type": log.entity_type,
                "entity_id": log.entity_id,
                "created_at": log.created_at,
            }
            for log in logs[:10]
        ],
    }
