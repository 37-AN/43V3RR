from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, JSON
from sqlalchemy.orm import relationship
from .base import BaseModel


class Task(BaseModel):
    __tablename__ = "tasks"
    id = Column(Integer, primary_key=True)
    project_id = Column(Integer, ForeignKey("projects.id"))
    brand_id = Column(Integer, ForeignKey("brands.id"), nullable=False)
    title = Column(String, nullable=False)
    description = Column(String)
    status = Column(String, nullable=False)
    priority = Column(String, nullable=False)
    source = Column(String, nullable=False)
    due_date = Column(DateTime(timezone=True))
    created_by = Column(String, nullable=False)
    assigned_to = Column(String, nullable=False)
    meta = Column(JSON, default=dict)

    brand = relationship("Brand")
    project = relationship("Project")
