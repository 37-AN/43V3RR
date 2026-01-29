# Monitoring Overview

- Prometheus scrapes backend (/metrics) and node-exporter (n8n metrics optional)
- Grafana dashboards: 43v3r Technology Ops, 43v3r Records Ops, System Health
- Grafana datasource: Supabase-43V3RR (Postgres), sslmode=disable for local Supabase
- Workflow metrics: workflows_triggered_total and workflows_failed_total via /system/workflow_event
- AI run metrics: ai_runs_total and ai_run_duration_seconds via ai_runs service
