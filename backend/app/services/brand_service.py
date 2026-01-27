from sqlalchemy.orm import Session
from ..models import Brand


def get_brand_by_slug(db: Session, slug: str) -> Brand | None:
    return db.query(Brand).filter(Brand.slug == slug).first()


def ensure_brands(db: Session):
    existing = db.query(Brand).count()
    if existing:
        return
    brands = [
        Brand(name="43v3r Technology", slug="43v3r_technology"),
        Brand(name="43v3r Records", slug="43v3r_records"),
    ]
    db.add_all(brands)
    db.commit()
