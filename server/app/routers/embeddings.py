from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from langchain_core.documents import Document

from app.dependencies import get_current_user
from app.models.route import EmbeddingPublic, EmbeddingRequest
from app.models.user import UserPublic
from app.services.embeddings import store_document_chunk

router = APIRouter(prefix="/api/embeddings", tags=["embeddings"])


@router.post(
    "/generate",
    response_model=EmbeddingPublic,
    status_code=status.HTTP_202_ACCEPTED,
)
async def generate(
    payload: EmbeddingRequest,
    current_user: UserPublic = Depends(get_current_user),
):
    document = Document(
        page_content=payload.content,
        metadata={"source_type": payload.source_type, **payload.metadata},
    )

    try:
        ids = await store_document_chunk(document)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Embedding ingestion failed: {exc}",
        ) from exc

    doc_id = ids[0] if ids else "unknown"

    return EmbeddingPublic(
        id=doc_id,
        source_type=payload.source_type,
        status="completed",
        created_by=current_user.id,
        created_at=datetime.now(timezone.utc),
    )


@router.get("", response_model=list[EmbeddingPublic])
async def list_all(current_user: UserPublic = Depends(get_current_user)):
    # Full listing requires a separate metadata store (MongoDB/Redis hash).
    # Returning an empty list until that layer is wired.
    return []
