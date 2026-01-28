from pydantic import BaseModel, Field
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
    meta: Dict[str, Any] = Field(default_factory=dict, alias="metadata")

    model_config = {"populate_by_name": True}
