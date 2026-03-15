from datetime import datetime, timezone

from fastapi import APIRouter, Depends, status

from app.dependencies import get_current_user
from app.models.route import EmbeddingPublic, EmbeddingRequest
from app.models.user import UserPublic

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
    # Stub: real async pipeline will be wired in a later phase
    return EmbeddingPublic(
        id="stub-id",
        source_type=payload.source_type,
        status="pending",
        created_by=current_user.id,
        created_at=datetime.now(timezone.utc),
    )


@router.get("", response_model=list[EmbeddingPublic])
async def list_all(current_user: UserPublic = Depends(get_current_user)):
    # Stub: returns empty list until pipeline is implemented
    return []
