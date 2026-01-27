# 43v3r Local AI OS

Local-first AI operating system for a solo founder running two brands: **43v3r Technology** and **43v3r Records**. This repo is a single monorepo that prioritizes AI infrastructure, agent workflows, and logging before product features.

## Tech stack
- Backend API: Python + FastAPI
- Frontend dashboard: TypeScript + Next.js
- Database: Postgres (docker-compose)
- Vector DB: Qdrant (docker-compose)
- Orchestration: n8n (docker-compose)
- Local LLM: Ollama
- Agent framework: LangChain/LangGraph (stubbed for now)

## High-level architecture
- **Frontend** calls **Backend API**.
- **Backend** writes to **Postgres** and **audit_log**, triggers **n8n** workflows, and records **ai_runs**.
- **Ollama** provides local model inference (wired via config; rule-based fallback in code).
- **Qdrant** reserved for future embeddings and memory indexing.

See `docs/architecture.md` for details.

## Quick start
1) Copy env vars
```
cp .env.example .env
```

2) Start services
```
docker-compose up -d --build
```

3) Run DB migrations (first time)
```
docker-compose exec backend alembic upgrade head
```

4) Open apps
- Backend: http://localhost:8000
- Frontend: http://localhost:3000
- n8n: http://localhost:5678

Default dev login:
- username: admin
- password: admin

## Assumptions
- This is a local-first system; all integrations are optional and pluggable.
- LLM calls are stubbed to keep the system runnable offline. Replace the stub with Ollama-backed calls when ready.

## Tests
Backend:
```
docker-compose exec backend pytest
```
Frontend:
```
docker-compose exec frontend npm test
```

## Next steps
- Replace rule-based orchestrator with Ollama + LangGraph.
- Add embedding pipelines to Qdrant for semantic search.
- Extend workflows in n8n.
