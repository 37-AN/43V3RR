from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import text
from ..database import get_db
from ..logging.json_logger import get_logger

router = APIRouter(prefix="/health", tags=["health"])
logger = get_logger("health")


@router.get("/db")
def db_health(db: Session = Depends(get_db)):
    try:
        db.execute(text("SELECT 1"))
        return {"status": "ok"}
    except Exception as exc:
        logger.info("db_health_failed", extra={"extra": {"error": str(exc)}})
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="db_unavailable")
