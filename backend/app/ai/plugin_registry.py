from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, List, Optional

import yaml
from sqlalchemy.orm import Session

from ..services.ai_run_service import start_ai_run, complete_ai_run
from ..services.audit_service import write_audit_log

REPO_ROOT = Path(__file__).resolve().parents[3]
PLUGINS_ROOT = REPO_ROOT / "plugins"
CONFIG_PATH = REPO_ROOT / "config" / "ai" / "plugins.yaml"


@dataclass
class PluginInfo:
    plugin_id: str
    name: str
    description: str
    path: str
    kind: str
    required_env: List[str]
    risk_level: str
    enabled: bool
    allowed_agents: List[str]


def _load_config() -> Dict[str, Dict[str, Any]]:
    if not CONFIG_PATH.exists():
        return {}
    data = yaml.safe_load(CONFIG_PATH.read_text(encoding="utf-8")) or {}
    return {entry["id"]: entry for entry in data.get("plugins", [])}


def discover_plugins() -> List[PluginInfo]:
    config = _load_config()
    plugins: List[PluginInfo] = []

    for plugin_dir in (PLUGINS_ROOT / "plugins").iterdir():
        if not plugin_dir.is_dir():
            continue
        cfg = config.get(plugin_dir.name, {})
        plugins.append(
            PluginInfo(
                plugin_id=plugin_dir.name,
                name=plugin_dir.name,
                description=(plugin_dir / "README.md").read_text(encoding="utf-8")[:200]
                if (plugin_dir / "README.md").exists()
                else "",
                path=str(plugin_dir),
                kind="internal",
                required_env=[],
                risk_level=cfg.get("risk_level", "internal_only"),
                enabled=bool(cfg.get("enabled", False)),
                allowed_agents=cfg.get("allowed_agents", ["all"]),
            )
        )

    external_root = PLUGINS_ROOT / "external_plugins"
    if external_root.exists():
        for plugin_dir in external_root.iterdir():
            if not plugin_dir.is_dir():
                continue
            cfg = config.get(plugin_dir.name, {})
            plugins.append(
                PluginInfo(
                    plugin_id=plugin_dir.name,
                    name=plugin_dir.name,
                    description=(plugin_dir / "README.md").read_text(encoding="utf-8")[:200]
                    if (plugin_dir / "README.md").exists()
                    else "",
                    path=str(plugin_dir),
                    kind="external",
                    required_env=[],
                    risk_level=cfg.get("risk_level", "external_network"),
                    enabled=bool(cfg.get("enabled", False)),
                    allowed_agents=cfg.get("allowed_agents", ["all"]),
                )
            )

    return plugins


def list_plugins() -> List[Dict[str, Any]]:
    return [plugin.__dict__ for plugin in discover_plugins()]


def get_plugin(plugin_id: str) -> Optional[PluginInfo]:
    for plugin in discover_plugins():
        if plugin.plugin_id == plugin_id:
            return plugin
    return None


def _redact(payload: Dict[str, Any]) -> Dict[str, Any]:
    redacted = {}
    for key, value in payload.items():
        if any(token in key.lower() for token in ["token", "secret", "key", "password"]):
            redacted[key] = "***"
        else:
            redacted[key] = value
    return redacted


def call_plugin(db: Session, actor_id: str, plugin_id: str, **kwargs) -> Dict[str, Any]:
    run = start_ai_run(db, agent_name=actor_id, input_summary=f"plugin={plugin_id}")
    try:
        plugin = get_plugin(plugin_id)
        if not plugin or not plugin.enabled:
            raise RuntimeError("Plugin not enabled or not found")

        # TODO: wire actual plugin execution based on metadata.
        result = {
            "status": "not_implemented",
            "message": "Plugin execution not wired; metadata only.",
        }

        complete_ai_run(db, run, output_summary=f"plugin_call:{plugin_id}")
        write_audit_log(
            db,
            actor_type="agent",
            actor_id=actor_id,
            action="plugin_call",
            entity_type="plugin",
            entity_id=plugin_id,
            details={
                "input": _redact(kwargs),
                "status": "success",
            },
        )
        return result
    except Exception as exc:
        complete_ai_run(db, run, output_summary="plugin_call_failed", success=False, error_message=str(exc))
        write_audit_log(
            db,
            actor_type="agent",
            actor_id=actor_id,
            action="plugin_call",
            entity_type="plugin",
            entity_id=plugin_id,
            details={
                "input": _redact(kwargs),
                "status": "failure",
                "error": str(exc),
            },
        )
        raise
