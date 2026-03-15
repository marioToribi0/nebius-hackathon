import json
import re

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, status
from openai import AsyncOpenAI

from app.core.config import settings
from app.core.logging import logger
from app.databases.mongodb import get_database
from app.dependencies import get_current_user
from app.models.place import (
    ImageResult,
    ImageSearchRequest,
    PlaceCreate,
    PlacePublic,
    TripQuestion,
    TripQuestionsResponse,
)
from app.models.user import UserPublic
from app.services.image_service import search_images
from app.services.place_service import create_place, list_places

router = APIRouter(prefix="/api/places", tags=["places"])


def _get_llm_client() -> AsyncOpenAI:
    return AsyncOpenAI(
        base_url=settings.NEBIUS_BASE_URL,
        api_key=settings.NEBIUS_API_KEY,
    )


_FALLBACK_QUESTIONS: list[TripQuestion] = [
    TripQuestion(
        question="What draws you to this destination?",
        options=["Natural beauty & outdoors", "Culture & history", "Relaxation & leisure"],
    ),
    TripQuestion(
        question="What kind of activities do you prefer?",
        options=["Adventure & sports", "Sightseeing & walking tours", "Food, markets & local life"],
    ),
    TripQuestion(
        question="What's your ideal travel pace?",
        options=["Slow & relaxed", "Balanced mix", "Fast-paced & packed"],
    ),
    TripQuestion(
        question="Who are you exploring with?",
        options=["Solo", "Couple or friends", "Family with kids"],
    ),
    TripQuestion(
        question="What would make your visit unforgettable?",
        options=["A hidden gem most tourists miss", "The most iconic highlights", "An authentic local experience"],
    ),
]


@router.post(
    "/search-images",
    response_model=list[ImageResult],
)
async def search(
    payload: ImageSearchRequest,
    current_user: UserPublic = Depends(get_current_user),
):
    return await search_images(payload.queries)


@router.post("", response_model=PlacePublic, status_code=status.HTTP_201_CREATED)
async def create(
    payload: PlaceCreate,
    current_user: UserPublic = Depends(get_current_user),
):
    db = get_database()
    return await create_place(payload, current_user.id, db)


@router.get("", response_model=list[PlacePublic])
async def list_all(current_user: UserPublic = Depends(get_current_user)):
    db = get_database()
    return await list_places(current_user.id, db)


@router.delete("/{place_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_place(
    place_id: str,
    current_user: UserPublic = Depends(get_current_user),
):
    db = get_database()
    try:
        oid = ObjectId(place_id)
    except Exception:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid place ID")

    result = await db.places.delete_one({"_id": oid, "created_by": current_user.id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Place not found")


@router.post("/{place_id}/questions", response_model=TripQuestionsResponse)
async def get_trip_questions(
    place_id: str,
    current_user: UserPublic = Depends(get_current_user),
):
    """Generate 5 multiple-choice questions to personalise a tour of the place."""
    db = get_database()
    try:
        oid = ObjectId(place_id)
    except Exception:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid place ID")

    doc = await db.places.find_one({"_id": oid, "created_by": current_user.id})
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Place not found")

    place_name = doc["name"]
    logger.info("get_trip_questions | place={!r} user={}", place_name, current_user.id)

    client = _get_llm_client()
    response = await client.chat.completions.create(
        model=settings.NEBIUS_CHAT_MODEL,
        messages=[
            {
                "role": "system",
                "content": (
                    "You are a helpful travel assistant designing a personalised tour experience. "
                    "Generate exactly 5 questions that ask the visitor what THEY want to see, do, or experience during their visit. "
                    "Questions must be about personal preferences and interests, NOT trivia or factual knowledge about the place. "
                    "Good examples: 'What activities interest you most?', 'What's your travel pace?', 'What draws you to this destination?'. "
                    "Bad examples: 'What is the capital of X?', 'Which year was X built?'. "
                    "Each question must have exactly 3 short, distinct answer options relevant to that specific destination. "
                    'Return ONLY a valid JSON array of 5 objects: [{"question": "...", "options": ["...", "...", "..."]}]. '
                    "No explanation, no markdown."
                ),
            },
            {
                "role": "user",
                "content": f"Generate 5 visitor preference questions for a tour of {place_name}.",
            },
        ],
        temperature=0.5,
    )
    raw = response.choices[0].message.content or "[]"

    questions: list[TripQuestion] = []
    match = re.search(r"\[[\s\S]*\]", raw)
    if match:
        try:
            parsed = json.loads(match.group(0))
            for item in parsed[:5]:
                opts = [str(o) for o in (item.get("options") or [])[:3]]
                while len(opts) < 3:
                    opts.append("Other")
                questions.append(
                    TripQuestion(question=str(item.get("question", "")), options=opts)
                )
        except (json.JSONDecodeError, TypeError, KeyError):
            pass

    if len(questions) < 5:
        questions = (questions + _FALLBACK_QUESTIONS)[:5]

    return TripQuestionsResponse(questions=questions)
