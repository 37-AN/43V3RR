# Workflows Index

- idea_ingestion: API -> orchestrator -> DB -> audit_log
- daily_summary: audit_log -> summary endpoint
- filesystem_sync: periodic scan + manual trigger to sync /projects
- tools_registry: discover skills/plugins from /agent-skills and /plugins, gated by config/ai/*.yaml, exposed via /ai/skills and /ai/plugins
- observability: Prometheus metrics + Grafana dashboards with system/brand views
- n8n_automations: idea_ingestion, filesystem_sync_scheduler, daily_plan_summary, revenue_scan_weekly, system_health_check, records_content_pipeline
