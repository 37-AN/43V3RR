from pydantic import BaseModel
from .common import BaseSchema


class BrandCreate(BaseModel):
    name: str
    slug: str


class BrandRead(BaseSchema):
    name: str
    slug: str
