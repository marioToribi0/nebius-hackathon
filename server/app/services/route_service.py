from datetime import datetime, timezone

from motor.motor_asyncio import AsyncIOMotorDatabase

from app.models.route import RouteCreate, RoutePublic


async def create_route(
    payload: RouteCreate, user_id: str, db: AsyncIOMotorDatabase
) -> RoutePublic:
    route_doc = {
        "name": payload.name,
        "description": payload.description,
        "waypoints": [w.model_dump() for w in payload.waypoints],
        "created_by": user_id,
        "created_at": datetime.now(timezone.utc),
    }
    result = await db.routes.insert_one(route_doc)

    return RoutePublic(
        id=str(result.inserted_id),
        name=route_doc["name"],
        description=route_doc["description"],
        waypoints=payload.waypoints,
        created_by=user_id,
        created_at=route_doc["created_at"],
    )


async def list_routes(
    user_id: str, db: AsyncIOMotorDatabase
) -> list[RoutePublic]:
    cursor = db.routes.find({"created_by": user_id})
    routes = []
    async for doc in cursor:
        routes.append(
            RoutePublic(
                id=str(doc["_id"]),
                name=doc["name"],
                description=doc["description"],
                waypoints=doc["waypoints"],
                created_by=doc["created_by"],
                created_at=doc["created_at"],
            )
        )
    return routes
