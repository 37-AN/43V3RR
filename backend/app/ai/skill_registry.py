import json
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, List, Optional

import yaml
from sqlalchemy.orm import Session

from ..services.ai_run_service import start_ai_run, complete_ai_run
from ..services.audit_service import write_audit_log

REPO_ROOT = Path(__file__).resolve().parents[3]
SKILLS_ROOTS = [REPO_ROOT / "agent-skills", REPO_ROOT / "plugins"]
CONFIG_PATH = REPO_ROOT / "config" / "ai" / "skills.yaml"


@dataclass
class SkillInfo:
    skill_id: str
    name: str
    description: str
    path: str
    enabled: bool
    allowed_agents: List[str]
    input_schema: Optional[dict]
    output_schema: Optional[dict]


def _parse_frontmatter(path: Path) -> Dict[str, Any]:
    text = path.read_text(encoding="utf-8")
    if not text.startswith("---"):
        return {}
    parts = text.split("---", 2)
    if len(parts) < 3:
        return {}
    return yaml.safe_load(parts[1]) or {}


def _load_config() -> Dict[str, Dict[str, Any]]:
    if not CONFIG_PATH.exists():
        return {}
    data = yaml.safe_load(CONFIG_PATH.read_text(encoding="utf-8")) or {}
    return {entry["id"]: entry for entry in data.get("skills", [])}


def discover_skills() -> List[SkillInfo]:
    config = _load_config()
    skills: List[SkillInfo] = []

    for root in SKILLS_ROOTS:
        if not root.exists():
            continue
        for skill_path in root.rglob("SKILL.md"):
            meta = _parse_frontmatter(skill_path)
            name = meta.get("name") or skill_path.parent.name
            skill_id = meta.get("name") or skill_path.parent.name
            description = meta.get("description") or ""
            cfg = config.get(skill_id, {})
            enabled = bool(cfg.get("enabled", False))
            allowed_agents = cfg.get("allowed_agents", ["all"])
            skills.append(
                SkillInfo(
                    skill_id=skill_id,
                    name=name,
                    description=description,
                    path=str(skill_path),
                    enabled=enabled,
                    allowed_agents=allowed_agents,
                    input_schema=None,
                    output_schema=None,
                )
            )
    return skills


def list_skills() -> List[Dict[str, Any]]:
    return [skill.__dict__ for skill in discover_skills()]


def get_skill(skill_id: str) -> Optional[SkillInfo]:
    for skill in discover_skills():
        if skill.skill_id == skill_id:
            return skill
    return None


def _redact(payload: Dict[str, Any]) -> Dict[str, Any]:
    redacted = {}
    for key, value in payload.items():
        if any(token in key.lower() for token in ["token", "secret", "key", "password"]):
            redacted[key] = "***"
        else:
            redacted[key] = value
    return redacted


def call_skill(db: Session, actor_id: str, skill_id: str, **kwargs) -> Dict[str, Any]:
    run = start_ai_run(db, agent_name=actor_id, input_summary=f"skill={skill_id}")
    try:
        skill = get_skill(skill_id)
        if not skill or not skill.enabled:
            raise RuntimeError("Skill not enabled or not found")

        # TODO: map skill metadata to executable callables.
        result = {
            "status": "not_implemented",
            "message": "Skill execution not wired; metadata only.",
        }

        complete_ai_run(db, run, output_summary=f"skill_call:{skill_id}")
        write_audit_log(
            db,
            actor_type="agent",
            actor_id=actor_id,
            action="skill_call",
            entity_type="skill",
            entity_id=skill_id,
            details={
                "input": _redact(kwargs),
                "status": "success",
            },
        )
        return result
    except Exception as exc:
        complete_ai_run(db, run, output_summary="skill_call_failed", success=False, error_message=str(exc))
        write_audit_log(
            db,
            actor_type="agent",
            actor_id=actor_id,
            action="skill_call",
            entity_type="skill",
            entity_id=skill_id,
            details={
                "input": _redact(kwargs),
                "status": "failure",
                "error": str(exc),
            },
        )
        raise
