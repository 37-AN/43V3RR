import json
from pathlib import Path
from typing import Any, Dict, List

import httpx
from sqlalchemy.orm import Session

from ..config import settings
from ..services.audit_service import write_audit_log
from ..services.ai_run_service import start_ai_run, complete_ai_run


REPO_ROOT = Path(__file__).resolve().parents[2]
WORKFLOWS_DIR = REPO_ROOT / "workflows" / "n8n"


def _load_workflows() -> List[Dict[str, Any]]:
    workflows: List[Dict[str, Any]] = []
    if not WORKFLOWS_DIR.exists():
        return workflows
    for path in WORKFLOWS_DIR.glob("*.json"):
        try:
            data = json.loads(path.read_text(encoding="utf-8"))
            if data.get("name"):
                data["_filename"] = path.name
                workflows.append(data)
        except Exception:
            continue
    return workflows


def sync_n8n_workflows(db: Session) -> Dict[str, Any]:
    if not settings.n8n_url or not settings.n8n_api_key:
        raise RuntimeError("N8N_URL or N8N_API_KEY missing")

    run = start_ai_run(db, agent_name="system", input_summary="sync_n8n_workflows")
    workflows = _load_workflows()
    created = 0
    updated = 0

    headers = {"X-N8N-API-KEY": settings.n8n_api_key}
    base_url = settings.n8n_url.rstrip("/")

    with httpx.Client(timeout=20.0) as client:
        existing = client.get(f"{base_url}/api/v1/workflows", headers=headers)
        existing.raise_for_status()
        existing_by_name = {wf["name"]: wf for wf in existing.json().get("data", [])}

        for workflow in workflows:
            name = workflow["name"]
            payload = {k: v for k, v in workflow.items() if k not in ["id", "_filename"]}
            if name in existing_by_name:
                wf_id = existing_by_name[name]["id"]
                resp = client.put(f"{base_url}/api/v1/workflows/{wf_id}", headers=headers, json=payload)
                resp.raise_for_status()
                updated += 1
                write_audit_log(
                    db,
                    actor_type="system",
                    actor_id="n8n_sync",
                    action="workflow_updated",
                    entity_type="workflow",
                    entity_id=name,
                    details={"id": wf_id, "file": workflow.get("_filename")},
                )
            else:
                resp = client.post(f"{base_url}/api/v1/workflows", headers=headers, json=payload)
                resp.raise_for_status()
                created += 1
                write_audit_log(
                    db,
                    actor_type="system",
                    actor_id="n8n_sync",
                    action="workflow_created",
                    entity_type="workflow",
                    entity_id=name,
                    details={"file": workflow.get("_filename")},
                )

    complete_ai_run(db, run, output_summary=f"created={created} updated={updated}")
    return {"created": created, "updated": updated, "total": len(workflows)}
