from typing import TypedDict

from app.services.search.tavily_service import SearchResult


class StopInfo(TypedDict):
    """Minimal stop descriptor produced by the planning node."""

    title: str
    estimated_minutes: int


class StopDocument(TypedDict):
    """Fully researched stop, ready to be persisted."""

    doc_key: str
    title: str
    order: int
    estimated_minutes: int
    content: str
    sources: list[str]
    is_search_context: bool


class ResearchState(TypedDict):
    place_name: str
    place_key: str
    trip_context: dict[str, str]

    # Populated by search_and_plan
    overview_results: list[SearchResult]
    route_plan: str
    stops: list[StopInfo]

    # Populated by research_stops
    stop_documents: list[StopDocument]

    # Terminal error (if any)
    error: str | None
