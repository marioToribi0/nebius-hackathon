"""AgentState TypedDict for the Wayfinder G1 robot agent."""

from typing import Annotated, Any

from langchain_core.messages import BaseMessage
from langgraph.graph.message import add_messages
from typing_extensions import TypedDict


class AgentState(TypedDict):
    messages: Annotated[list[BaseMessage], add_messages]
    place_key: str | None
    place_name: str | None
    context: dict | None        # Full PlaceResearchPublic dict from server
    qr_mode: bool               # True while read_qr tool is scanning
    current_frame: str | None   # base64 JPEG (latest camera frame)
    current_stop_index: int     # Index into context["documents"] (tour progress)
    completed_stops: list[int]  # Indices of stops already explained
