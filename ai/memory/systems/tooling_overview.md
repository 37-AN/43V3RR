# Tooling Overview

- Skills discovery: /agent-skills and /plugins (SKILL.md + zip bundles), gated by config/ai/skills.yaml
- Plugin discovery: /plugins (internal + external, .mcp.json metadata), gated by config/ai/plugins.yaml
- API inspection: GET /ai/skills and GET /ai/plugins (admin only)
- Logging: skill_call/plugin_call recorded in ai_runs + audit_log, plus JSONL activity log
- Safety: external plugins disabled by default; required env vars validated for plugin calls
