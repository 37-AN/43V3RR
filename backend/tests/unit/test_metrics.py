from app.metrics import render_metrics, record_request, record_workflow_event
from app.services.n8n_sync import _load_workflows


def test_metrics_render_contains_api_metrics():
    record_request("GET", "/health", 200, 0.01)
    payload = render_metrics()
    assert b"http_requests_total" in payload


def test_metrics_render_contains_workflow_metrics():
    record_workflow_event("system_health_check", "n8n", True)
    payload = render_metrics()
    assert b"workflows_triggered_total" in payload


def test_n8n_workflows_loaded():
    workflows = _load_workflows()
    assert any(wf.get("name") == "idea_ingestion" for wf in workflows)


def test_n8n_sync_requires_env(monkeypatch):
    from app.services import n8n_sync
    monkeypatch.setattr(n8n_sync.settings, "n8n_url", None)
    monkeypatch.setattr(n8n_sync.settings, "n8n_api_key", None)
    result = n8n_sync.sync_n8n_workflows(None)
    assert result["status"] == "skipped"
