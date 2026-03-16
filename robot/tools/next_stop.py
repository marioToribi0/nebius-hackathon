"""Tool: mark current stop as done and advance to the next one."""

from langchain_core.tools import tool
from loguru import logger

_agent_state: dict | None = None


def set_agent_state(state: dict) -> None:
    global _agent_state
    _agent_state = state


@tool
def next_stop() -> str:
    """
    Mark the current tour stop as completed and advance to the next one.
    Call this after you have fully explained the current stop to the visitor.
    Returns a summary of what the next stop is, or a tour-complete message.
    """
    state = _agent_state
    if state is None:
        return "State not initialised."

    ctx = state.get("context")
    if not ctx:
        return "No tour context loaded yet."

    stops = [s for s in ctx.get("documents", []) if not s.get("is_search_context")]
    current = state.get("current_stop_index", 0)
    completed: list[int] = state.get("completed_stops", [])

    if current not in completed:
        completed.append(current)
        state["completed_stops"] = completed

    next_idx = current + 1
    state["current_stop_index"] = next_idx

    if next_idx >= len(stops):
        logger.info("next_stop: tour complete ({} stops)", len(stops))
        return (
            "Tour complete! All stops have been covered. "
            "Thank the visitor and offer to answer any questions."
        )

    next_stop_data = stops[next_idx]
    title = next_stop_data.get("title", f"Stop {next_idx + 1}")
    minutes = next_stop_data.get("estimated_minutes", "?")
    logger.info("next_stop: advancing to stop {} — {!r}", next_idx + 1, title)
    return (
        f"Moved to stop {next_idx + 1} of {len(stops)}: '{title}' (~{minutes} min). "
        "The system prompt now reflects this stop. Begin explaining it to the visitor using the speak tool."
    )
