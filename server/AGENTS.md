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
- **LangGraph** — research agent graph execution
- **LangChain + langchain-community + langchain-nebius** — embeddings (BAAI/bge-en-icl via Nebius)
- **OpenAI SDK** — chat completions against Nebius-hosted models (OpenAI-compatible API)
- **Tavily** — web search for the research agent
- **Loguru** — structured application logging

## Structure

```
app/
  main.py              # App entrypoint — lifespan, CORS, router registration, logging setup
  dependencies.py      # get_current_user() auth guard (JWT → Redis → MongoDB)
  core/
    config.py          # Pydantic Settings (reads .env)
    security.py        # hash_password, verify_password, create_access_token, decode_token
    logging.py         # Global loguru logger + uvicorn log intercept — import `logger` from here
  routers/
    auth.py            # POST /api/auth/signup, /login, /logout — GET /api/auth/me
    routes.py          # POST/GET /api/routes — create and list tour routes
    embeddings.py      # POST /api/embeddings/generate, GET /api/embeddings
    research.py        # Research agent endpoints (see Research API section)
  services/
    auth_service.py    # register_user, authenticate_user, create_user_token
    route_service.py   # create_route, list_routes
    embeddings/
      embedding_service.py          # store_document_chunk / store_document_chunks (async Redis ingest)
      utils/embedding_utils.py      # get_embeddings() (cached NebiusEmbeddings), get_vector_store()
      utils/retrieval_utils.py      # similarity_search, similarity_search_with_score, as_retriever
    search/
      tavily_service.py             # search(), search_place(), search_place_stop() — reusable Tavily wrapper
    research/
      state.py          # ResearchState TypedDict — LangGraph graph state
      nodes.py          # search_and_plan, research_stops, save_to_mongo nodes
      agent.py          # Compiled StateGraph — run_research_agent(place_name, place_key)
  models/
    user.py            # UserCreate, UserInDB, UserPublic, LoginRequest, Token
    route.py           # Waypoint, RouteCreate, RoutePublic, EmbeddingRequest, EmbeddingPublic
    research.py        # PlaceDocument, PlaceResearch, ResearchRequest, PlaceResearchPublic, DocumentUpdate
  databases/
    mongodb.py         # Motor client + get_database()
    redis.py           # aioredis client + get_redis()
```

## Auth Flow

`POST /api/auth/login` → returns Bearer JWT → stored in Redis as `session:{user_id}`.
Protected routes use `get_current_user`: decode JWT → verify Redis session → fetch user from MongoDB.

## Research Agent

The research agent is a **LangGraph** pipeline that receives a tourism place name, researches it with Tavily, and generates a 30-minute route plan stored in MongoDB.

### Graph: `search_and_plan → research_stops → save_to_mongo`

| Node | What it does |
|------|-------------|
| `search_and_plan` | Tavily overview search → Nebius LLM generates a narrative `route_plan` paragraph + JSON list of stops with `estimated_minutes` summing to 30 |
| `research_stops` | For each stop: Tavily search + LLM generates detailed markdown with `## Sources`. Also builds a hidden `is_search_context` doc aggregating all raw search results for RAG |
| `save_to_mongo` | Upserts the `place_research` MongoDB document; `redis_keys` start empty and are populated by `/embeddings/sync` |

### MongoDB collection: `place_research`

Each document has:
- `place_key` — URL-safe slug (e.g. `catedral-de-sal`)
- `place_name` — human-readable name
- `route_plan` — narrative overview paragraph
- `documents[]` — merged checklist + content array, each entry has:
  - `doc_key`, `title`, `order`, `estimated_minutes` — checklist fields
  - `content` — full markdown
  - `sources[]` — source URLs
  - `redis_keys[]` — Redis vector store key IDs for this doc's chunks
  - `is_search_context` — `true` for the hidden RAG aggregation doc (not shown in checklist)
- `status` — `pending | processing | completed | failed`

### Research API endpoints (`/api/research`)

All endpoints require Bearer JWT auth.

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/research` | Trigger agent (background task); body `{ place_name, place_key }` |
| `GET` | `/api/research/{place_key}` | Poll for results / get full doc |
| `PUT` | `/api/research/{place_key}/documents/{doc_key}` | Edit a document's `content`, `title`, `order`, or `estimated_minutes` |
| `DELETE` | `/api/research/{place_key}/documents/{doc_key}` | Delete a document + its Redis vector keys |
| `POST` | `/api/research/{place_key}/embeddings/sync` | Drop per-place Redis index, re-embed all docs, update `redis_keys` |
| `DELETE` | `/api/research/{place_key}` | Delete full place research + Redis index |

### Embedding strategy

- Each place uses a **dedicated Redis index** named `place:{place_key}` (not the shared default index).
- This allows `drop_index` to cleanly wipe all embeddings for one place without affecting others.
- The hidden `search-context` document is also embedded, giving the retrieval system raw web-source content to answer detailed user questions.

## Logging

Import the global logger anywhere:

```python
from app.core.logging import logger

logger.info("something happened")
logger.debug("detail: {}", value)
```

Log levels: `DEBUG` when `settings.DEBUG=True`, `INFO` in production. All uvicorn/FastAPI stdlib logs are intercepted and routed through loguru.

## Environment Variables

| Variable | Description |
|----------|-------------|
| `SECRET_KEY` | JWT signing secret |
| `MONGODB_URL` | MongoDB connection string (default `mongodb://localhost:27017`) |
| `MONGODB_DB` | Database name (default `wayfinder`) |
| `REDIS_URL` | Redis connection string (default `redis://localhost:6379`) |
| `NEBIUS_API_KEY` | Nebius AI Studio API key (used for both embeddings and chat) |
| `NEBIUS_BASE_URL` | Nebius OpenAI-compatible base URL |
| `NEBIUS_CHAT_MODEL` | Chat model name (default `nvidia/nemotron-3-super-120b-a12b`) |
| `TAVILY_API_KEY` | Tavily web search API key |
| `DEBUG` | Set `true` to enable DEBUG log level |

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

Copy `.env.example` to `.env` and fill in the variables listed above.
