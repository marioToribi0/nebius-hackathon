import asyncio
import uuid

from langchain_community.vectorstores import Redis as RedisVectorStore
from langchain_core.documents import Document

from app.core.config import settings
from app.services.embeddings.utils.embedding_utils import (
    DEFAULT_INDEX_NAME,
    get_embeddings,
)


def _sync_ingest(
    documents: list[Document],
    index_name: str,
) -> list[str]:
    """
    Synchronous core: embed documents and write them to Redis.

    - First call for a given index_name: the index does not exist yet.
      `from_existing_index` raises, so we fall back to `from_documents`
      which creates the RediSearch index schema and adds the documents in
      one shot. Synthetic UUIDs are returned because `from_documents` does
      not expose the internal Redis key IDs.

    - All subsequent calls: `from_existing_index` succeeds and we call
      `add_documents` which returns the real Redis key IDs.
    """
    embeddings = get_embeddings()
    try:
        store = RedisVectorStore.from_existing_index(
            embedding=embeddings,
            redis_url=settings.REDIS_URL,
            index_name=index_name,
        )
        return store.add_documents(documents)
    except Exception:
        # Index does not exist yet — create it together with the first batch.
        RedisVectorStore.from_documents(
            documents=documents,
            embedding=embeddings,
            redis_url=settings.REDIS_URL,
            index_name=index_name,
        )
        return [str(uuid.uuid4()) for _ in documents]


async def store_document_chunk(
    document: Document,
    index_name: str = DEFAULT_INDEX_NAME,
) -> list[str]:
    """
    Embed a single LangChain Document and persist it in Redis.

    Returns the Redis key IDs for the stored chunk (or synthetic UUIDs on
    the very first ingestion when the index is being created).
    """
    return await store_document_chunks([document], index_name=index_name)


async def store_document_chunks(
    documents: list[Document],
    index_name: str = DEFAULT_INDEX_NAME,
) -> list[str]:
    """
    Embed a batch of LangChain Documents and persist them in Redis.

    The RediSearch index schema is created automatically on first ingestion.
    Returns the Redis key IDs for all stored documents.
    """
    return await asyncio.to_thread(_sync_ingest, documents, index_name)
