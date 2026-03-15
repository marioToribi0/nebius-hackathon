from fastapi import APIRouter, Depends, status

from app.databases.mongodb import get_database
from app.dependencies import get_current_user
from app.models.route import RouteCreate, RoutePublic
from app.models.user import UserPublic
from app.services.route_service import create_route, list_routes

router = APIRouter(prefix="/api/routes", tags=["routes"])


@router.post("", response_model=RoutePublic, status_code=status.HTTP_201_CREATED)
async def create(
    payload: RouteCreate,
    current_user: UserPublic = Depends(get_current_user),
):
    db = get_database()
    return await create_route(payload, current_user.id, db)


@router.get("", response_model=list[RoutePublic])
async def list_all(current_user: UserPublic = Depends(get_current_user)):
    db = get_database()
    return await list_routes(current_user.id, db)
