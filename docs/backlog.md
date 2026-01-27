# Backlog

Updated: 2026-01-27

## P0 — System-building (Tech)
- Outcome: Replace rule-based orchestrator with Ollama + LangGraph routing.
  - Step 1: Add Ollama client wrapper with timeout + model selection
  - Step 2: Implement LangGraph router with brand + item_type + priority outputs
  - Step 3: Add fallback rules when Ollama unavailable
  - Step 4: Persist ai_runs + audit_log with decision metadata

- Outcome: Implement n8n workflow JSONs for logging + idea ingestion callbacks.
  - Step 1: Create webhook trigger flow for task status updates
  - Step 2: Create webhook trigger flow for idea ingestion
  - Step 3: Add HTTP response nodes + basic validation

## P1 — Automation (Tech)
- Outcome: Daily summary agent uses audit_log to draft posts.
  - Step 1: Add content_agent stub endpoint for daily summary
  - Step 2: Store drafts in content_items

## P1 — Content pipeline (Records)
- Outcome: Create music release template and content plan generator.
  - Step 1: Add schema for track metadata in content_items metadata
  - Step 2: Add records_ops_agent stubs for release plan

## P2 — UX
- Outcome: Add minimal auth guard and token persistence.
  - Step 1: Add login page and protect routes

## P2 — Observability
- Outcome: Add request/agent correlation IDs into audit_log.
  - Step 1: Store correlation_id on audit_log details
