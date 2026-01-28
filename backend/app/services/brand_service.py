from sqlalchemy.orm import Session
from ..models import Brand


def get_brand_by_slug(db: Session, slug: str) -> Brand | None:
    return db.query(Brand).filter(Brand.slug == slug).first()


def ensure_brands(db: Session):
    desired = [
        ("43v3r Technology", "tech"),
        ("43v3r Records", "records"),
    ]
    for name, slug in desired:
        exists = db.query(Brand).filter(Brand.slug == slug).first()
        if not exists:
            db.add(Brand(name=name, slug=slug))
    db.commit()
