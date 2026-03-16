"""HTTP helpers for communicating with the Wayfinder server."""

import httpx
from loguru import logger

from config import settings

_HEADERS = {"X-Robot-Api-Key": settings.ROBOT_API_KEY}
_TIMEOUT = 15.0


def validate_place_key(place_key: str) -> bool:
    """Return True if the server has completed research for place_key."""
    url = f"{settings.SERVER_BASE_URL}/api/robot/validate/{place_key}"
    try:
        with httpx.Client(timeout=_TIMEOUT) as client:
            resp = client.get(url, headers=_HEADERS)
            resp.raise_for_status()
            return resp.json().get("valid", False)
    except Exception as exc:
        logger.warning("validate_place_key({}) failed: {}", place_key, exc)
        return False


def get_context(place_key: str) -> dict | None:
    """Fetch full research context for place_key. Returns None on failure."""
    url = f"{settings.SERVER_BASE_URL}/api/robot/context/{place_key}"
    try:
        with httpx.Client(timeout=_TIMEOUT) as client:
            resp = client.get(url, headers=_HEADERS)
            resp.raise_for_status()
            return resp.json()
    except Exception as exc:
        logger.error("get_context({}) failed: {}", place_key, exc)
        return None


def rag_search(query: str, place_key: str, k: int = 4) -> str:
    """Run a RAG similarity search and return formatted markdown results."""
    url = f"{settings.SERVER_BASE_URL}/api/robot/rag"
    try:
        with httpx.Client(timeout=_TIMEOUT) as client:
            resp = client.post(
                url,
                headers=_HEADERS,
                json={"query": query, "place_key": place_key, "k": k},
            )
            resp.raise_for_status()
            results = resp.json().get("results", [])
            if not results:
                return "No relevant information found."
            parts = []
            for r in results:
                title = r.get("title", "")
                content = r.get("content", "")
                parts.append(f"### {title}\n{content}" if title else content)
            return "\n\n---\n\n".join(parts)
    except Exception as exc:
        logger.error("rag_search({!r}, {}) failed: {}", query, place_key, exc)
        return f"RAG search failed: {exc}"
