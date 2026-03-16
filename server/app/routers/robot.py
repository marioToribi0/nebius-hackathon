"""
Robot API router.

Endpoints (all auth via X-Robot-Api-Key header):
  GET  /api/robot/validate/{place_key}  — check if place_key has completed research
  GET  /api/robot/context/{place_key}   — return full PlaceResearchPublic
  POST /api/robot/rag                   — similarity search over a place's embeddings
"""

import asyncio

from fastapi import APIRouter, Depends, HTTPException, Security, status
from fastapi.security.api_key import APIKeyHeader

from app.core.config import settings
from app.core.logging import logger
from app.databases.mongodb import get_database
from app.models.research import PlaceResearchPublic
from app.services.embeddings.utils.retrieval_utils import similarity_search

router = APIRouter(prefix="/api/robot", tags=["robot"])

_COLLECTION = "place_research"
_api_key_header = APIKeyHeader(name="X-Robot-Api-Key", auto_error=True)


def _require_robot_key(api_key: str = Security(_api_key_header)) -> str:
    if not settings.ROBOT_API_KEY or api_key != settings.ROBOT_API_KEY:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid or missing robot API key.",
        )
    return api_key


# ---------------------------------------------------------------------------
# Models
# ---------------------------------------------------------------------------

from pydantic import BaseModel, Field


class RagRequest(BaseModel):
    query: str = Field(min_length=1)
    place_key: str = Field(min_length=1)
    k: int = Field(default=4, ge=1, le=20)


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------


@router.get("/validate/{place_key}")
async def validate_place_key(
    place_key: str,
    _: str = Depends(_require_robot_key),
):
    """Return {valid: bool} — True only when research is completed for the place."""
    db = get_database()
    doc = await db[_COLLECTION].find_one(
        {"place_key": place_key, "status": "completed"},
        {"_id": 0, "status": 1},
    )
    valid = doc is not None
    logger.debug("[robot] validate_place_key | {} -> {}", place_key, valid)
    return {"valid": valid}


@router.get("/context/{place_key}", response_model=PlaceResearchPublic)
async def get_context(
    place_key: str,
    _: str = Depends(_require_robot_key),
):
    """Return full research context for a place (must be completed)."""
    db = get_database()
    doc = await db[_COLLECTION].find_one({"place_key": place_key}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")
    if doc.get("status") != "completed":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Research not yet completed.",
        )
    logger.debug("[robot] get_context | {}", place_key)
    return PlaceResearchPublic(**doc)


@router.post("/rag")
async def rag_search(
    payload: RagRequest,
    _: str = Depends(_require_robot_key),
):
    """Run a similarity search over the place's vector index."""
    index_name = f"place:{payload.place_key}"
    logger.debug("[robot] rag_search | place={} q={!r}", payload.place_key, payload.query)
    try:
        docs = await asyncio.to_thread(
            similarity_search,
            payload.query,
            payload.k,
            index_name,
        )
        results = [
            {"title": d.metadata.get("title", ""), "content": d.page_content}
            for d in docs
        ]
        return {"results": results}
    except Exception as exc:
        logger.error("[robot] rag_search | error: {}", exc)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(exc))
