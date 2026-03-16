"""Tool: web search via Tavily."""

from langchain_core.tools import tool
from loguru import logger
from tavily import TavilyClient

from config import settings

_client: TavilyClient | None = None


def _get_client() -> TavilyClient:
    global _client
    if _client is None:
        _client = TavilyClient(api_key=settings.TAVILY_API_KEY)
    return _client


@tool
def search_web(query: str) -> str:
    """Search the web for current information about places, topics, or events."""
    logger.debug("search_web: {!r}", query)
    try:
        client = _get_client()
        response = client.search(query=query, max_results=5)
        results = response.get("results", [])
        if not results:
            return "No web results found."
        parts = []
        for r in results:
            title = r.get("title", "")
            url = r.get("url", "")
            content = r.get("content", "")
            parts.append(f"**{title}** ({url})\n{content}")
        return "\n\n".join(parts)
    except Exception as exc:
        logger.error("search_web failed: {}", exc)
        return f"Web search failed: {exc}"
