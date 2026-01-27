# Monitoring Overview

- Prometheus scrapes backend (/metrics), node-exporter, postgres-exporter, and n8n metrics
- Grafana dashboards: 43v3r Technology Ops, 43v3r Records Ops, System Health
- Workflow metrics: workflows_triggered_total and workflows_failed_total via /system/workflow_event
- AI run metrics: ai_runs_total and ai_run_duration_seconds via ai_runs service
