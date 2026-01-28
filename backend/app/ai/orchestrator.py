import json
from dataclasses import dataclass
from typing import Optional
from sqlalchemy.orm import Session
from langgraph.graph import StateGraph
from ..services.ai_run_service import start_ai_run, complete_ai_run
from ..services.audit_service import write_audit_log
from .ollama_client import generate
from .tooling import build_toolset


@dataclass
class OrchestratorDecision:
    brand_slug: str
    item_type: str
    priority: str


def _rule_based_decision(content: str) -> OrchestratorDecision:
    lowered = content.lower()
    if any(word in lowered for word in ["track", "beat", "song", "mix", "master", "release"]):
        return OrchestratorDecision("records", "idea", "medium")
    return OrchestratorDecision("tech", "idea", "medium")


def _ollama_decision(content: str) -> Optional[OrchestratorDecision]:
    prompt = (
        "You are a routing agent. Return JSON only with keys: brand_slug, item_type, priority. "
        "brand_slug must be tech or records. "
        "item_type must be idea, task, or project. "
        "priority must be low, medium, or high.\n\n"
        f"Input: {content}\n"
        "Output:"
    )
    raw = generate(prompt)
    if not raw:
        return None
    try:
        start = raw.find("{")
        end = raw.rfind("}")
        if start == -1 or end == -1:
            return None
        data = json.loads(raw[start : end + 1])
        return OrchestratorDecision(
            brand_slug=data.get("brand_slug", "tech"),
            item_type=data.get("item_type", "idea"),
            priority=data.get("priority", "medium"),
        )
    except Exception:
        return None


def _router(state: dict) -> dict:
    decision = _ollama_decision(state["content"]) or _rule_based_decision(state["content"])
    state["decision"] = decision
    return state


def _build_graph():
    graph = StateGraph(dict)
    graph.add_node("route", _router)
    graph.set_entry_point("route")
    graph.set_finish_point("route")
    return graph.compile()


def ingest_idea(db: Session, content: str, source: str) -> OrchestratorDecision:
    run = start_ai_run(db, agent_name="core_orchestrator", input_summary=content[:200])
    graph = _build_graph()
    try:
        toolset = build_toolset("core_orchestrator")
        result = graph.invoke({"content": content})
        decision: OrchestratorDecision = result["decision"]
        complete_ai_run(
            db,
            run,
            output_summary=f"brand={decision.brand_slug}, type={decision.item_type}, priority={decision.priority}",
        )
        write_audit_log(
            db,
            actor_type="agent",
            actor_id="core_orchestrator",
            action="idea_routed",
            entity_type="idea",
            entity_id="pending",
            details={
                "brand_slug": decision.brand_slug,
                "source": source,
                "item_type": decision.item_type,
                "priority": decision.priority,
                "tools": {"skills": len(toolset["skills"]), "plugins": len(toolset["plugins"])},
            },
        )
        return decision
    except Exception as exc:
        complete_ai_run(db, run, output_summary="failed", success=False, error_message=str(exc))
        raise
