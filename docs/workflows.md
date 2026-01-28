# Workflows

## Idea Ingestion
- Trigger: POST /ideas
- Inputs: content, source
- Outputs: idea record + audit_log
- Logs: audit_log, ai_runs

## Daily Summary
- Trigger: GET /summary/daily
- Outputs: daily log summary

n8n:
- Import JSON flows from /workflows/n8n
- Extend with webhooks for notifications or publishing

Filesystem sync:
- Trigger: Scheduled background job + POST /system/run_filesystem_sync
- Inputs: /projects/tech and /projects/records folders
- Outputs: projects/tasks/content_items updates + audit_log

n8n flows (auto-sync):
- idea_ingestion: webhook -> workflow_event log
- filesystem_sync_scheduler: cron -> /system/run_filesystem_sync
- daily_plan_summary: cron -> /ai/daily_plan
- revenue_scan_weekly: cron -> /ai/revenue_scan
- system_health_check: cron -> /ai/system_health
- records_content_pipeline: webhook -> create tasks + workflow_event log

API paths:
- Sync/workflow events are available under /api/system as well as /system.
- AI triggers are available under /api/ai as well as /ai.
