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
- Create or modify JSON in /workflows/n8n and import into n8n UI

Filesystem sync:
- Manual trigger: POST /system/run_filesystem_sync
- Scheduled: runs every FS_SYNC_INTERVAL_MINUTES (default 15)
