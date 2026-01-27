from pydantic import BaseModel
from datetime import datetime
from typing import Optional, Dict, Any
from .common import BaseSchema


class TaskCreate(BaseModel):
    project_id: Optional[int] = None
    brand_id: int
    title: str
    description: Optional[str] = None
    status: str = "open"
    priority: str = "medium"
    source: str = "manual"
    due_date: Optional[datetime] = None
    created_by: str = "human"
    assigned_to: str = "human"
    metadata: Dict[str, Any] = {}


class TaskRead(BaseSchema):
    project_id: Optional[int] = None
    brand_id: int
    title: str
    description: Optional[str] = None
    status: str
    priority: str
    source: str
    due_date: Optional[datetime] = None
    created_by: str
    assigned_to: str
    metadata: Dict[str, Any]
