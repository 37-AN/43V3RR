from sqlalchemy.orm import Session

from ..models import Brand, Task, Project, ContentItem


def brand_summary(db: Session) -> dict:
    summary: dict[str, dict] = {}
    brands = db.query(Brand).all()
    for brand in brands:
        tasks = db.query(Task.status).filter(Task.brand_id == brand.id).all()
        task_counts: dict[str, int] = {}
        for (status,) in tasks:
            task_counts[status] = task_counts.get(status, 0) + 1
        projects = db.query(Project.stage).filter(Project.brand_id == brand.id).all()
        project_counts: dict[str, int] = {}
        for (stage,) in projects:
            label = stage or "unknown"
            project_counts[label] = project_counts.get(label, 0) + 1
        content = db.query(ContentItem.status).filter(ContentItem.brand_id == brand.id).all()
        content_counts: dict[str, int] = {}
        for (status,) in content:
            content_counts[status] = content_counts.get(status, 0) + 1

        summary[brand.slug] = {
            "tasks_by_status": task_counts,
            "projects_by_stage": project_counts,
            "content_by_status": content_counts,
            "tasks_open": sum(task_counts.values()),
        }
    return summary
