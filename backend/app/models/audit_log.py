from sqlalchemy import Column, Integer, String, JSON
from .base import BaseModel


class AuditLog(BaseModel):
    __tablename__ = "audit_log"
    id = Column(Integer, primary_key=True)
    actor_type = Column(String, nullable=False)
    actor_id = Column(String)
    action = Column(String, nullable=False)
    entity_type = Column(String, nullable=False)
    entity_id = Column(String, nullable=False)
    details = Column(JSON, default=dict)
