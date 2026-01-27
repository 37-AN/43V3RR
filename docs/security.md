# Security Baseline

- No secrets committed to repo
- CORS restricted to FRONTEND_URL
- JWT-based auth with roles (admin, viewer)
- Pydantic validation on inputs
- File operations constrained to repo root in file_manager_skill
