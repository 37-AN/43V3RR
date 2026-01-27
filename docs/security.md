# Security Baseline

- No secrets committed to repo
- CORS restricted to FRONTEND_URL
- JWT-based auth with roles (admin, viewer)
- Pydantic validation on inputs
- File operations constrained to repo root in file_manager_skill

Skills & plugins safety:
- Skills/plugins are discovered from /agent-skills and /plugins
- Only enabled entries in config/ai/skills.yaml and config/ai/plugins.yaml are exposed
- External-network plugins are disabled by default
- Inputs are redacted for tokens/secrets in logs
