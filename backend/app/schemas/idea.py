from pydantic import BaseModel, Field, AliasChoices
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
    meta: Dict[str, Any] = Field(default_factory=dict, validation_alias=AliasChoices("meta", "metadata"))

    model_config = {"populate_by_name": True}
