from sqlalchemy import Column, Integer, String, Boolean, Text, JSON, DateTime
from .base import BaseModel


class AIRun(BaseModel):
    __tablename__ = "ai_runs"
    id = Column(Integer, primary_key=True)
    agent_name = Column(String, nullable=False)
    input_summary = Column(Text)
    output_summary = Column(Text)
    success = Column(Boolean, default=True)
    error_message = Column(Text)
    started_at = Column(DateTime(timezone=True))
    completed_at = Column(DateTime(timezone=True))
    meta = Column(JSON, default=dict)
