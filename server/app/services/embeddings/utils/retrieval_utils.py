from typing import Any

from langchain_core.documents import Document
from langchain_core.vectorstores import VectorStoreRetriever

from app.services.embeddings.utils.embedding_utils import (
    DEFAULT_INDEX_NAME,
    get_embeddings,
)
from langchain_community.vectorstores import Redis as RedisVectorStore


def similarity_search(
    query: str,
    k: int = 4,
    index_name: str = DEFAULT_INDEX_NAME,
) -> list[Document]:
    """Return the k most similar documents to the query string."""
    store = RedisVectorStore.from_existing_index(
        embedding=get_embeddings(),
        redis_url=_redis_url(),
        index_name=index_name,
    )
    return store.similarity_search(query, k=k)


def similarity_search_with_score(
    query: str,
    k: int = 4,
    index_name: str = DEFAULT_INDEX_NAME,
) -> list[tuple[Document, float]]:
    """Return the k most similar documents with their cosine-distance scores."""
    store = RedisVectorStore.from_existing_index(
        embedding=get_embeddings(),
        redis_url=_redis_url(),
        index_name=index_name,
    )
    return store.similarity_search_with_score(query, k=k)


def as_retriever(
    index_name: str = DEFAULT_INDEX_NAME,
    search_kwargs: dict[str, Any] | None = None,
) -> VectorStoreRetriever:
    """Return a LangChain VectorStoreRetriever for use in chains or agents."""
    store = RedisVectorStore.from_existing_index(
        embedding=get_embeddings(),
        redis_url=_redis_url(),
        index_name=index_name,
    )
    return store.as_retriever(search_kwargs=search_kwargs or {"k": 4})


def _redis_url() -> str:
    from app.core.config import settings

    return settings.REDIS_URL
