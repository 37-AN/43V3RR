from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from ..database import get_db
from ..schemas.idea import IdeaIngest, IdeaRead
from ..models import Idea
from ..services.idea_service import create_idea
from ..services.brand_service import get_brand_by_slug
from ..services.audit_service import write_audit_log
from ..ai.orchestrator import ingest_idea
from ..auth.deps import require_admin

router = APIRouter(prefix="/ideas", tags=["ideas"])


@router.post("/", response_model=IdeaRead)
def ingest(payload: IdeaIngest, db: Session = Depends(get_db), user=Depends(require_admin)):
    decision = ingest_idea(db, payload.content, payload.source)
    brand = get_brand_by_slug(db, decision.brand_slug)
    idea = create_idea(
        db,
        {
            "brand_id": brand.id,
            "content": payload.content,
            "source": payload.source,
            "status": "new",
        },
    )
    write_audit_log(
        db,
        actor_type="human",
        actor_id=user.get("username"),
        action="idea_ingested",
        entity_type="idea",
        entity_id=str(idea.id),
        details={"brand_id": brand.id, "source": payload.source},
    )
    return idea


@router.get("/", response_model=list[IdeaRead])
def list_ideas(db: Session = Depends(get_db), user=Depends(require_admin)):
    return db.query(Idea).all()
