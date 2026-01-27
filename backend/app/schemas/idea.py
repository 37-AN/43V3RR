from pydantic import BaseModel
from typing import Dict, Any
from .common import BaseSchema


class IdeaIngest(BaseModel):
    content: str
    source: str = "manual"


class IdeaRead(BaseSchema):
    brand_id: int
    content: str
    source: str
    status: str
