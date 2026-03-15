"""
Standalone Tavily search service.

Wraps the synchronous TavilyClient with async-compatible helpers using
asyncio.to_thread. Import from this module anywhere in the application
that needs web search — it has no dependency on the research agent.
"""

import asyncio
from functools import lru_cache
from typing import TypedDict

from tavily import TavilyClient

from app.core.config import settings
from app.core.logging import logger


class SearchResult(TypedDict):
    title: str
    url: str
    content: str


@lru_cache(maxsize=1)
def _get_client() -> TavilyClient:
    return TavilyClient(api_key=settings.TAVILY_API_KEY)


def _sync_search(query: str, max_results: int) -> list[SearchResult]:
    client = _get_client()
    logger.debug("Tavily search | query={!r} max_results={}", query, max_results)
    response = client.search(
        query=query,
        max_results=max_results,
        include_answer=False,
    )
    results: list[SearchResult] = []
    for item in response.get("results", []):
        results.append(
            SearchResult(
                title=item.get("title", ""),
                url=item.get("url", ""),
                content=item.get("content", ""),
            )
        )
    logger.debug("Tavily search | got {} results for {!r}", len(results), query)
    return results


async def search(query: str, max_results: int = 5) -> list[SearchResult]:
    """Generic web search — the core primitive."""
    return await asyncio.to_thread(_sync_search, query, max_results)


async def search_place(place_name: str, max_results: int = 5) -> list[SearchResult]:
    """Search for tourism overview information about a place."""
    query = f"{place_name} tourism guide attractions history"
    return await search(query, max_results)


async def search_place_stop(
    place_name: str, stop: str, max_results: int = 5
) -> list[SearchResult]:
    """Search for detailed information about a specific stop within a place."""
    query = f"{place_name} {stop} history facts description"
    return await search(query, max_results)
