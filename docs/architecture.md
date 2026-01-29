# Architecture

Components:
- Backend (FastAPI): API, AI orchestration, logging
- Frontend (Next.js): dashboards for tasks, ideas, logs, AI runs
- Supabase Postgres: source of truth for tasks, ideas, logs (managed externally)
- Qdrant: vector database placeholder
- n8n: workflow automation
- Ollama: local LLM runtime
- Prometheus: metrics collection (/metrics, exporters)
- Grafana: dashboards for tech/records/system health

Flow:
1. Frontend or API client posts an idea.
2. Core orchestrator decides brand and priority.
3. Backend writes idea + audit_log.
4. Optional n8n workflows can react to changes.
5. Prometheus scrapes backend and exporters; Grafana visualizes brand/system metrics.
6. Database monitoring is handled via Supabase-managed tooling (no local Postgres exporter).

Dashboards:
- 43v3r Technology Ops (UID: 43v3r-tech-ops)
- 43v3r Records Ops (UID: 063c65ff-2e90-401f-9ebe-651dca4d4d69)
- 43v3r System Health (UID: 43v3r-system-health)

Supabase bootstrap:
- Backend runs an idempotent schema bootstrap on startup to ensure required tables exist.
- Alembic migrations remain available for explicit schema upgrades.

Filesystem sync:
- Background scanner reads /projects/tech and /projects/records.
- Sync agent infers metadata and updates projects/tasks/content_items.
