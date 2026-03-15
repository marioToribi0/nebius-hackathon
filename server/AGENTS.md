# Backend — Wayfinder G1

FastAPI backend for the autonomous AI historian robot. See [`/docs/PRD.md`](../docs/PRD.md) for full product context.

## Stack

- **FastAPI** (uvicorn via `standard` extras)
- **Python 3.10+** — managed with **uv**
- **Motor** — async MongoDB driver
- **aioredis** — async Redis client
- **Pydantic v2** + **pydantic-settings** — models and config
- **python-jose[cryptography]** — JWT (HS256)
- **passlib[bcrypt]** — password hashing
- **httpx** — async HTTP client

## Structure

```
app/
  main.py              # App entrypoint — lifespan, CORS, router registration
  dependencies.py      # get_current_user() auth guard (JWT → Redis → MongoDB)
  core/
    config.py          # Pydantic Settings (reads .env)
    security.py        # hash_password, verify_password, create_access_token, decode_token
  routers/
    auth.py            # POST /api/auth/signup, /login, /logout — GET /api/auth/me
    routes.py          # POST/GET /api/routes — create and list tour routes
    embeddings.py      # POST /api/embeddings/generate, GET /api/embeddings  [STUB]
  services/
    auth_service.py    # register_user, authenticate_user, create_user_token
    route_service.py   # create_route, list_routes
  models/
    user.py            # UserCreate, UserInDB, UserPublic, LoginRequest, Token
    route.py           # Waypoint, RouteCreate, RoutePublic, EmbeddingRequest, EmbeddingPublic
  databases/
    mongodb.py         # Motor client + get_database()
    redis.py           # aioredis client + get_redis()
```

## Auth Flow

`POST /api/auth/login` → returns Bearer JWT → stored in Redis as `session:{user_id}`.
Protected routes use `get_current_user`: decode JWT → verify Redis session → fetch user from MongoDB.

## Infrastructure

`docker-compose.yml` starts:
- **MongoDB 7** on port `27017`
- **Redis Stack 7.2** on port `6379` (RedisInsight on `8001`)

```bash
docker compose up -d
```

## Dev

```bash
uv sync
uv run uvicorn app.main:app --reload   # http://localhost:8000
# Docs at http://localhost:8000/api/docs
```

Copy `.env.example` to `.env` and fill in `SECRET_KEY`, `MONGODB_URL`, `REDIS_URL`.
