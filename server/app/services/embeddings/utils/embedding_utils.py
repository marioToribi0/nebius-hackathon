from functools import lru_cache

from langchain_community.vectorstores import Redis as RedisVectorStore
from langchain_openai import OpenAIEmbeddings

from app.core.config import settings

EMBEDDING_MODEL = "text-embedding-3-large"
DEFAULT_INDEX_NAME = "wayfinder_embeddings"


@lru_cache(maxsize=1)
def get_embeddings() -> OpenAIEmbeddings:
    """Return a cached OpenAI embeddings instance using text-embedding-3-large."""
    return OpenAIEmbeddings(
        model=EMBEDDING_MODEL,
        api_key=settings.OPENAI_API_KEY,
    )


def get_vector_store(index_name: str = DEFAULT_INDEX_NAME) -> RedisVectorStore:
    """
    Return a RedisVectorStore connected to the running Redis Stack instance.

    On first call for a given index the index is created automatically.
    Subsequent calls open the existing index via from_existing_index().
    """
    embeddings = get_embeddings()
    try:
        return RedisVectorStore.from_existing_index(
            embedding=embeddings,
            redis_url=settings.REDIS_URL,
            index_name=index_name,
        )
    except Exception:
        # Index does not exist yet — create an empty one with a placeholder schema.
        # The real schema is created on first document ingestion.
        return RedisVectorStore(
            embedding=embeddings,
            redis_url=settings.REDIS_URL,
            index_name=index_name,
        )
