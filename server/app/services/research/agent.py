"""
LangGraph research agent.

Graph: search_and_plan → research_stops → save_to_mongo
"""

from functools import lru_cache

from langgraph.graph import END, START, StateGraph

from app.services.research.nodes import research_stops, save_to_mongo, search_and_plan
from app.services.research.state import ResearchState


@lru_cache(maxsize=1)
def _build_graph():
    builder = StateGraph(ResearchState)

    builder.add_node("search_and_plan", search_and_plan)
    builder.add_node("research_stops", research_stops)
    builder.add_node("save_to_mongo", save_to_mongo)

    builder.add_edge(START, "search_and_plan")
    builder.add_edge("search_and_plan", "research_stops")
    builder.add_edge("research_stops", "save_to_mongo")
    builder.add_edge("save_to_mongo", END)

    return builder.compile()


async def run_research_agent(place_name: str, place_key: str) -> None:
    """
    Execute the full research pipeline for a tourism place.

    Updates the place_research MongoDB document as a side-effect.
    Raises on unhandled errors so the caller can mark the doc as failed.
    """
    graph = _build_graph()
    initial_state: ResearchState = {
        "place_name": place_name,
        "place_key": place_key,
        "overview_results": [],
        "route_plan": "",
        "stops": [],
        "stop_documents": [],
        "error": None,
    }
    await graph.ainvoke(initial_state)
