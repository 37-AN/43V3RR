# Ops Playbook

Start system:
- docker-compose up -d --build

Stop system:
- docker-compose down

Check logs:
- docker-compose logs -f backend

Reset DB (dev):
- docker-compose down -v

Add a workflow:
- Create or modify JSON in /workflows/n8n
- Sync via POST /system/sync_n8n_workflows (requires N8N_URL + N8N_API_KEY)

Filesystem sync:
- Manual trigger: POST /system/run_filesystem_sync
- Scheduled: runs every FS_SYNC_INTERVAL_MINUTES (default 15)

Observability endpoints:
- Backend: http://localhost:8000
- Frontend: http://localhost:3000
- n8n: http://localhost:5678
- Prometheus: http://localhost:9090
- Grafana: http://localhost:3001 (admin/admin by default)
