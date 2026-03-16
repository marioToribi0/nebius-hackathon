from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.logging import configure_logging, logger
from app.databases.mongodb import connect_mongo, disconnect_mongo
from app.databases.redis import connect_redis, disconnect_redis
from app.routers import auth, embeddings, guide, places, research, robot, routes

configure_logging(level="DEBUG" if settings.DEBUG else "INFO")


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting up {}", settings.APP_NAME)
    await connect_mongo()
    logger.info("MongoDB connected")
    await connect_redis()
    logger.info("Redis connected")
    yield
    logger.info("Shutting down {}", settings.APP_NAME)
    await disconnect_redis()
    await disconnect_mongo()


app = FastAPI(
    title=settings.APP_NAME,
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(routes.router)
app.include_router(embeddings.router)
app.include_router(research.router)
app.include_router(places.router)
app.include_router(guide.router)
app.include_router(robot.router)


@app.get("/api/health")
async def health():
    return {"status": "ok"}
