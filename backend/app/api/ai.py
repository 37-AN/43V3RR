from fastapi import APIRouter, Depends
from datetime import datetime
from sqlalchemy.orm import Session
from ..database import get_db
from ..services.audit_service import write_audit_log
from ..auth.deps import require_admin
from ..models import AIRun
from ..ai.skill_registry import list_skills
from ..ai.plugin_registry import list_plugins
from ..services.ai_run_service import start_ai_run, complete_ai_run
from ..metrics import SYSTEM_HEALTH_STATUS

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


@router.post("/daily_plan")
def daily_plan(db: Session = Depends(get_db), user=Depends(require_admin)):
    run = start_ai_run(db, agent_name="daily_planner_agent", input_summary="daily_plan")
    result = {"date": datetime.utcnow().date().isoformat(), "status": "stub", "plan": []}
    complete_ai_run(db, run, output_summary="daily_plan_stub")
    write_audit_log(
        db,
        actor_type="agent",
        actor_id="daily_planner_agent",
        action="daily_plan_created",
        entity_type="plan",
        entity_id=result["date"],
        details={"items": 0},
    )
    return result


@router.post("/revenue_scan")
def revenue_scan(db: Session = Depends(get_db), user=Depends(require_admin)):
    run = start_ai_run(db, agent_name="revenue_agent", input_summary="revenue_scan")
    result = {"status": "stub", "opportunities": []}
    complete_ai_run(db, run, output_summary="revenue_scan_stub")
    write_audit_log(
        db,
        actor_type="agent",
        actor_id="revenue_agent",
        action="revenue_scan",
        entity_type="report",
        entity_id="weekly",
        details={"opportunities": 0},
    )
    return result


@router.post("/system_health")
def system_health(db: Session = Depends(get_db), user=Depends(require_admin)):
    run = start_ai_run(db, agent_name="system_guardian_agent", input_summary="system_health")
    result = {"status": "green", "timestamp": datetime.utcnow().isoformat()}
    complete_ai_run(db, run, output_summary="system_health_stub")
    SYSTEM_HEALTH_STATUS.labels(scope="global").set(0)
    write_audit_log(
        db,
        actor_type="agent",
        actor_id="system_guardian_agent",
        action="system_health_check",
        entity_type="system",
        entity_id="health",
        details=result,
    )
    return result
