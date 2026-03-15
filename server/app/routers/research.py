"""
Research agent router.

Endpoints:
  POST   /api/research                              — trigger research agent
  GET    /api/research/{place_key}                  — get full research doc
  PUT    /api/research/{place_key}/documents/{doc_key} — update a document
  DELETE /api/research/{place_key}/documents/{doc_key} — delete a document + Redis keys
  POST   /api/research/{place_key}/embeddings/sync  — re-sync all embeddings
  DELETE /api/research/{place_key}                  — delete place + all Redis keys
"""

import asyncio
import uuid
from datetime import datetime, timezone
from typing import Annotated

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from langchain_community.vectorstores import Redis as RedisVectorStore
from langchain_core.documents import Document

from app.core.config import settings
from app.core.logging import logger
from app.databases.mongodb import get_database
from app.dependencies import get_current_user
from app.models.research import (
    DocumentUpdate,
    PlaceResearchPublic,
    ResearchRequest,
    ResearchStatusPublic,
)
from app.models.user import UserPublic
from app.services.embeddings.utils.embedding_utils import get_embeddings
from app.services.research.agent import run_research_agent

router = APIRouter(prefix="/api/research", tags=["research"])

_COLLECTION = "place_research"
_NOT_FOUND = "Not found"
_DOC_KEY_FIELD = "documents.doc_key"

CurrentUser = Annotated[UserPublic, Depends(get_current_user)]


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _index_name(place_key: str) -> str:
    return f"place:{place_key}"


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _sync_drop_index(index_name: str) -> None:
    try:
        RedisVectorStore.drop_index(
            index_name=index_name,
            delete_documents=True,
            redis_url=settings.REDIS_URL,
        )
    except Exception:
        pass


def _sync_embed_documents(
    documents: list[dict], index_name: str
) -> dict[str, list[str]]:
    """
    Embed all documents for a place and return {doc_key: [redis_keys]}.
    Creates the index on the first document, then appends for subsequent ones.
    """
    embeddings = get_embeddings()
    doc_key_map: dict[str, list[str]] = {}

    for doc in documents:
        lc_doc = Document(
            page_content=doc["content"],
            metadata={
                _DOC_KEY_FIELD.split(".")[1]: doc["doc_key"],
                "place_key": doc.get("place_key", ""),
                "title": doc["title"],
                "order": doc["order"],
            },
        )
        try:
            store = RedisVectorStore.from_existing_index(
                embedding=embeddings,
                redis_url=settings.REDIS_URL,
                index_name=index_name,
            )
            ids = store.add_documents([lc_doc])
        except Exception:
            RedisVectorStore.from_documents(
                documents=[lc_doc],
                embedding=embeddings,
                redis_url=settings.REDIS_URL,
                index_name=index_name,
            )
            ids = [str(uuid.uuid4())]
        doc_key_map[doc["doc_key"]] = ids

    return doc_key_map


async def _mark_status(place_key: str, status_val: str, error: str | None = None):
    db = get_database()
    update: dict = {"status": status_val, "updated_at": _now()}
    if error is not None:
        update["error"] = error
    await db[_COLLECTION].update_one({"place_key": place_key}, {"$set": update})


async def _run_agent_task(place_name: str, place_key: str):
    """Background task: run the research agent, update status on failure."""
    logger.info("[{}] agent task started for {!r}", place_key, place_name)
    try:
        await run_research_agent(place_name, place_key)
        logger.info("[{}] agent task completed successfully", place_key)
    except Exception as exc:
        logger.error("[{}] agent task failed: {}", place_key, exc)
        await _mark_status(place_key, "failed", error=str(exc))


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------


@router.post(
    "",
    response_model=ResearchStatusPublic,
    status_code=status.HTTP_202_ACCEPTED,
)
async def trigger_research(
    payload: ResearchRequest,
    background_tasks: BackgroundTasks,
    current_user: CurrentUser,
):
    """
    Start the research agent for a tourism place.
    The agent runs as a background task; poll GET /{place_key} to check status.
    """
    db = get_database()
    now = _now()

    existing = await db[_COLLECTION].find_one({"place_key": payload.place_key})
    if existing and existing.get("status") == "processing":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Research already in progress for this place.",
        )

    await db[_COLLECTION].update_one(
        {"place_key": payload.place_key},
        {
            "$set": {
                "place_name": payload.place_name,
                "status": "processing",
                "error": None,
                "updated_at": now,
            },
            "$setOnInsert": {
                "route_plan": "",
                "documents": [],
                "created_at": now,
            },
        },
        upsert=True,
    )

    logger.info(
        "[{}] trigger_research | queued agent for {!r} by user {}",
        payload.place_key,
        payload.place_name,
        current_user.id,
    )
    background_tasks.add_task(_run_agent_task, payload.place_name, payload.place_key)

    return ResearchStatusPublic(place_key=payload.place_key, status="processing")


