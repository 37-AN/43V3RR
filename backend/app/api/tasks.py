from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from ..database import get_db
from ..schemas.task import TaskCreate, TaskRead
from ..services.task_service import create_task
from ..services.audit_service import write_audit_log
from ..auth.deps import require_admin
from ..models import Task

router = APIRouter(prefix="/tasks", tags=["tasks"])


@router.post("/", response_model=TaskRead)
def create(payload: TaskCreate, db: Session = Depends(get_db), user=Depends(require_admin)):
    task = create_task(db, payload.model_dump())
    write_audit_log(
        db,
        actor_type="human",
        actor_id=user.get("username"),
        action="task_created",
        entity_type="task",
        entity_id=str(task.id),
        details={"brand_id": task.brand_id, "status": task.status},
    )
    return task


@router.get("/", response_model=list[TaskRead])
def list_tasks(db: Session = Depends(get_db), user=Depends(require_admin)):
    return db.query(Task).all()
