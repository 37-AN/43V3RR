from fastapi import APIRouter, Depends, HTTPException, status
from datetime import datetime, timedelta
from pydantic import BaseModel
from sqlalchemy.orm import Session
from ..database import get_db
from ..auth.deps import require_admin
from ..services.filesystem_sync import run_filesystem_sync
from ..services.n8n_sync import sync_n8n_workflows
from ..services.audit_service import write_audit_log
from ..metrics import record_workflow_event
from ..models import AIRun, AuditLog
from ..services.summary_service import brand_summary
from ..services.mock_data_service import seed_mock_data

router = APIRouter(prefix="/system", tags=["system"])


class WorkflowEvent(BaseModel):
    workflow_name: str
    status: str
    source: str = "n8n"
    payload: dict = {}


class MockSeedRequest(BaseModel):
    seed_label: str = "mock"
    projects_per_brand: int = 6
    tasks_per_project: int = 5
    ideas_per_brand: int = 3
    content_items_per_brand: int = 4
    ai_runs: int = 12
    workflow_events: int = 8
    force: bool = False


@router.post("/run_filesystem_sync")
def run_sync(db: Session = Depends(get_db), user=Depends(require_admin)):
    return run_filesystem_sync(db)


@router.post("/sync_n8n_workflows")
def sync_workflows(db: Session = Depends(get_db), user=Depends(require_admin)):
    result = sync_n8n_workflows(db)
    if result.get("status") == "skipped":
        write_audit_log(
            db,
            actor_type="system",
            actor_id="n8n_sync",
            action="workflow_sync_skipped",
            entity_type="workflow",
            entity_id="all",
            details=result,
        )
        raise HTTPException(status_code=status.HTTP_204_NO_CONTENT, detail="n8n api disabled")
    return result


@router.post("/workflow_event")
def workflow_event(event: WorkflowEvent, db: Session = Depends(get_db)):
    success = event.status.lower() == "success"
    record_workflow_event(event.workflow_name, event.source, success)
    write_audit_log(
        db,
        actor_type="workflow",
        actor_id=event.workflow_name,
        action="run" if success else "error",
        entity_type="workflow",
        entity_id=event.workflow_name,
        details=event.payload,
    )
    return {"status": "ok"}


@router.get("/observability_summary")
def observability_summary(db: Session = Depends(get_db), user=Depends(require_admin)):
    since = datetime.utcnow() - timedelta(days=1)
    ai_runs = (
        db.query(AIRun.agent_name, AIRun.success)
        .filter(AIRun.created_at >= since)
        .all()
    )
    ai_counts: dict[str, dict[str, int]] = {}
    for agent, success in ai_runs:
        entry = ai_counts.setdefault(agent, {"success": 0, "failure": 0})
        key = "success" if success else "failure"
        entry[key] += 1

    workflow_logs = (
        db.query(AuditLog.actor_id)
        .filter(AuditLog.actor_type == "workflow")
        .filter(AuditLog.created_at >= since)
        .all()
    )
    workflow_counts: dict[str, int] = {}
    for (workflow,) in workflow_logs:
        workflow_counts[workflow] = workflow_counts.get(workflow, 0) + 1

    return {
        "since": since.isoformat(),
        "ai_runs": ai_counts,
        "workflows": workflow_counts,
    }


@router.get("/brand_summary")
def get_brand_summary(db: Session = Depends(get_db), user=Depends(require_admin)):
    return brand_summary(db)


@router.post("/seed_mock_data")
def seed_mock(payload: MockSeedRequest, db: Session = Depends(get_db), user=Depends(require_admin)):
    return seed_mock_data(db, **payload.model_dump())