@router.get("/{place_key}", response_model=PlaceResearchPublic)
async def get_research(place_key: str, current_user: CurrentUser):
    logger.debug("[{}] get_research | requested by user {}", place_key, current_user.id)
    db = get_database()
    doc = await db[_COLLECTION].find_one({"place_key": place_key}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=_NOT_FOUND)
    return PlaceResearchPublic(**doc)


@router.put(
    "/{place_key}/documents/{doc_key}",
    response_model=PlaceResearchPublic,
)
async def update_document(
    place_key: str,
    doc_key: str,
    payload: DocumentUpdate,
    current_user: CurrentUser,
):
    """Update a single document's markdown, title, order, or estimated_minutes."""
    logger.info("[{}] update_document | doc={} by user {}", place_key, doc_key, current_user.id)
    db = get_database()

    doc = await db[_COLLECTION].find_one(
        {"place_key": place_key, _DOC_KEY_FIELD: doc_key},
        {"_id": 0},
    )
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=_NOT_FOUND)

    update_fields: dict = {}
    for field, value in payload.model_dump(exclude_none=True).items():
        update_fields[f"documents.$.{field}"] = value
    update_fields["updated_at"] = _now()

    await db[_COLLECTION].update_one(
        {"place_key": place_key, _DOC_KEY_FIELD: doc_key},
        {"$set": update_fields},
    )

    updated = await db[_COLLECTION].find_one({"place_key": place_key}, {"_id": 0})
    return PlaceResearchPublic(**updated)


@router.delete(
    "/{place_key}/documents/{doc_key}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_document(
    place_key: str,
    doc_key: str,
    current_user: CurrentUser,
):
    """
    Delete a single document from the place research.
    Also deletes all Redis vector keys associated with this document.
    """
    logger.info("[{}] delete_document | doc={} by user {}", place_key, doc_key, current_user.id)
    db = get_database()

    doc = await db[_COLLECTION].find_one(
        {"place_key": place_key, _DOC_KEY_FIELD: doc_key},
        {"documents.$": 1},
    )
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=_NOT_FOUND)

    target = doc["documents"][0]
    redis_keys: list[str] = target.get("redis_keys", [])

    if redis_keys:
        index_name = _index_name(place_key)
        logger.debug("[{}] delete_document | removing {} Redis keys", place_key, len(redis_keys))
        try:
            store = RedisVectorStore.from_existing_index(
                embedding=get_embeddings(),
                redis_url=settings.REDIS_URL,
                index_name=index_name,
            )
            await asyncio.to_thread(store.delete, redis_keys)
        except Exception:
            logger.warning("[{}] delete_document | failed to remove Redis keys (index may not exist)", place_key)

    await db[_COLLECTION].update_one(
        {"place_key": place_key},
        {
            "$pull": {"documents": {"doc_key": doc_key}},
            "$set": {"updated_at": _now()},
        },
    )


@router.post(
    "/{place_key}/embeddings/sync",
    response_model=ResearchStatusPublic,
)
async def sync_embeddings(place_key: str, current_user: CurrentUser):
    """
    Re-sync all embeddings for a place:
    1. Drop the existing per-place Redis index.
    2. Re-embed every document.
    3. Persist the new redis_keys in MongoDB.
    """
    logger.info("[{}] sync_embeddings | started by user {}", place_key, current_user.id)
    db = get_database()

    place = await db[_COLLECTION].find_one({"place_key": place_key})
    if not place:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=_NOT_FOUND)

    documents: list[dict] = place.get("documents", [])
    index_name = _index_name(place_key)

    logger.info("[{}] sync_embeddings | dropping Redis index {!r}", place_key, index_name)
    await asyncio.to_thread(_sync_drop_index, index_name)

    docs_with_place_key = [dict(d, place_key=place_key) for d in documents]
    doc_key_map: dict[str, list[str]] = await asyncio.to_thread(
        _sync_embed_documents, docs_with_place_key, index_name
    )

    for doc in documents:
        dk = doc["doc_key"]
        new_keys = doc_key_map.get(dk, [])
        await db[_COLLECTION].update_one(
            {"place_key": place_key, _DOC_KEY_FIELD: dk},
            {
                "$set": {
                    "documents.$.redis_keys": new_keys,
                    "updated_at": _now(),
                }
            },
        )
        logger.debug("[{}] sync_embeddings | {} -> {} keys", place_key, dk, len(new_keys))

    logger.info("[{}] sync_embeddings | completed, embedded {} docs", place_key, len(documents))
    return ResearchStatusPublic(place_key=place_key, status="completed")


@router.delete("/{place_key}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_research(place_key: str, current_user: CurrentUser):
    """Delete the full place research record and its Redis index."""
    logger.info("[{}] delete_research | requested by user {}", place_key, current_user.id)
    db = get_database()

    place = await db[_COLLECTION].find_one({"place_key": place_key})
    if not place:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=_NOT_FOUND)

    await asyncio.to_thread(_sync_drop_index, _index_name(place_key))
    await db[_COLLECTION].delete_one({"place_key": place_key})
    logger.info("[{}] delete_research | deleted place and Redis index", place_key)
