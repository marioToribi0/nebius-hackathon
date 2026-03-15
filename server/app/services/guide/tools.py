import asyncio

from langchain_core.tools import tool

from app.core.logging import logger
from app.services.search import tavily_service
from app.services.embeddings.utils.embedding_utils import get_vector_store


@tool
async def search_web(query: str) -> str:
    """Search the web for current information about a topic."""
    logger.debug("Guide tool search_web | query={!r}", query)
    results = await tavily_service.search(query, max_results=5)
    if not results:
        return "No web results found."
    parts = []
    for r in results:
        parts.append(f"**{r['title']}**\n{r['content']}\nSource: {r['url']}")
    return "\n\n---\n\n".join(parts)


def _sync_similarity_search(query: str, k: int, index_name: str):
    """Run similarity search using get_vector_store (handles schema fallback)."""
    store = get_vector_store(index_name=index_name)
    return store.similarity_search(query, k=k)


def make_retrieval_tool(place_key: str):
    """Factory that returns a retrieve_knowledge tool with place_key baked in."""

    @tool
    async def retrieve_knowledge(query: str) -> str:
        """Retrieve knowledge from the researched place database. Use this for place-specific questions."""
        index_name = f"place:{place_key}"
        logger.debug(
            "Guide tool retrieve_knowledge | query={!r} index={!r}",
            query,
            index_name,
        )
        try:
            docs = await asyncio.to_thread(
                _sync_similarity_search, query, 4, index_name
            )
        except Exception as e:
            logger.error("retrieve_knowledge error: {}", str(e))
            return f"Error searching knowledge base: {str(e)}"
        if not docs:
            return "No relevant knowledge found in the place database."
        parts = []
        for doc in docs:
            parts.append(doc.page_content)
        return "\n\n---\n\n".join(parts)

    return retrieve_knowledge
