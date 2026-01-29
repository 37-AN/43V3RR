# Ops Playbook

Start system:
- docker-compose up -d --build

Stop system:
- docker-compose down

Check logs:
- docker-compose logs -f backend

Reset DB (dev):
- docker-compose down -v

Database (Supabase):
- Set DATABASE_URL to Supabase connection string.
- Run migrations: docker-compose exec backend alembic upgrade head
- Troubleshoot: verify Supabase connection string and network access.
- Local Supabase (CLI): default DB port 54324 (per supabase/config.toml), update SUPABASE_DB_HOST/SUPABASE_DB_PORT accordingly.
- Backend bootstrap: tables are auto-created on startup if missing (idempotent).

Supabase CLI (Docker):
- Run CLI: docker-compose run --rm supabase-cli <command>
- Example login: docker-compose run --rm supabase-cli login
- Example project status: docker-compose run --rm supabase-cli status

Add a workflow:
- Create or modify JSON in /workflows/n8n
- If using n8n API: POST /system/sync_n8n_workflows (requires N8N_URL + N8N_API_KEY)
- If using local n8n UI only: import JSON manually in n8n

Filesystem sync:
- Manual trigger: POST /system/run_filesystem_sync
- Scheduled: runs every FS_SYNC_INTERVAL_MINUTES (default 15)

Seed mock data:
- POST /api/system/seed_mock_data (admin only) to populate dashboards for testing.

Observability endpoints:
- Backend: http://localhost:8000
- Frontend: http://localhost:3000
- n8n: http://localhost:5678
- Prometheus: http://localhost:9090
- Grafana: http://localhost:3001 (admin/admin by default)
- Grafana Postgres datasource uses Supabase-43V3RR (sslmode=disable for local Supabase).

Grafana alerts:
- Alert rules are provisioned from /monitoring/grafana/provisioning/alerting/alerts.yml.
- Configure notification channels in Grafana UI (Email, Slack, etc.) to receive alerts.
