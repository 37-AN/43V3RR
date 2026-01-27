from sqlalchemy import Column, Integer, String, ForeignKey, Text
from sqlalchemy.orm import relationship
from .base import BaseModel


class Idea(BaseModel):
    __tablename__ = "ideas"
    id = Column(Integer, primary_key=True)
    brand_id = Column(Integer, ForeignKey("brands.id"), nullable=False)
    content = Column(Text, nullable=False)
    source = Column(String, nullable=False)
    status = Column(String, nullable=False)

    brand = relationship("Brand")
