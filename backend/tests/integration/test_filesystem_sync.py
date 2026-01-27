from pathlib import Path
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.database import Base
from app.services.brand_service import ensure_brands
from app.services.filesystem_sync import run_filesystem_sync
from app.models import Project
import app.services.filesystem_sync as fs


def _setup_db():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(bind=engine)
    SessionLocal = sessionmaker(bind=engine)
    db = SessionLocal()
    ensure_brands(db)
    return db


def test_new_tech_project_creates_project(tmp_path: Path):
    root = tmp_path / "projects"
    tech = root / "tech" / "demo_app"
    tech.mkdir(parents=True)
    (tech / "README.md").write_text("Demo", encoding="utf-8")
    (tech / "main.py").write_text("print('hi')", encoding="utf-8")
    (tech / "tests").mkdir()
    (tech / "tests" / "test_basic.py").write_text("def test_ok():\n    assert True\n", encoding="utf-8")

    fs.ALLOWED_ROOT = root.resolve()
    fs.SNAPSHOT_PATH = tmp_path / "snapshot.json"

    db = _setup_db()
    result = run_filesystem_sync(db, root_override=str(root))

    assert result["projects_scanned"] == 1
    projects = db.query(Project).all()
    assert len(projects) == 1
    assert projects[0].status == "ready_for_demo"


def test_new_records_project_detects_release(tmp_path: Path):
    root = tmp_path / "projects"
    records = root / "records" / "night_drive"
    records.mkdir(parents=True)
    (records / "night_drive_master.wav").write_text("x", encoding="utf-8")

    fs.ALLOWED_ROOT = root.resolve()
    fs.SNAPSHOT_PATH = tmp_path / "snapshot.json"

    db = _setup_db()
    result = run_filesystem_sync(db, root_override=str(root))

    assert result["projects_scanned"] == 1
    projects = db.query(Project).all()
    assert len(projects) == 1
    assert projects[0].status == "ready_for_release"
