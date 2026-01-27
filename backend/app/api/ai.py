from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from ..database import get_db
from ..services.audit_service import write_audit_log
from ..auth.deps import require_admin
from ..models import AIRun
from ..ai.skill_registry import list_skills
from ..ai.plugin_registry import list_plugins

router = APIRouter(prefix="/ai", tags=["ai"])


@router.get("/runs")
def list_ai_runs(db: Session = Depends(get_db), user=Depends(require_admin)):
    return db.query(AIRun).order_by(AIRun.created_at.desc()).limit(50).all()


@router.post("/daily-summary")
def daily_summary(db: Session = Depends(get_db), user=Depends(require_admin)):
    write_audit_log(
        db,
        actor_type="human",
        actor_id=user.get("username"),
        action="daily_summary_requested",
        entity_type="ai",
        entity_id="summary",
        details={},
    )
    return {"status": "queued", "note": "Use content_agent in future. Stubbed for now."}


@router.get("/skills")
def get_skills(user=Depends(require_admin)):
    return list_skills()


@router.get("/plugins")
def get_plugins(user=Depends(require_admin)):
    return list_plugins()
