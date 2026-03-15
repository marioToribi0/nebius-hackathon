from datetime import datetime, timezone

from fastapi import HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.security import create_access_token, hash_password, verify_password
from app.models.user import LoginRequest, Token, UserCreate, UserInDB, UserPublic


async def register_user(
    payload: UserCreate, db: AsyncIOMotorDatabase
) -> UserPublic:
    existing = await db.users.find_one({"email": payload.email})
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email already registered",
        )

    user_doc = {
        "email": payload.email,
        "full_name": payload.full_name,
        "hashed_password": hash_password(payload.password),
        "is_active": True,
        "created_at": datetime.now(timezone.utc),
    }
    result = await db.users.insert_one(user_doc)
    user_doc["id"] = str(result.inserted_id)

    return UserPublic(
        id=user_doc["id"],
        email=user_doc["email"],
        full_name=user_doc["full_name"],
        is_active=user_doc["is_active"],
        created_at=user_doc["created_at"],
    )


async def authenticate_user(
    payload: LoginRequest, db: AsyncIOMotorDatabase
) -> UserInDB:
    user_doc = await db.users.find_one({"email": payload.email})
    if not user_doc or not verify_password(payload.password, user_doc["hashed_password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
        )

    return UserInDB(
        id=str(user_doc["_id"]),
        email=user_doc["email"],
        full_name=user_doc["full_name"],
        hashed_password=user_doc["hashed_password"],
        is_active=user_doc["is_active"],
        created_at=user_doc["created_at"],
    )


async def create_user_token(user: UserInDB) -> Token:
    token = create_access_token(subject=user.id)
    return Token(access_token=token)
