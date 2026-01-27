import json
import logging
import os
import re
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, List, Optional

import yaml
from sqlalchemy.orm import Session

from ..services.ai_run_service import start_ai_run, complete_ai_run
from ..services.audit_service import write_audit_log
from .logging_utils import append_activity

REPO_ROOT = Path(__file__).resolve().parents[2]
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


def _read_text_safe(path: Path) -> str:
    try:
        return path.read_text(encoding="utf-8", errors="ignore")
    except Exception:
        return ""


def _load_mcp(path: Path) -> Dict[str, Any]:
    try:
        return json.loads(_read_text_safe(path)) or {}
    except Exception:
        return {}


def _extract_required_env(payload: Any) -> List[str]:
    if isinstance(payload, dict):
        values = []
        for value in payload.values():
            values.extend(_extract_required_env(value))
        return values
    if isinstance(payload, list):
        values = []
        for value in payload:
            values.extend(_extract_required_env(value))
        return values
    if isinstance(payload, str):
        return re.findall(r"\$\{([A-Z0-9_]+)\}", payload)
    return []


def discover_plugins() -> List[PluginInfo]:
    config = _load_config()
    plugins: List[PluginInfo] = []

    def _score_path(path: str) -> int:
        score = 0
        if "__MACOSX" in path:
            score -= 100
        if "/plugins/plugins/" in path:
            score += 1
        return score

    internal_root = PLUGINS_ROOT / "plugins"
    if internal_root.exists():
        for plugin_dir in internal_root.iterdir():
            if not plugin_dir.is_dir():
                continue
            cfg = config.get(plugin_dir.name, {})
            mcp_path = plugin_dir / ".mcp.json"
            mcp_payload = _load_mcp(mcp_path) if mcp_path.exists() else {}
            mcp_key = next(iter(mcp_payload.keys()), plugin_dir.name)
            mcp_config = mcp_payload.get(mcp_key, {})
            required_env = sorted(set(_extract_required_env(mcp_payload)))
            plugins.append(
                PluginInfo(
                    plugin_id=plugin_dir.name,
                    name=mcp_key,
                    description=_read_text_safe(plugin_dir / "README.md")[:200],
                    path=str(plugin_dir),
                    kind=mcp_config.get("type", "internal"),
                    required_env=required_env,
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
            mcp_path = plugin_dir / ".mcp.json"
            mcp_payload = _load_mcp(mcp_path) if mcp_path.exists() else {}
            mcp_key = next(iter(mcp_payload.keys()), plugin_dir.name)
            mcp_config = mcp_payload.get(mcp_key, {})
            required_env = sorted(set(_extract_required_env(mcp_payload)))
            plugins.append(
                PluginInfo(
                    plugin_id=plugin_dir.name,
                    name=mcp_key,
                    description=_read_text_safe(plugin_dir / "README.md")[:200],
                    path=str(plugin_dir),
                    kind=mcp_config.get("type", "external"),
                    required_env=required_env,
                    risk_level=cfg.get("risk_level", "external_network"),
                    enabled=bool(cfg.get("enabled", False)),
                    allowed_agents=cfg.get("allowed_agents", ["all"]),
                )
            )

    deduped: dict[str, PluginInfo] = {}
    for plugin in plugins:
        existing = deduped.get(plugin.plugin_id)
        if existing is None:
            deduped[plugin.plugin_id] = plugin
            continue
        if _score_path(plugin.path) > _score_path(existing.path):
            deduped[plugin.plugin_id] = plugin
    return list(deduped.values())


def list_plugins() -> List[Dict[str, Any]]:
    try:
        return [plugin.__dict__ for plugin in discover_plugins()]
    except Exception as exc:
        logging.getLogger("plugin_registry").exception("plugin_discovery_failed: %s", exc)
        return []


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
        missing_env = [key for key in plugin.required_env if not os.getenv(key)]
        if missing_env:
            raise RuntimeError(f"Missing required env vars: {', '.join(missing_env)}")

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
                "required_env": plugin.required_env,
            },
        )
        append_activity(
            {
                "actor_id": actor_id,
                "action": "plugin_call",
                "plugin_id": plugin_id,
                "status": "success",
            }
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
                "required_env": plugin.required_env if plugin else [],
            },
        )
        append_activity(
            {
                "actor_id": actor_id,
                "action": "plugin_call",
                "plugin_id": plugin_id,
                "status": "failure",
            }
        )
        raise
