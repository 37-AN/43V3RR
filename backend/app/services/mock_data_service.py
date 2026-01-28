from __future__ import annotations

from datetime import datetime, timedelta
import random
from typing import Any

from sqlalchemy.orm import Session

from ..models import Brand, Project, Task, Idea, ContentItem, AIRun, AuditLog
from ..metrics import record_ai_run, record_workflow_event, update_db_gauges


TECH_STAGES = ["idea", "prototype", "wip", "ready_for_demo", "live"]
RECORDS_STAGES = ["idea", "production", "mix", "master", "ready_for_release"]
TASK_STATUSES = ["todo", "in_progress", "blocked", "done"]
CONTENT_STATUSES = ["idea", "planned", "scheduled", "published"]
CONTENT_TYPES = ["reel", "teaser", "post", "short"]

AI_AGENTS = [
    "tech_ops_agent",
    "records_ops_agent",
    "content_agent",
    "daily_planner_agent",
    "revenue_agent",
    "system_guardian_agent",
    "filesystem_sync_agent",
]

WORKFLOWS = [
    "idea_ingestion",
    "filesystem_sync_scheduler",
    "daily_plan_summary",
    "revenue_scan_weekly",
    "system_health_check",
    "records_content_pipeline",
]


def _get_brand(db: Session, slug: str, name: str) -> Brand:
    brand = db.query(Brand).filter(Brand.slug == slug).first()
    if brand:
        return brand
    brand = Brand(name=name, slug=slug)
    db.add(brand)
    db.commit()
    db.refresh(brand)
    return brand


def seed_mock_data(
    db: Session,
    *,
    seed_label: str = "mock",
    projects_per_brand: int = 6,
    tasks_per_project: int = 5,
    ideas_per_brand: int = 3,
    content_items_per_brand: int = 4,
    ai_runs: int = 12,
    workflow_events: int = 8,
    force: bool = False,
) -> dict[str, Any]:
    seed_field = Task.meta["seed"]
    try:
        seed_field = seed_field.as_string()
    except AttributeError:
        seed_field = seed_field
    existing = db.query(Task).filter(seed_field == seed_label).first()
    if existing and not force:
        return {"status": "skipped", "reason": "seed_exists"}

    now = datetime.utcnow()
    tech = _get_brand(db, "tech", "43v3r Technology")
    records = _get_brand(db, "records", "43v3r Records")

    projects: list[Project] = []
    tasks: list[Task] = []
    ideas: list[Idea] = []
    content: list[ContentItem] = []
    runs: list[AIRun] = []
    logs: list[AuditLog] = []

    for idx in range(projects_per_brand):
        stage = random.choice(TECH_STAGES)
        projects.append(
            Project(
                brand_id=tech.id,
                name=f"Mock Tech Project {idx + 1}",
                type="tool",
                stage=stage,
                status="active",
                priority=random.choice(["low", "medium", "high"]),
                meta={"seed": seed_label, "tags": ["automation", "ai"]},
            )
        )
    for idx in range(projects_per_brand):
        stage = random.choice(RECORDS_STAGES)
        meta = {
            "seed": seed_label,
            "bpm": random.choice([90, 120, 128, 140]),
            "genre": random.choice(["hiphop", "house", "trap", "ambient"]),
            "mood": random.choice(["dark", "uplift", "focused", "moody"]),
        }
        if stage == "ready_for_release":
            meta["target_release_date"] = (now + timedelta(days=random.randint(1, 6))).date().isoformat()
        projects.append(
            Project(
                brand_id=records.id,
                name=f"Mock Track {idx + 1}",
                type="song",
                stage=stage,
                status="active",
                priority=random.choice(["low", "medium", "high"]),
                meta=meta,
            )
        )

    db.add_all(projects)
    db.commit()
    for project in projects:
        db.refresh(project)

    for project in projects:
        for idx in range(tasks_per_project):
            status = random.choice(TASK_STATUSES)
            meta = {"seed": seed_label}
            if project.brand_id == tech.id and idx == 0:
                meta["tag"] = "revenue_opportunity"
            tasks.append(
                Task(
                    brand_id=project.brand_id,
                    project_id=project.id,
                    title=f"{project.name} Task {idx + 1}",
                    description="Mock task generated for dashboards",
                    status=status,
                    priority=random.choice(["low", "medium", "high"]),
                    source="mock",
                    created_by="system",
                    assigned_to="human",
                    meta=meta,
                )
            )

    for idx in range(ideas_per_brand):
        ideas.append(
            Idea(
                brand_id=tech.id,
                content=f"Mock tech idea {idx + 1}",
                source="seed",
                status=random.choice(["new", "converted_to_task", "discarded"]),
                meta={"seed": seed_label},
            )
        )
        ideas.append(
            Idea(
                brand_id=records.id,
                content=f"Mock records idea {idx + 1}",
                source="seed",
                status=random.choice(["new", "converted_to_task", "discarded"]),
                meta={"seed": seed_label},
            )
        )

    for idx in range(content_items_per_brand):
        scheduled_at = now + timedelta(days=random.randint(0, 7))
        content.append(
            ContentItem(
                brand_id=tech.id,
                title=f"Mock Tech Content {idx + 1}",
                type=random.choice(CONTENT_TYPES),
                status=random.choice(CONTENT_STATUSES),
                source="mock",
                scheduled_at=scheduled_at,
                meta={"seed": seed_label},
            )
        )
        content.append(
            ContentItem(
                brand_id=records.id,
                title=f"Mock Records Content {idx + 1}",
                type=random.choice(CONTENT_TYPES),
                status=random.choice(CONTENT_STATUSES),
                source="mock",
                scheduled_at=scheduled_at,
                meta={"seed": seed_label},
            )
        )

    for idx in range(ai_runs):
        agent = random.choice(AI_AGENTS)
        success = random.choice([True, True, True, False])
        start = now - timedelta(minutes=random.randint(5, 1440))
        duration = random.uniform(0.2, 6.0)
        runs.append(
            AIRun(
                agent_name=agent,
                input_summary="Mock input",
                output_summary="Mock output",
                success=success,
                error_message=None if success else "Mock failure",
                started_at=start,
                completed_at=start + timedelta(seconds=duration),
                meta={"seed": seed_label},
            )
        )
        record_ai_run(agent, "success" if success else "error", duration)

    for idx in range(workflow_events):
        workflow = random.choice(WORKFLOWS)
        success = random.choice([True, True, False])
        record_workflow_event(workflow, "seed", success)
        logs.append(
            AuditLog(
                actor_type="workflow",
                actor_id=workflow,
                action="run" if success else "error",
                entity_type="workflow",
                entity_id=workflow,
                details={"seed": seed_label},
            )
        )

    db.add_all(tasks)
    db.add_all(ideas)
    db.add_all(content)
    db.add_all(runs)
    db.add_all(logs)
    db.commit()

    update_db_gauges(db)

    return {
        "status": "ok",
        "projects": len(projects),
        "tasks": len(tasks),
        "ideas": len(ideas),
        "content_items": len(content),
        "ai_runs": len(runs),
        "workflow_events": len(logs),
    }
