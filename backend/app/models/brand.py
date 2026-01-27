from sqlalchemy import Column, Integer, String
from .base import BaseModel


class Brand(BaseModel):
    __tablename__ = "brands"
    id = Column(Integer, primary_key=True)
    name = Column(String, unique=True, nullable=False)
    slug = Column(String, unique=True, nullable=False)
