from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from .config import settings


def _normalize_db_url(url: str) -> str:
    if url.startswith("postgres://"):
        return "postgresql://" + url[len("postgres://") :]
    return url


DATABASE_URL = _normalize_db_url(settings.database_url)
if settings.test_database_url:
    DATABASE_URL = _normalize_db_url(settings.test_database_url)

engine = create_engine(DATABASE_URL, pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
