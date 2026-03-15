from pydantic import BaseModel, Field
from datetime import datetime
from typing import Any


class Waypoint(BaseModel):
    name: str
    description: str = ""
    coordinates: dict[str, float] = Field(default_factory=dict)


class RouteCreate(BaseModel):
    name: str = Field(min_length=1)
    description: str = ""
    waypoints: list[Waypoint] = Field(default_factory=list)


class RoutePublic(BaseModel):
    id: str
    name: str
    description: str
    waypoints: list[Waypoint]
    created_by: str
    created_at: datetime


class EmbeddingRequest(BaseModel):
    source_type: str = Field(description="Type: 'text', 'url', or 'file'")
    content: str = Field(description="Text content or URL")
    metadata: dict[str, Any] = Field(default_factory=dict)


class EmbeddingPublic(BaseModel):
    id: str
    source_type: str
    status: str  # pending, processing, completed, failed
    created_by: str
    created_at: datetime
