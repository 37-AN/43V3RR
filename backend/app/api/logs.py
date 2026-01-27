from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from ..database import get_db
from ..schemas.audit_log import AuditLogRead
from ..models import AuditLog
from ..auth.deps import require_admin

router = APIRouter(prefix="/logs", tags=["logs"])


@router.get("/", response_model=list[AuditLogRead])
def list_logs(db: Session = Depends(get_db), user=Depends(require_admin)):
    return db.query(AuditLog).order_by(AuditLog.created_at.desc()).limit(100).all()
