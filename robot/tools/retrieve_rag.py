"""Factory that creates a retrieve_rag tool pre-bound to a specific place_key."""

from langchain_core.tools import tool
from loguru import logger

import server_client


def make_retrieve_rag_tool(place_key: str):
    """Return a LangChain tool that queries the RAG index for *place_key*."""

    @tool
    def retrieve_rag(query: str) -> str:
        """Retrieve detailed knowledge about this place from the research database."""
        logger.debug("retrieve_rag: place={} query={!r}", place_key, query)
        return server_client.rag_search(query, place_key)

    return retrieve_rag
