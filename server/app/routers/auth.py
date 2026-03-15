from fastapi import APIRouter, Depends, status

from app.databases.mongodb import get_database
from app.databases.redis import get_redis
from app.dependencies import get_current_user
from app.models.user import LoginRequest, Token, UserCreate, UserPublic
from app.services.auth_service import (
    authenticate_user,
    create_user_token,
    register_user,
)

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/signup", response_model=UserPublic, status_code=status.HTTP_201_CREATED)
async def signup(payload: UserCreate):
    db = get_database()
    return await register_user(payload, db)


@router.post("/login", response_model=Token)
async def login(payload: LoginRequest):
    db = get_database()
    user = await authenticate_user(payload, db)
    token_obj = await create_user_token(user)

    # Store session in Redis
    redis = get_redis()
    await redis.set(f"session:{user.id}", token_obj.access_token)

    return token_obj


@router.get("/me", response_model=UserPublic)
async def me(current_user: UserPublic = Depends(get_current_user)):
    return current_user


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(current_user: UserPublic = Depends(get_current_user)):
    redis = get_redis()
    await redis.delete(f"session:{current_user.id}")
