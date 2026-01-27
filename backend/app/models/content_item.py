from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, JSON
from sqlalchemy.orm import relationship
from .base import BaseModel


class ContentItem(BaseModel):
    __tablename__ = "content_items"
    id = Column(Integer, primary_key=True)
    brand_id = Column(Integer, ForeignKey("brands.id"), nullable=False)
    title = Column(String, nullable=False)
    type = Column(String, nullable=False)
    status = Column(String, nullable=False)
    source = Column(String, nullable=False)
    scheduled_at = Column(DateTime(timezone=True))
    published_at = Column(DateTime(timezone=True))
    meta = Column(JSON, default=dict)

    brand = relationship("Brand")
