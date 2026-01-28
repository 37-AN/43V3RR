from sqlalchemy.orm import Session
from datetime import datetime
from ..models import AIRun
from ..metrics import record_ai_run


def start_ai_run(db: Session, agent_name: str, input_summary: str, metadata: dict | None = None) -> AIRun:
    run = AIRun(
        agent_name=agent_name,
        input_summary=input_summary,
        success=True,
        started_at=datetime.utcnow(),
        meta=metadata or {},
    )
    db.add(run)
    db.commit()
    db.refresh(run)
    return run


def complete_ai_run(
    db: Session, run: AIRun, output_summary: str, success: bool = True, error_message: str | None = None
) -> AIRun:
    run.output_summary = output_summary
    run.success = success
    run.error_message = error_message
    run.completed_at = datetime.utcnow()
    db.add(run)
    db.commit()
    db.refresh(run)
    duration = None
    if run.started_at and run.completed_at:
        duration = (run.completed_at - run.started_at).total_seconds()
    record_ai_run(run.agent_name, "success" if success else "error", duration)
    return run
