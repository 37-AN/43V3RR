# AI Agents

## Core Orchestrator
- Routes instructions to specialized agents
- Logs all decisions to ai_runs + audit_log

## Tech Ops Agent
- Creates projects/tasks for 43v3r Technology
- Proposes stack choices and dev plans

## Records Ops Agent
- Creates music projects
- Tags track metadata and proposes release plans

## Content Agent
- Generates content ideas and drafts

## Filesystem Sync Agent
- Scans /projects for tech and records work
- Infers metadata and updates projects/tasks/content_items

Tool wiring (default):
- core_orchestrator: enabled skills/plugins from config
- tech_ops_agent: vercel-react-best-practices, web-design-guidelines
- content_agent: web-design-guidelines

Example prompts:
- "Ingest this idea and assign the correct brand"
- "Plan my day using tasks and audit_log"
- "Generate 5 content ideas from today's activity"

Ollama setup (local LLM):
1) Install Ollama locally
2) Pull models: `ollama pull llama3` and `ollama pull codellama`
