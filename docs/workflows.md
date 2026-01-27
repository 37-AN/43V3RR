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
