from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


class PlaceDocument(BaseModel):
    doc_key: str = Field(description="Stable slug: {place_key}-{slugified-title}")
    title: str
    order: int = Field(description="Position in the 30-minute route (1-based)")
    estimated_minutes: int = Field(description="Minutes allocated to this stop")
    content: str = Field(description="Full markdown content for this stop")
    sources: list[str] = Field(default_factory=list, description="Source URLs")
    redis_keys: list[str] = Field(
        default_factory=list,
        description="Redis vector store key IDs for this document's chunks",
    )
    is_search_context: bool = Field(
        default=False,
        description="True for the hidden RAG-only document that aggregates all raw search results",
    )


class PlaceResearch(BaseModel):
    place_key: str = Field(description="URL-safe slug, e.g. catedral-de-sal")
    place_name: str = Field(description="Human-readable place name")
    route_plan: str = Field(
        default="",
        description="Narrative overview paragraph of the 30-minute visit",
    )
    documents: list[PlaceDocument] = Field(
        default_factory=list,
        description="Ordered stops — each is both a checklist entry and a detailed doc",
    )
    status: Literal["pending", "processing", "completed", "failed"] = "pending"
    error: str | None = Field(default=None)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class ResearchRequest(BaseModel):
    place_name: str = Field(min_length=1, description="Tourism place name to research")
    place_key: str = Field(
        min_length=1,
        description="URL-safe slug for the place (e.g. catedral-de-sal)",
        pattern=r"^[a-z0-9]+(?:-[a-z0-9]+)*$",
    )
    trip_context: dict[str, str] = Field(
        default_factory=dict,
        description="Q&A pairs collected from the user before triggering research",
    )


class PlaceResearchPublic(BaseModel):
    place_key: str
    place_name: str
    route_plan: str
    documents: list[PlaceDocument]
    status: str
    error: str | None = Field(default=None)
    created_at: datetime
    updated_at: datetime


class DocumentUpdate(BaseModel):
    title: str | None = None
    content: str | None = None
    estimated_minutes: int | None = None
    order: int | None = None


class ResearchStatusPublic(BaseModel):
    place_key: str
    status: str
    error: str | None = None
