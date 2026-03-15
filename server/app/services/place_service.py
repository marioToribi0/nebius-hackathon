from datetime import datetime, timezone

import httpx
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.logging import logger
from app.models.place import Coordinates, PlaceCreate, PlacePublic

NOMINATIM_URL = "https://nominatim.openstreetmap.org/search"


async def geocode(name: str) -> Coordinates | None:
    """Geocode a place name using Nominatim."""
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                NOMINATIM_URL,
                params={"q": name, "format": "json", "limit": 1},
                headers={"User-Agent": "Wayfinder/1.0"},
                timeout=10,
            )
            resp.raise_for_status()
            results = resp.json()
            if results:
                return Coordinates(
                    lat=float(results[0]["lat"]),
                    lng=float(results[0]["lon"]),
                )
    except Exception as e:
        logger.warning("Geocoding failed for '{}': {}", name, e)
    return None


async def create_place(
    payload: PlaceCreate, user_id: str, db: AsyncIOMotorDatabase
) -> PlacePublic:
    coords = payload.coordinates
    if coords is None:
        coords = await geocode(payload.name)

    place_doc = {
        "name": payload.name,
        "description": payload.description,
        "coordinates": coords.model_dump() if coords else None,
        "image_url": payload.image_url,
        "image_alt": payload.image_alt,
        "search_query": payload.search_query,
        "created_by": user_id,
        "created_at": datetime.now(timezone.utc),
    }
    result = await db.places.insert_one(place_doc)

    return PlacePublic(
        id=str(result.inserted_id),
        name=place_doc["name"],
        description=place_doc["description"],
        coordinates=coords,
        image_url=place_doc["image_url"],
        image_alt=place_doc["image_alt"],
        search_query=place_doc["search_query"],
        created_by=user_id,
        created_at=place_doc["created_at"],
    )


async def list_places(
    user_id: str, db: AsyncIOMotorDatabase
) -> list[PlacePublic]:
    cursor = db.places.find({"created_by": user_id})
    places = []
    async for doc in cursor:
        places.append(
            PlacePublic(
                id=str(doc["_id"]),
                name=doc["name"],
                description=doc["description"],
                coordinates=doc.get("coordinates"),
                image_url=doc.get("image_url", ""),
                image_alt=doc.get("image_alt", ""),
                search_query=doc.get("search_query", ""),
                created_by=doc["created_by"],
                created_at=doc["created_at"],
            )
        )
    return places
