from sqlalchemy.orm import Session
from datetime import datetime
from ..models import AIRun


def start_ai_run(db: Session, agent_name: str, input_summary: str, metadata: dict | None = None) -> AIRun:
    run = AIRun(
        agent_name=agent_name,
        input_summary=input_summary,
        success=True,
        started_at=datetime.utcnow(),
        metadata=metadata or {},
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
    return run
