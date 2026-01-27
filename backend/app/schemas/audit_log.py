from pydantic import BaseModel
from typing import Dict, Any
from .common import BaseSchema


class AuditLogRead(BaseSchema):
    actor_type: str
    actor_id: str | None = None
    action: str
    entity_type: str
    entity_id: str
    details: Dict[str, Any] = {}
