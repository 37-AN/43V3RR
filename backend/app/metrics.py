from __future__ import annotations

from typing import Optional

from prometheus_client import Counter, Gauge, Histogram, generate_latest, CONTENT_TYPE_LATEST
from sqlalchemy.orm import Session

from .models import Task, Project, Brand, ContentItem

HTTP_REQUESTS_TOTAL = Counter(
    "http_requests_total",
    "Total HTTP requests",
    ["method", "path", "status_code"],
)
HTTP_REQUEST_DURATION = Histogram(
    "http_request_duration_seconds",
    "HTTP request latency",
    ["method", "path"],
)

AI_RUNS_TOTAL = Counter(
    "ai_runs_total",
    "AI runs by agent and status",
    ["agent", "status"],
)
AI_RUN_DURATION = Histogram(
    "ai_run_duration_seconds",
    "AI run duration by agent",
    ["agent"],
)

WORKFLOWS_TRIGGERED_TOTAL = Counter(
    "workflows_triggered_total",
    "Workflow runs by workflow name",
    ["workflow_name", "source"],
)
WORKFLOWS_FAILED_TOTAL = Counter(
    "workflows_failed_total",
    "Workflow failures by workflow name",
    ["workflow_name"],
)

TASKS_OPEN_BY_BRAND = Gauge(
    "tasks_open_by_brand",
    "Open tasks by brand and status",
    ["brand", "status"],
)
PROJECTS_BY_BRAND_AND_STAGE = Gauge(
    "projects_by_brand_and_stage",
    "Projects by brand and stage",
    ["brand", "stage"],
)
CONTENT_ITEMS_BY_BRAND_AND_STATUS = Gauge(
    "content_items_by_brand_and_status",
    "Content items by brand and status",
    ["brand", "status"],
)

SYSTEM_HEALTH_STATUS = Gauge(
    "system_health_status",
    "System health status (0=green,1=yellow,2=red)",
    ["scope"],
)


def record_request(method: str, path: str, status_code: int, duration_seconds: float) -> None:
    HTTP_REQUESTS_TOTAL.labels(method=method, path=path, status_code=str(status_code)).inc()
    HTTP_REQUEST_DURATION.labels(method=method, path=path).observe(duration_seconds)


def record_ai_run(agent: str, status: str, duration_seconds: Optional[float]) -> None:
    AI_RUNS_TOTAL.labels(agent=agent, status=status).inc()
    if duration_seconds is not None:
        AI_RUN_DURATION.labels(agent=agent).observe(duration_seconds)


def record_workflow_event(workflow_name: str, source: str, success: bool) -> None:
    WORKFLOWS_TRIGGERED_TOTAL.labels(workflow_name=workflow_name, source=source).inc()
    if not success:
        WORKFLOWS_FAILED_TOTAL.labels(workflow_name=workflow_name).inc()


def update_db_gauges(db: Session) -> None:
    brands = db.query(Brand).all()
    for brand in brands:
        tasks = (
            db.query(Task.status)
            .filter(Task.brand_id == brand.id)
            .all()
        )
        counts: dict[str, int] = {}
        for (status,) in tasks:
            counts[status] = counts.get(status, 0) + 1
        total = sum(counts.values())
        TASKS_OPEN_BY_BRAND.labels(brand=brand.slug, status="all").set(total)
        for status, count in counts.items():
            TASKS_OPEN_BY_BRAND.labels(brand=brand.slug, status=status).set(count)

        projects = (
            db.query(Project.stage)
            .filter(Project.brand_id == brand.id)
            .all()
        )
        project_counts: dict[str, int] = {}
        for (stage,) in projects:
            label = stage or "unknown"
            project_counts[label] = project_counts.get(label, 0) + 1
        for stage, count in project_counts.items():
            PROJECTS_BY_BRAND_AND_STAGE.labels(brand=brand.slug, stage=stage).set(count)

    content_rows = (
        db.query(Brand.slug, ContentItem.status)
        .join(ContentItem, ContentItem.brand_id == Brand.id)
        .all()
    )
    content_counts: dict[tuple[str, str], int] = {}
    for brand_slug, status in content_rows:
        key = (brand_slug, status)
        content_counts[key] = content_counts.get(key, 0) + 1
    for (brand_slug, status), count in content_counts.items():
        CONTENT_ITEMS_BY_BRAND_AND_STATUS.labels(brand=brand_slug, status=status).set(count)


def render_metrics(db: Optional[Session] = None) -> bytes:
    if db is not None:
        update_db_gauges(db)
    return generate_latest()


METRICS_CONTENT_TYPE = CONTENT_TYPE_LATEST
