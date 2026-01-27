from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from ..database import get_db
from ..auth.deps import require_admin
from ..services.filesystem_sync import run_filesystem_sync

router = APIRouter(prefix="/system", tags=["system"])


@router.post("/run_filesystem_sync")
def run_sync(db: Session = Depends(get_db), user=Depends(require_admin)):
    return run_filesystem_sync(db)
