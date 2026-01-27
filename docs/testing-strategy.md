# Testing Strategy

Backend:
- Unit tests for services and logging
- Integration tests for idea ingestion and audit_log

Frontend:
- Component tests for key pages

Workflows:
- Mock webhook calls and validate responses

Filesystem sync:
- Use temp directories to simulate /projects/tech and /projects/records
- Validate project rows, inferred status, and task creation
