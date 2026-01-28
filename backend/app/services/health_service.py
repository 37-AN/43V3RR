from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import text

from ..models import AIRun, AuditLog


def evaluate_system_health(db: Session) -> dict:
    details: dict = {}
    status = "green"

    # DB connectivity
    try:
        db.execute(text("SELECT 1"))
    except Exception as exc:
        return {
            "status": "red",
            "details": {"db": "unavailable", "error": str(exc)},
            "timestamp": datetime.utcnow().isoformat(),
        }

    window = datetime.utcnow() - timedelta(hours=1)
    ai_errors = (
        db.query(AIRun)
        .filter(AIRun.created_at >= window)
        .filter(AIRun.success == False)  # noqa: E712
        .count()
    )
    workflow_failures = (
        db.query(AuditLog)
        .filter(AuditLog.actor_type == "workflow")
        .filter(AuditLog.created_at >= window)
        .filter(AuditLog.action == "error")
        .count()
    )
    details["ai_errors_last_hour"] = ai_errors
    details["workflow_failures_last_hour"] = workflow_failures

    if ai_errors > 20 or workflow_failures > 5:
        status = "red"
    elif ai_errors > 5 or workflow_failures > 0:
        status = "yellow"

    return {
        "status": status,
        "details": details,
        "timestamp": datetime.utcnow().isoformat(),
    }
