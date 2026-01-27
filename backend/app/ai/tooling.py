from typing import Any, Dict, List

from .skill_registry import list_skills
from .plugin_registry import list_plugins


def _allowed(allowed_agents: list[str], agent_name: str) -> bool:
    return "all" in allowed_agents or agent_name in allowed_agents


def build_toolset(agent_name: str) -> Dict[str, List[Dict[str, Any]]]:
    skills = [
        skill
        for skill in list_skills()
        if skill.get("enabled") and _allowed(skill.get("allowed_agents", ["all"]), agent_name)
    ]
    plugins = [
        plugin
        for plugin in list_plugins()
        if plugin.get("enabled") and _allowed(plugin.get("allowed_agents", ["all"]), agent_name)
    ]
    return {"skills": skills, "plugins": plugins}
