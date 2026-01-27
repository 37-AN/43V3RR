# Testing Strategy

Backend:
- Unit tests for services and logging
- Integration tests for idea ingestion and audit_log
- Metrics unit tests for /metrics and workflow counters
- n8n sync tests using mocked HTTP responses

Frontend:
- Component tests for key pages

Workflows:
- Mock webhook calls and validate responses

Filesystem sync:
- Use temp directories to simulate /projects/tech and /projects/records
- Validate project rows, inferred status, and task creation
