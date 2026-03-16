"""LangGraph ReAct agent for Wayfinder G1 — dual-model setup.

- Vision turns (camera frame attached): Qwen2.5-VL-72B-Instruct
- Text-only turns:                       Qwen3-235B-A22B-Instruct-2507
"""

from dataclasses import dataclass

from langchain_core.messages import SystemMessage
from langchain_openai import ChatOpenAI
from langgraph.prebuilt import create_react_agent

from agent.state import AgentState
from config import settings
from tools import (
    capture_frame,
    move,
    next_stop,
    point,
    read_qr,
    search_web,
    speak,
)


def _make_llm(model: str) -> ChatOpenAI:
    kwargs: dict = dict(
        model=model,
        api_key=settings.NEBIUS_API_KEY,
        base_url=settings.NEBIUS_BASE_URL,
        temperature=0.3,
        max_tokens=2048,
    )
    # Qwen3 Instruct models: explicitly disable thinking mode to keep
    # responses fast and tool-calls predictable.
    if "Qwen3" in model and "Thinking" not in model:
        kwargs["model_kwargs"] = {"extra_body": {"enable_thinking": False}}
    return ChatOpenAI(**kwargs)


def _build_system_prompt(state: AgentState) -> str:
    if not state.get("context"):
        return (
            "You are Wayfinder G1, an intelligent robot guide. "
            "No place context is loaded yet. "
            "Ask the visitor to show a QR code so you can load location context, "
            "or call the read_qr tool to start scanning. "
            "Use the speak tool to communicate verbally."
        )

    ctx = state["context"]
    place_name = ctx.get("place_name", state.get("place_name", "this place"))
    route_plan = ctx.get("route_plan", "")
    all_docs = ctx.get("documents", [])
    stops = [s for s in all_docs if not s.get("is_search_context")]

    current_idx: int = state.get("current_stop_index", 0)
    completed: list[int] = state.get("completed_stops", [])

    # Checklist
    checklist_lines = []
    for i, s in enumerate(stops):
        title = s.get("title", f"Stop {i+1}")
        mins = s.get("estimated_minutes", "?")
        if i in completed:
            marker, suffix = "✅", "— done"
        elif i == current_idx:
            marker, suffix = "▶️", "— CURRENT (you are here)"
        else:
            marker, suffix = "⬜", ""
        checklist_lines.append(f"  {marker} {i+1}. {title} (~{mins} min) {suffix}".rstrip())

    checklist = "\n".join(checklist_lines)

    # Current stop detail
    if current_idx < len(stops):
        cur = stops[current_idx]
        cur_title = cur.get("title", "")
        cur_content = cur.get("content", "")
        cur_mins = cur.get("estimated_minutes", "?")
        current_stop_section = (
            f"## Current stop: {cur_title} (~{cur_mins} min)\n\n{cur_content}"
        )
        is_last = current_idx == len(stops) - 1
        next_instruction = (
            "This is the LAST stop. After explaining it fully, thank the visitor for completing the tour."
            if is_last
            else "After explaining this stop fully, call **next_stop** to move to the next one."
        )
    else:
        current_stop_section = "All stops completed."
        next_instruction = "The tour is finished. Answer any remaining questions."

    return (
        f"You are Wayfinder G1, an intelligent robot guide at **{place_name}**.\n\n"
        f"### Route overview\n{route_plan}\n\n"
        f"### Tour checklist ({len(stops)} stops)\n{checklist}\n\n"
        f"---\n\n"
        f"{current_stop_section}\n\n"
        f"---\n\n"
        "### Instructions\n"
        "- Always use the **speak** tool to narrate information aloud to the visitor.\n"
        "- Use **retrieve_rag** for deeper details about any topic at this place.\n"
        "- Use **capture_frame** if you need to see the current environment.\n"
        f"- {next_instruction}\n"
        "- If the visitor asks a question mid-stop, answer it, then continue with the current stop."
    )


@dataclass
class DualAgent:
    """Holds two compiled agents and dispatches based on whether a frame is present."""

    vision_agent: object   # compiled graph — Qwen2.5-VL
    text_agent: object     # compiled graph — Qwen3-235B-Instruct

    async def ainvoke(self, state: AgentState) -> dict:
        has_frame = bool(state.get("current_frame"))
        agent = self.vision_agent if has_frame else self.text_agent
        return await agent.ainvoke(state)


def build_agent(state: AgentState, extra_tools: list | None = None) -> DualAgent:
    """
    Build both agents sharing the same tools and system prompt.
    Pass extra_tools=[retrieve_rag_tool] once context is loaded.
    """
    system_prompt = SystemMessage(content=_build_system_prompt(state))

    tool_list = [read_qr, search_web, speak, capture_frame, move, point, next_stop]
    if extra_tools:
        tool_list = extra_tools + tool_list

    vision_agent = create_react_agent(
        model=_make_llm(settings.NEBIUS_VISION_MODEL),
        tools=tool_list,
        prompt=system_prompt,
    )
    text_agent = create_react_agent(
        model=_make_llm(settings.NEBIUS_TEXT_MODEL),
        tools=tool_list,
        prompt=system_prompt,
    )

    return DualAgent(vision_agent=vision_agent, text_agent=text_agent)
