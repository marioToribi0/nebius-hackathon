from functools import lru_cache

from langchain_community.vectorstores import Redis as RedisVectorStore
from langchain_nebius import NebiusEmbeddings

from app.core.config import settings

EMBEDDING_MODEL = "BAAI/bge-en-icl"
DEFAULT_INDEX_NAME = "wayfinder_embeddings"


@lru_cache(maxsize=1)
def get_embeddings() -> NebiusEmbeddings:
    """Return a cached Nebius embeddings instance using BAAI/bge-en-icl."""
    return NebiusEmbeddings(
        model=EMBEDDING_MODEL,
        api_key=settings.NEBIUS_API_KEY,
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
        return RedisVectorStore(
            embedding=embeddings,
            redis_url=settings.REDIS_URL,
            index_name=index_name,
        )
