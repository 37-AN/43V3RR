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
- core_orchestrator: enabled skills/plugins from config/ai/skills.yaml and config/ai/plugins.yaml
- tech_ops_agent: enabled skills/plugins that allow tech_ops_agent
- records_ops_agent: enabled skills/plugins that allow records_ops_agent
- content_agent: enabled skills/plugins that allow content_agent
- daily_planner_agent: enabled skills/plugins that allow daily_planner_agent
- revenue_agent: enabled skills/plugins that allow revenue_agent
- system_guardian_agent: enabled skills/plugins that allow system_guardian_agent

Discovery notes:
- Skills are discovered from /agent-skills and /plugins (SKILL.md + zip bundles)
- Plugins are discovered from /plugins (including .mcp.json metadata)
- Disabled skills/plugins still appear in /api/ai/skills and /api/ai/plugins for inspection

Example prompts:
- "Ingest this idea and assign the correct brand"
- "Plan my day using tasks and audit_log"
- "Generate 5 content ideas from today's activity"

Ollama setup (local LLM):
1) Install Ollama locally
2) Pull models: `ollama pull llama3` and `ollama pull codellama`
