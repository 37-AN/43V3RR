# Architecture

Components:
- Backend (FastAPI): API, AI orchestration, logging
- Frontend (Next.js): dashboards for tasks, ideas, logs, AI runs
- Postgres: source of truth for tasks, ideas, logs
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

Filesystem sync:
- Background scanner reads /projects/tech and /projects/records.
- Sync agent infers metadata and updates projects/tasks/content_items.
