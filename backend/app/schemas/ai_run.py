from pydantic import BaseModel
from datetime import datetime
from typing import Dict, Any
from .common import BaseSchema


class AIRunRead(BaseSchema):
    agent_name: str
    input_summary: str | None = None
    output_summary: str | None = None
    success: bool
    error_message: str | None = None
    started_at: datetime | None = None
    completed_at: datetime | None = None
    metadata: Dict[str, Any] = {}
